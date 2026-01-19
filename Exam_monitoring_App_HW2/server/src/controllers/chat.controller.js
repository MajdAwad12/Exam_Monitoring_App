// server/src/controllers/chat.controller.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import Exam from "../models/Exam.js";
import TransferRequest from "../models/TransferRequest.js";

/**
 * ✅ Safety-first chatbot:
 * - ANY numeric / DB question -> DB ONLY (no Gemini guessing).
 * - Gemini is used ONLY for: "how to", explanations, general knowledge.
 * - Fixes:
 *   1) next exam reliably (status optional, uses examDate/startAt)
 *   2) timezone (APP_TZ with fallback Asia/Jerusalem)
 *   3) room normalization everywhere (including transfers)
 *   4) toilet stats from report.studentStats, optionally per student
 */

/* =========================
   Stable UI procedure hints (no DB)
========================= */
const FAQ = [
  {
    match: (t) => t.includes("start") && t.includes("exam"),
    answer:
      "To start an exam:\n- Open Exam List\n- Select the exam\n- Click Start Exam (or Open Dashboard if already running)\n- Choose a room tab to monitor attendance and seats.",
  },
  {
    match: (t) => t.includes("not arrived") || t.includes("gray") || t.includes("grey"),
    answer:
      "Not arrived (gray) means the student has not checked in yet.\nAfter QR scan or marking Present, the student appears on the room map.",
  },
  {
    match: (t) => t.includes("toilet") || t.includes("bathroom") || t.includes("restroom"),
    answer:
      "Toilet tracking:\n- Click the student seat\n- Start Toilet\n- On return: click Return\nThe system tracks count + total time.",
  },
  {
    match: (t) => t.includes("transfer") || t.includes("move room") || (t.includes("move") && t.includes("room")),
    answer:
      "Transfer flow:\n- Click the student seat\n- Request Transfer\n- Choose target room\n- Target supervisor approves/rejects in the Transfers Panel.",
  },
  {
    match: (t) => t.includes("purple"),
    answer: "Purple indicates a pending transfer request waiting for approval/rejection.",
  },
  {
    match: (t) => t.includes("report") || t.includes("history") || t.includes("export") || t.includes("csv") || t.includes("pdf"),
    answer:
      "Reports/History (Lecturer/Admin):\n- Open Reports/History from the exam view\n- Review statistics/incidents\n- Export CSV or print to PDF (if available in your UI).",
  },
  {
    match: (t) => t === "help" || t.includes("what can you do") || t.includes("commands"),
    answer:
      "I can help with:\n- Running exam info (course, rooms, supervisors, lecturers)\n- Live counts (present/not arrived/temp out/finished)\n- Toilet stats\n- Current time (your timezone)\n- Next scheduled exam\n- Time remaining\n- Transfers stats\n- Recent events/messages\n\nTip: ask \"room A-101\" (or A101) to focus on one room, or \"all rooms\" for totals.",
  },
];

function faqAnswer(userText) {
  const t = String(userText || "").toLowerCase().trim();
  if (!t) return null;
  for (const f of FAQ) if (f.match(t)) return f.answer;
  return null;
}

/* =========================
   In-memory controls
========================= */
const mem = {
  dayKey: null,
  geminiUsed: 0,
  cache: new Map(), // key -> { text, expMs }
  lastMsgAt: new Map(), // per-user anti-spam
};

function nowMs() {
  return Date.now();
}

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function resetDailyIfNeeded() {
  const k = todayKey();
  if (mem.dayKey !== k) {
    mem.dayKey = k;
    mem.geminiUsed = 0;
    mem.cache = new Map();
  }
}

function cacheGet(key) {
  const item = mem.cache.get(key);
  if (!item) return null;
  if (item.expMs <= nowMs()) {
    mem.cache.delete(key);
    return null;
  }
  return item.text;
}

function cacheSet(key, text, ttlMs) {
  mem.cache.set(key, { text, expMs: nowMs() + ttlMs });
}

/* =========================
   Helpers
========================= */
function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function safeStr(x) {
  const s = String(x ?? "");
  return s.length > 3000 ? s.slice(0, 3000) + "…" : s;
}

function msToHuman(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm} min`;
  return `${h}h ${mm}m`;
}

function getTZ() {
  return process.env.APP_TZ || "Asia/Jerusalem";
}

function formatDT(d, tz = null) {
  if (!d) return "";
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    const opts = tz ? { timeZone: tz } : undefined;
    return x.toLocaleString("en-GB", opts);
  } catch {
    return "";
  }
}

function examTitle(exam) {
  return exam?.courseName || `Exam ${String(exam?._id || "").slice(-6)}`;
}

function clampLines(text, maxLines = 18) {
  const lines = String(text || "").split("\n");
  if (lines.length <= maxLines) return text;
  return lines.slice(0, maxLines).join("\n") + "\n…";
}

/* =========================
   ✅ Room normalization
========================= */
function normalizeRoomId(x) {
  return String(x || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function prettyRoomId(x) {
  const n = normalizeRoomId(x);
  const m = n.match(/^([A-Z])(\d{2,4})$/);
  if (!m) return n;
  return `${m[1]}-${m[2]}`;
}

/* =========================
   Room extraction / scope
========================= */
function extractExplicitRoomFromText(text) {
  const s = String(text || "");

  const m1 = s.match(/\b(room|class|classroom)\s*[:\-]?\s*([A-Z]\s*[-_]?\s*\d{2,4})\b/i);
  if (m1?.[2]) return normalizeRoomId(m1[2]);

  const m2 = s.match(/\b(in|for)\s+([A-Z]\s*[-_]?\s*\d{2,4})\b/i);
  if (m2?.[2]) return normalizeRoomId(m2[2]);

  const m3 = s.match(/\b([A-Z]\s*[-_]?\s*\d{2,4})\b/i);
  if (m3?.[1]) return normalizeRoomId(m3[1]);

  return null;
}

function wantsAllRooms(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("all rooms") ||
    t.includes("all classes") ||
    t.includes("all classrooms") ||
    t.includes("overall") ||
    t.includes("in total") ||
    t.includes("every room") ||
    t.includes("all of them")
  );
}

function resolveRoomScope(text, actor) {
  const explicit = extractExplicitRoomFromText(text);
  const all = wantsAllRooms(text);

  if (actor?.role === "admin" || actor?.role === "lecturer") {
    if (explicit) return { scope: "room", roomId: explicit, explicit: true };
    if (all) return { scope: "all", roomId: null, explicit: true };
    return { scope: "all", roomId: null, explicit: false };
  }

  if (actor?.role === "supervisor") {
    if (explicit) return { scope: "room", roomId: explicit, explicit: true };
    if (all) return { scope: "all", roomId: null, explicit: true };

    const assigned = actor?.assignedRoomId ? normalizeRoomId(actor.assignedRoomId) : null;
    return { scope: assigned ? "room" : "all", roomId: assigned, explicit: false };
  }

  if (explicit) return { scope: "room", roomId: explicit, explicit: true };
  if (all) return { scope: "all", roomId: null, explicit: true };
  return { scope: "all", roomId: null, explicit: false };
}

/* =========================
   Intent detection
========================= */
function isTimeNowQuestion(t) {
  return (
    t.includes("time now") ||
    (t.includes("what") && t.includes("time") && !t.includes("remaining") && !t.includes("left")) ||
    t === "time"
  );
}

function isNextExamQuestion(t) {
  return t.includes("next exam") || t.includes("upcoming exam") || (t.includes("exam") && t.includes("next"));
}

function isToiletQuestion(t) {
  return t.includes("toilet") || t.includes("bathroom") || t.includes("restroom");
}

function looksLikeCountQuestion(t) {
  return t.includes("how many") || t.includes("count") || t.includes("number") || t.includes("how much");
}

/**
 * ✅ DB-required questions:
 * - anything with numbers about rooms/students/attendance/toilet/transfers/events/messages
 * - or explicit exam/system stats
 */
function isDbRequiredQuestion(tRaw) {
  const t = norm(tRaw);

  // Time now is DB-free
  if (isTimeNowQuestion(t)) return false;

  // Next exam is DB
  if (isNextExamQuestion(t)) return true;

  const triggers = [
    "how many",
    "count",
    "number",
    "present",
    "absent",
    "not arrived",
    "temp out",
    "finished",
    "attendance",
    "students",
    "student",
    "room",
    "classroom",
    "toilet",
    "bathroom",
    "restroom",
    "transfer",
    "events",
    "incidents",
    "messages",
    "report",
    "stats",
    "summary",
    "time remaining",
    "time left",
  ];

  return triggers.some((k) => t.includes(k));
}

/* =========================
   Running exam (role-scoped)
========================= */
async function findRunningExamForActor(actor) {
  const baseOr = [
    { status: "running" },
    { isRunning: true },
    { $and: [{ startAt: { $ne: null } }, { endAt: null }, { status: { $ne: "ended" } }] },
  ];
  const sort = { startAt: -1, examDate: -1, createdAt: -1 };

  if (actor?.role === "admin") {
    return (await Exam.find({ $or: baseOr }).sort(sort).limit(1))[0] || null;
  }

  if (actor?.role === "lecturer") {
    return (
      (await Exam.find({
        $and: [
          { $or: baseOr },
          { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] },
        ],
      })
        .sort(sort)
        .limit(1))[0] || null
    );
  }

  if (actor?.role === "supervisor") {
    return (
      (await Exam.find({
        $and: [{ $or: baseOr }, { supervisors: { $elemMatch: { id: actor._id } } }],
      })
        .sort(sort)
        .limit(1))[0] || null
    );
  }

  if (actor?.role === "student") {
    return (
      (await Exam.find({
        $and: [{ $or: baseOr }, { attendance: { $elemMatch: { studentId: actor._id } } }],
      })
        .sort(sort)
        .limit(1))[0] || null
    );
  }

  return (await Exam.find({ $or: baseOr }).sort(sort).limit(1))[0] || null;
}

/* =========================
   ✅ Next exam (robust)
   - Works even if status is missing or not exactly "scheduled"
   - Uses examDate OR startAt
========================= */
async function findNextExamForActor(actor) {
  const now = new Date();
  const sort = { examDate: 1, startAt: 1, createdAt: 1 };

  // "future" definition:
  // - examDate >= now OR startAt >= now
  // - and NOT ended
  const futureBase = {
    $and: [
      {
        $or: [{ examDate: { $gte: now } }, { startAt: { $gte: now } }],
      },
      { status: { $ne: "ended" } },
    ],
  };

  const roleFilter =
    actor?.role === "lecturer"
      ? { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] }
      : actor?.role === "supervisor"
      ? { supervisors: { $elemMatch: { id: actor._id } } }
      : null;

  const query = roleFilter ? { $and: [futureBase, roleFilter] } : futureBase;

  // Prefer scheduled first, but if schema doesn't have it, still returns earliest future.
  const scheduledFirst = await Exam.find({
    $and: [query, { $or: [{ status: "scheduled" }, { status: { $exists: false } }, { status: "" }] }],
  })
    .sort(sort)
    .limit(3);

  if (scheduledFirst?.length) return scheduledFirst[0];

  const anyFuture = await Exam.find(query).sort(sort).limit(1);
  return anyFuture?.[0] || null;
}

/* =========================
   DB utilities
========================= */
function countAttendance(exam, roomId = null) {
  const arr = Array.isArray(exam?.attendance) ? exam.attendance : [];
  const target = roomId ? normalizeRoomId(roomId) : null;

  const filtered = target
    ? arr.filter((a) => normalizeRoomId(a?.roomId || a?.classroom || "") === target)
    : arr;

  const counts = {
    total: filtered.length,
    not_arrived: 0,
    present: 0,
    temp_out: 0,
    absent: 0,
    moving: 0,
    finished: 0,
  };

  for (const a of filtered) {
    const st = String(a?.status || "not_arrived");
    if (counts[st] !== undefined) counts[st] += 1;
    else counts.not_arrived += 1;
  }

  return counts;
}

/* ===== Transfers stats (normalized) ===== */
async function getTransferStats(examId, roomId = null) {
  const base = { examId };

  const pending = await TransferRequest.countDocuments({ ...base, status: "pending" });
  const approved = await TransferRequest.countDocuments({ ...base, status: "approved" });
  const rejected = await TransferRequest.countDocuments({ ...base, status: "rejected" });
  const cancelled = await TransferRequest.countDocuments({ ...base, status: "cancelled" });

  let roomPending = null;
  if (roomId) {
    const target = normalizeRoomId(roomId);
    // normalize DB fields on the fly using regex variants: A101, A-101, A_101
    // We can't easily normalize inside Mongo without aggregation, so we use regex:
    const pretty = prettyRoomId(target); // A-101
    const raw = target; // A101
    const re = new RegExp(`^${raw}$|^${pretty}$|^${raw[0]}[-_]?${raw.slice(1)}$`, "i");

    roomPending = await TransferRequest.countDocuments({
      ...base,
      status: "pending",
      $or: [{ fromClassroom: re }, { toClassroom: re }],
    });
  }

  return { pending, approved, rejected, cancelled, roomPending };
}

/* =========================
   ✅ Toilet stats from report.studentStats (Map)
   + support per student by name / studentNumber
========================= */
function getToiletStatsFromReport(exam, roomId = null) {
  const statsMap = exam?.report?.studentStats;
  if (!statsMap) return { supported: false, totalToiletCount: 0, activeNow: 0, totalToiletMs: 0 };

  const entries = statsMap instanceof Map ? Array.from(statsMap.entries()) : Object.entries(statsMap);

  const att = Array.isArray(exam?.attendance) ? exam.attendance : [];
  const byStudentRoom = new Map();
  for (const a of att) {
    if (!a?.studentId) continue;
    byStudentRoom.set(String(a.studentId), normalizeRoomId(a?.roomId || a?.classroom || ""));
  }

  const target = roomId ? normalizeRoomId(roomId) : null;

  let totalToiletCount = 0;
  let totalToiletMs = 0;
  let activeNow = 0;

  for (const [sid, st] of entries) {
    const studentRoom = byStudentRoom.get(String(sid)) || "";
    if (target && studentRoom !== target) continue;

    const toiletCount = Number(st?.toiletCount || 0);
    const tms = Number(st?.totalToiletMs || 0);

    totalToiletCount += toiletCount;
    totalToiletMs += tms;

    const leftAt = st?.activeToilet?.leftAt ? new Date(st.activeToilet.leftAt) : null;
    if (leftAt && !Number.isNaN(leftAt.getTime())) activeNow += 1;
  }

  return { supported: true, totalToiletCount, activeNow, totalToiletMs };
}

/* ===== per-student toilet count (strict DB) ===== */
function findStudentInAttendance(exam, qRaw) {
  const q = String(qRaw || "").trim().toLowerCase();
  if (!q) return null;

  const att = Array.isArray(exam?.attendance) ? exam.attendance : [];
  // try student number
  const numMatch = q.match(/\b\d{5,12}\b/);
  if (numMatch) {
    const num = numMatch[0];
    return att.find((a) => String(a?.studentNumber || "").trim() === num) || null;
  }

  // try name contains
  return (
    att.find((a) => String(a?.name || "").toLowerCase().includes(q)) ||
    null
  );
}

function getStudentToiletFromReport(exam, studentAttendanceRow) {
  const statsMap = exam?.report?.studentStats;
  if (!statsMap || !studentAttendanceRow?.studentId) return { supported: false };

  const sid = String(studentAttendanceRow.studentId);
  const st =
    statsMap instanceof Map ? statsMap.get(sid) : statsMap[sid];

  if (!st) return { supported: false };

  const toiletCount = Number(st?.toiletCount || 0);
  const totalToiletMs = Number(st?.totalToiletMs || 0);
  const activeNow = st?.activeToilet?.leftAt ? 1 : 0;

  return { supported: true, toiletCount, totalToiletMs, activeNow };
}

/* =========================
   ✅ DB direct answers (ONLY truth)
========================= */
async function dbDirectAnswer(userText, actor) {
  const t = norm(userText);
  if (!t) return null;

  // Time now (no Gemini, always correct TZ)
  if (isTimeNowQuestion(t)) {
    const tz = getTZ();
    const nowStr = new Date().toLocaleString("en-GB", { timeZone: tz });
    return `Current time (${tz}): ${nowStr}`;
  }

  // Next exam
  if (isNextExamQuestion(t)) {
    const nx = await findNextExamForActor(actor);
    if (!nx) return "I couldn't find an upcoming exam in the database.";
    const tz = getTZ();
    const when = nx.startAt || nx.examDate;
    return (
      `Next exam: ${examTitle(nx)}\n` +
      `- Date: ${formatDT(when, tz)}\n` +
      `- Status: ${nx.status || "scheduled"}`
    );
  }

  // For any other DB answers, we need a running exam
  const exam = await findRunningExamForActor(actor);
  if (!exam) return "I couldn't find a running exam right now in the database.";

  const title = examTitle(exam);
  const scope = resolveRoomScope(userText, actor);
  const roomId = scope.scope === "room" ? scope.roomId : null;
  const where = roomId ? `Room ${prettyRoomId(roomId)}` : "All rooms";

  // Time remaining
  if (t.includes("time remaining") || (t.includes("time") && (t.includes("remaining") || t.includes("left"))) || (t.includes("when") && t.includes("end"))) {
    const end = exam?.endAt ? new Date(exam.endAt) : null;
    if (!end || Number.isNaN(end.getTime())) {
      return `I can't calculate time remaining because endAt is missing.\n(Exam: ${title})`;
    }
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return `Exam time window ended.\n(Exam: ${title})`;
    return `Time remaining: ${msToHuman(diff)}\n(Exam: ${title})`;
  }

  // Toilet stats (overall or room)
  if (isToiletQuestion(t) && (looksLikeCountQuestion(t) || t.includes("stats") || t.includes("summary"))) {
    // if question mentions a specific student -> per student
    if (t.includes("student") || t.includes("name") || t.match(/\b\d{5,12}\b/)) {
      const stRow = findStudentInAttendance(exam, userText);
      if (!stRow) return `I couldn't find that student in attendance.\n(Exam: ${title})`;

      const stToilet = getStudentToiletFromReport(exam, stRow);
      if (!stToilet.supported) return `Toilet stats for this student are not available.\n(Exam: ${title})`;

      const mins = Math.round(stToilet.totalToiletMs / 60000);
      return (
        `Toilet stats for ${stRow.name || "student"} (${stRow.studentNumber || ""}):\n` +
        `- Exits: ${stToilet.toiletCount}\n` +
        `- Active now: ${stToilet.activeNow}\n` +
        `- Total time: ${mins} min\n` +
        `(Exam: ${title})`
      );
    }

    const toilet = getToiletStatsFromReport(exam, roomId);
    if (!toilet.supported) return `Toilet stats are not available right now.\n(Exam: ${title})`;

    const mins = Math.round(toilet.totalToiletMs / 60000);
    return (
      `Toilet stats (${where}):\n` +
      `- Total exits: ${toilet.totalToiletCount}\n` +
      `- Active now: ${toilet.activeNow}\n` +
      `- Total time: ${mins} min\n` +
      `(Exam: ${title})`
    );
  }

  // Rooms list
  if (t.includes("rooms") || t.includes("classrooms") || (t.includes("which") && (t.includes("room") || t.includes("classroom")))) {
    const rooms = (exam.classrooms || []).map((r) => r?.name || r?.id).filter(Boolean);
    if (!rooms.length) return `Rooms are not set for this exam.\n(Exam: ${title})`;
    return `Exam rooms:\n- ${rooms.join("\n- ")}\n(Exam: ${title})`;
  }

  // Supervisors list
  if (t.includes("supervisors") || (t.includes("who") && t.includes("supervisor"))) {
    const sup = Array.isArray(exam.supervisors) ? exam.supervisors : [];
    if (!sup.length) return `No supervisors assigned.\n(Exam: ${title})`;
    const lines = sup.map((s) => `- ${s?.name || "Supervisor"} (room: ${prettyRoomId(s?.roomId || "--")})`);
    return `Supervisors:\n${lines.join("\n")}\n(Exam: ${title})`;
  }

  // Lecturers
  if (t.includes("lecturer") || t.includes("co-lecturer")) {
    const main = exam.lecturer ? `- Main lecturer: ${exam.lecturer.name} (rooms: ${exam.lecturer.roomIds?.map(prettyRoomId).join(", ") || "--"})` : null;
    const co = (exam.coLecturers || []).map((l) => `- Co-lecturer: ${l?.name || "Lecturer"} (rooms: ${l?.roomIds?.map(prettyRoomId).join(", ") || "--"})`);
    const lines = [main, ...co].filter(Boolean);
    if (!lines.length) return `No lecturer assignment found.\n(Exam: ${title})`;
    return `Lecturers:\n${lines.join("\n")}\n(Exam: ${title})`;
  }

  // Attendance counts / summary
  if (
    t.includes("attendance") ||
    t.includes("summary") ||
    t.includes("stats") ||
    looksLikeCountQuestion(t) ||
    t.includes("students") ||
    t.includes("present") ||
    t.includes("absent") ||
    t.includes("not arrived") ||
    t.includes("temp") ||
    t.includes("finished")
  ) {
    const c = roomId ? countAttendance(exam, roomId) : countAttendance(exam, null);

    const wantsPresent = t.includes("present");
    const wantsNotArrived = t.includes("not arrived") || (t.includes("not") && t.includes("arrived"));
    const wantsAbsent = t.includes("absent");
    const wantsTempOut = t.includes("temp_out") || (t.includes("temp") && t.includes("out"));
    const wantsMoving = t.includes("moving");
    const wantsFinished = t.includes("finished");

    if (wantsPresent) return `Present (${where}): ${c.present} / ${c.total}\n(Exam: ${title})`;
    if (wantsNotArrived) return `Not arrived (${where}): ${c.not_arrived} / ${c.total}\n(Exam: ${title})`;
    if (wantsAbsent) return `Absent (${where}): ${c.absent} / ${c.total}\n(Exam: ${title})`;
    if (wantsTempOut) return `Temp out (${where}): ${c.temp_out} / ${c.total}\n(Exam: ${title})`;
    if (wantsMoving) return `Moving (${where}): ${c.moving} / ${c.total}\n(Exam: ${title})`;
    if (wantsFinished) return `Finished (${where}): ${c.finished} / ${c.total}\n(Exam: ${title})`;

    return (
      `Attendance summary (${where}):\n` +
      `- Total: ${c.total}\n` +
      `- Present: ${c.present}\n` +
      `- Not arrived: ${c.not_arrived}\n` +
      `- Temp out: ${c.temp_out}\n` +
      `- Absent: ${c.absent}\n` +
      `- Moving: ${c.moving}\n` +
      `- Finished: ${c.finished}\n` +
      `(Exam: ${title})`
    );
  }

  // Transfers stats
  if (t.includes("transfer")) {
    const stats = await getTransferStats(exam._id, roomId);
    const lines = [
      `Transfers (All rooms):`,
      `- Pending: ${stats.pending}`,
      `- Approved: ${stats.approved}`,
      `- Rejected: ${stats.rejected}`,
      `- Cancelled: ${stats.cancelled}`,
    ];
    if (roomId && stats.roomPending !== null) lines.push(`Room ${prettyRoomId(roomId)} pending related: ${stats.roomPending}`);
    lines.push(`(Exam: ${title})`);
    return lines.join("\n");
  }

  // Events count (DB)
  if (t.includes("events") || t.includes("incidents")) {
    const events = Array.isArray(exam.events) ? exam.events : [];
    const incidentsCount = events.filter((e) => norm(e?.type).includes("incident")).length;

    if (looksLikeCountQuestion(t)) {
      if (t.includes("incident")) return `Incidents: ${incidentsCount}\n(Exam: ${title})`;
      return `Events: ${events.length}\n(Exam: ${title})`;
    }

    const tz = getTZ();
    const last = events
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map((e) => {
        const ts = formatDT(e.timestamp, tz) || "";
        const where2 = e.classroom ? ` (${prettyRoomId(e.classroom)}${e.seat ? ` / ${e.seat}` : ""})` : "";
        return `- [${e.severity || "low"}] ${ts}: ${e.description || e.type || "event"}${where2}`;
      });

    if (!last.length) return `No events recorded yet.\n(Exam: ${title})`;
    return `Last events:\n${last.join("\n")}\n(Exam: ${title})`;
  }

  // Messages (DB)
  if (t.includes("messages") || (t.includes("chat") && t.includes("exam"))) {
    const msgs = Array.isArray(exam.messages) ? exam.messages : [];
    if (looksLikeCountQuestion(t)) return `Messages saved in this exam: ${msgs.length}\n(Exam: ${title})`;

    const tz = getTZ();
    const last = msgs
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 5)
      .map((m) => {
        const ts = formatDT(m.at, tz) || "";
        const from = m?.from?.name ? `${m.from.name} (${m.from.role || ""})` : "User";
        const room = m.roomId ? ` [${prettyRoomId(m.roomId)}]` : "";
        return `- ${ts}${room} ${from}: ${safeStr(m.text || "")}`;
      });

    if (!last.length) return `No messages recorded yet.\n(Exam: ${title})`;
    return `Last messages:\n${last.join("\n")}\n(Exam: ${title})`;
  }

  // default DB answer: running exam
  if (t.includes("running") || t.includes("current exam") || t.includes("what exam")) {
    const tz = getTZ();
    return `Running exam: ${title}\n- Date: ${formatDT(exam.examDate, tz)}\n- Status: ${exam.status}`;
  }

  return null;
}

/* =========================
   Gemini (ONLY for non-DB questions)
========================= */
function pickTextFromGeminiResponse(data) {
  return (
    data?.response?.text?.() ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("\n") ||
    ""
  );
}

function roleLabel(role) {
  if (!role) return "user";
  return String(role);
}

async function geminiAnswer({ actor, message }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: "AI is not configured on the server (missing GEMINI_API_KEY)." };

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = genAI.getGenerativeModel({ model: modelName });

  const role = roleLabel(actor?.role);
  const name = actor?.fullName || actor?.username || "User";

  const prompt = `
You are "Exam Monitoring Assistant".
IMPORTANT:
- If the user asks for numbers/stats/anything that should come from the database, reply exactly:
  "This question requires database facts. Please ask it as a dashboard/DB query."
- Otherwise, provide short practical help.

User:
- name: ${safeStr(name)}
- role: ${safeStr(role)}

User message:
"${safeStr(message)}"
`;

  const result = await model.generateContent(prompt);
  const text = pickTextFromGeminiResponse(result) || "";
  const cleaned = String(text || "").trim();
  if (!cleaned) return { text: "I couldn't generate an answer. Please try again." };
  return { text: clampLines(cleaned, Number(process.env.CHAT_MAX_LINES || 18)) };
}

/* =========================
   Controller
========================= */
export async function chatWithAI(req, res) {
  try {
    const actor = req.user;
    const message = String(req.body?.message || "").trim();

    if (!message) {
      res.status(400).json({ message: "message is required" });
      return;
    }

    // Anti-spam
    const uid = String(actor?._id || "anon");
    const last = mem.lastMsgAt.get(uid) || 0;
    const gapMs = nowMs() - last;
    const minGapMs = Number(process.env.CHAT_MIN_GAP_MS || 600);
    if (gapMs < minGapMs) {
      res.json({ text: "Please wait a moment, then send your message again." });
      return;
    }
    mem.lastMsgAt.set(uid, nowMs());

    resetDailyIfNeeded();

    // 1) FAQ first
    const faq = faqAnswer(message);
    if (faq) {
      res.json({ text: faq });
      return;
    }

    // 2) DB-required -> DB ONLY
    const t = norm(message);
    if (isDbRequiredQuestion(t)) {
      const ans = await dbDirectAnswer(message, actor);
      res.json({ text: ans || "I don't have that information available in the database right now." });
      return;
    }

    // 3) Non-DB question -> Gemini allowed (optional)
    const maxPerDay = Number(process.env.GEMINI_MAX_PER_DAY || 50);
    if (mem.geminiUsed >= maxPerDay) {
      res.json({ text: "AI quota reached for today. I can still answer dashboard/database questions (counts, rooms, attendance, toilet stats, next exam, etc.)." });
      return;
    }

    // Gemini cache (for non-DB only)
    const day = todayKey();
    const cacheKey = `Q:${day}:ROLE:${actor?.role || "user"}:MSG:${t}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.json({ text: cached });
      return;
    }

    mem.geminiUsed += 1;
    const out = await geminiAnswer({ actor, message });

    const ttl = Number(process.env.CHAT_GEMINI_CACHE_TTL_MS || 10 * 60 * 1000);
    cacheSet(cacheKey, out.text, ttl);

    res.json({ text: out.text });
  } catch (err) {
    console.error("chatWithAI error:", err);
    res.status(500).json({ message: "Chat failed" });
  }
}
