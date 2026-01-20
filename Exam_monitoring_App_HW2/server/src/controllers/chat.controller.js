// server/src/controllers/chat.controller.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import Exam from "../models/Exam.js";
import TransferRequest from "../models/TransferRequest.js";

/**
 * ✅ Safety-first chatbot (Production-style):
 * - ANY factual / DB question -> DB ONLY (NO Gemini guessing).
 * - Gemini is used ONLY for: "how to", explanations, general knowledge (no numbers).
 *
 * ✅ Improvements in this version:
 * 1) Strong English-only intent detection (more coverage, less false negatives).
 * 2) Upcoming exams list + second upcoming exam.
 * 3) Students who are NOT ARRIVED (list).
 * 4) Top students by toilet exits (from report.studentStats) + optional room scope.
 * 5) "Report for exam X" (running/ended/scheduled) by:
 *    - exam id
 *    - course name match
 *    - "next/current/running/last" keywords
 * 6) Safer responses: if not available -> clear DB message (no fake answers).
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
    match: (t) =>
      t.includes("report") || t.includes("history") || t.includes("export") || t.includes("csv") || t.includes("pdf"),
    answer:
      "Reports/History (Lecturer/Admin):\n- Open Reports/History from the exam view\n- Review statistics/incidents\n- Export CSV or print to PDF (if available in your UI).",
  },
  {
    match: (t) => t === "help" || t.includes("what can you do") || t.includes("commands"),
    answer:
      "I can help with:\n- Running exam info (course, rooms, supervisors, lecturers)\n- Live counts (present/not arrived/temp out/finished)\n- Lists (not arrived students)\n- Toilet stats + top students by exits\n- Next/Upcoming exams + second upcoming exam\n- Transfer stats\n- Recent events/messages\n- Generate a short report for a specific exam\n\nTip: ask \"room A-101\" (or A101) to focus on one room, or \"all rooms\" for totals.",
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

function isValidObjectIdLike(s) {
  return /^[a-f0-9]{24}$/i.test(String(s || "").trim());
}

function pickTopN(text, def = 5, min = 3, max = 20) {
  const m = String(text || "").match(/\btop\s+(\d{1,2})\b/i);
  if (!m) return def;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
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
   Intent detection (English)
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

function isUpcomingExamsListQuestion(t) {
  return (
    (t.includes("upcoming") && t.includes("exams")) ||
    (t.includes("future") && t.includes("exams")) ||
    (t.includes("list") && t.includes("exams")) ||
    (t.includes("what") && t.includes("exams") && (t.includes("upcoming") || t.includes("future")))
  );
}

function isSecondUpcomingExamQuestion(t) {
  return (
    (t.includes("second") && t.includes("upcoming") && t.includes("exam")) ||
    (t.includes("second") && t.includes("next") && t.includes("exam")) ||
    (t.includes("2nd") && t.includes("exam"))
  );
}

function isToiletQuestion(t) {
  return t.includes("toilet") || t.includes("bathroom") || t.includes("restroom");
}

function looksLikeCountQuestion(t) {
  return t.includes("how many") || t.includes("count") || t.includes("number") || t.includes("how much");
}

function isListNotArrivedStudentsQuestion(t) {
  return (
    (t.includes("which") || t.includes("who") || t.includes("list") || t.includes("show")) &&
    (t.includes("not arrived") || t.includes("haven't arrived") || t.includes("hasn't arrived") || t.includes("didn't arrive"))
  );
}

function isTopToiletStudentsQuestion(t) {
  return (
    (t.includes("top") || t.includes("most") || t.includes("highest")) &&
    (t.includes("toilet") || t.includes("bathroom") || t.includes("restroom")) &&
    (t.includes("students") || t.includes("student") || t.includes("who"))
  );
}

function isExamReportQuestion(t) {
  return (
    t.includes("report for") ||
    t.includes("generate report") ||
    t.includes("exam report") ||
    (t.includes("report") && t.includes("exam"))
  );
}

function isRunningExamQuestion(t) {
  return t.includes("running") || t.includes("current exam") || t.includes("what exam") || t.includes("which exam");
}

/**
 * ✅ DB-required questions:
 * Anything that expects facts from DB: lists, counts, rankings, stats, exams schedule, etc.
 */
function isDbRequiredQuestion(tRaw) {
  const t = norm(tRaw);

  // Time now is DB-free
  if (isTimeNowQuestion(t)) return false;

  // Explicit DB intents
  if (isNextExamQuestion(t)) return true;
  if (isUpcomingExamsListQuestion(t)) return true;
  if (isSecondUpcomingExamQuestion(t)) return true;
  if (isExamReportQuestion(t)) return true;
  if (isListNotArrivedStudentsQuestion(t)) return true;
  if (isTopToiletStudentsQuestion(t)) return true;

  const triggers = [
    "how many",
    "count",
    "number",
    "list",
    "show",
    "who",
    "which",
    "present",
    "absent",
    "not arrived",
    "haven't arrived",
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
    "upcoming",
    "future",
    "schedule",
    "next",
  ];

  return triggers.some((k) => t.includes(k));
}

/* =========================
   Exam lookup (role-scoped)
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

async function findNextExamForActor(actor) {
  const now = new Date();
  const sort = { examDate: 1, startAt: 1, createdAt: 1 };

  const futureBase = {
    $and: [
      { $or: [{ examDate: { $gte: now } }, { startAt: { $gte: now } }] },
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

  const scheduledFirst = await Exam.find({
    $and: [query, { $or: [{ status: "scheduled" }, { status: { $exists: false } }, { status: "" }] }],
  })
    .sort(sort)
    .limit(3);

  if (scheduledFirst?.length) return scheduledFirst[0];

  const anyFuture = await Exam.find(query).sort(sort).limit(1);
  return anyFuture?.[0] || null;
}

async function listUpcomingExamsForActor(actor, limit = 5) {
  const now = new Date();
  const sort = { examDate: 1, startAt: 1, createdAt: 1 };

  const futureBase = {
    $and: [
      { $or: [{ examDate: { $gte: now } }, { startAt: { $gte: now } }] },
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

  return await Exam.find(query).sort(sort).limit(limit);
}

async function findLatestEndedExamForActor(actor) {
  const sort = { endAt: -1, examDate: -1, createdAt: -1 };

  const base = { status: "ended" };

  if (actor?.role === "admin") {
    return (await Exam.find(base).sort(sort).limit(1))[0] || null;
  }

  if (actor?.role === "lecturer") {
    return (
      (await Exam.find({
        $and: [
          base,
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
        $and: [base, { supervisors: { $elemMatch: { id: actor._id } } }],
      })
        .sort(sort)
        .limit(1))[0] || null
    );
  }

  return (await Exam.find(base).sort(sort).limit(1))[0] || null;
}

/* =========================
   Exam targeting from user text
========================= */
function extractExamIdFromText(text) {
  const s = String(text || "");
  const m = s.match(/\b([a-f0-9]{24})\b/i);
  return m?.[1] || null;
}

function extractCourseNameHint(text) {
  const s = String(text || "").trim();

  // "report for Algorithms - Midterm"
  const m1 = s.match(/report\s+for\s+(.+)$/i);
  if (m1?.[1]) return m1[1].trim();

  // exam: "Algorithms - Midterm"
  const m2 = s.match(/\bexam\s*[:\-]\s*(.+)$/i);
  if (m2?.[1]) return m2[1].trim();

  // quoted name
  const m3 = s.match(/"([^"]{3,80})"/);
  if (m3?.[1]) return m3[1].trim();

  return null;
}

async function findExamByCourseNameFuzzy(actor, courseHint) {
  const hint = String(courseHint || "").trim();
  if (!hint) return null;

  const re = new RegExp(hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  // we search across recent exams first (future + running + ended), limited for safety
  const sort = { examDate: -1, startAt: -1, createdAt: -1 };

  const roleFilter =
    actor?.role === "lecturer"
      ? { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] }
      : actor?.role === "supervisor"
      ? { supervisors: { $elemMatch: { id: actor._id } } }
      : null;

  const q = roleFilter
    ? { $and: [roleFilter, { courseName: re }] }
    : { courseName: re };

  return (await Exam.find(q).sort(sort).limit(1))[0] || null;
}

async function resolveTargetExamForReport(actor, userText) {
  const t = norm(userText);

  const id = extractExamIdFromText(userText);
  if (id && isValidObjectIdLike(id)) {
    const doc = await Exam.findById(id);
    if (doc) return doc;
  }

  if (t.includes("running") || t.includes("current")) {
    const running = await findRunningExamForActor(actor);
    if (running) return running;
  }

  if (t.includes("next")) {
    const nx = await findNextExamForActor(actor);
    if (nx) return nx;
  }

  if (t.includes("last") || t.includes("previous") || t.includes("ended")) {
    const last = await findLatestEndedExamForActor(actor);
    if (last) return last;
  }

  const courseHint = extractCourseNameHint(userText);
  if (courseHint) {
    const byName = await findExamByCourseNameFuzzy(actor, courseHint);
    if (byName) return byName;
  }

  // fallback order: running -> next -> latest ended
  return (await findRunningExamForActor(actor)) || (await findNextExamForActor(actor)) || (await findLatestEndedExamForActor(actor));
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

function listStudentsByStatus(exam, status, roomId = null) {
  const arr = Array.isArray(exam?.attendance) ? exam.attendance : [];
  const target = roomId ? normalizeRoomId(roomId) : null;

  const filtered = arr.filter((a) => {
    const st = String(a?.status || "not_arrived");
    if (st !== status) return false;
    if (!target) return true;
    const r = normalizeRoomId(a?.roomId || a?.classroom || "");
    return r === target;
  });

  return filtered;
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
   Toilet stats from report.studentStats (Map)
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

function buildTopToiletStudents(exam, roomId = null, topN = 5) {
  const statsMap = exam?.report?.studentStats;
  if (!statsMap) return { supported: false, rows: [] };

  const entries = statsMap instanceof Map ? Array.from(statsMap.entries()) : Object.entries(statsMap);
  const att = Array.isArray(exam?.attendance) ? exam.attendance : [];

  const byId = new Map();
  for (const a of att) {
    if (!a?.studentId) continue;
    byId.set(String(a.studentId), a);
  }

  const target = roomId ? normalizeRoomId(roomId) : null;

  const rows = [];
  for (const [sid, st] of entries) {
    const a = byId.get(String(sid));
    if (!a) continue;

    const r = normalizeRoomId(a?.roomId || a?.classroom || "");
    if (target && r !== target) continue;

    const toiletCount = Number(st?.toiletCount || 0);
    const totalToiletMs = Number(st?.totalToiletMs || 0);

    if (toiletCount <= 0) continue;

    rows.push({
      studentId: String(sid),
      name: a?.name || "Student",
      studentNumber: a?.studentNumber || "",
      roomId: r,
      seat: a?.seat || "",
      toiletCount,
      totalToiletMs,
      status: a?.status || "",
    });
  }

  rows.sort((a, b) => {
    if (b.toiletCount !== a.toiletCount) return b.toiletCount - a.toiletCount;
    return b.totalToiletMs - a.totalToiletMs;
  });

  return { supported: true, rows: rows.slice(0, topN) };
}

/* =========================
   DB direct answers (ONLY truth)
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

  // Upcoming exams list
  if (isUpcomingExamsListQuestion(t)) {
    const tz = getTZ();
    const list = await listUpcomingExamsForActor(actor, 6);
    if (!list?.length) return "I couldn't find upcoming exams in the database.";

    const lines = list.slice(0, 5).map((ex, idx) => {
      const when = ex.startAt || ex.examDate;
      return `${idx + 1}) ${examTitle(ex)} — ${formatDT(when, tz)} — status: ${ex.status || "scheduled"}`;
    });

    return `Upcoming exams:\n${lines.join("\n")}`;
  }

  // Second upcoming exam
  if (isSecondUpcomingExamQuestion(t)) {
    const tz = getTZ();
    const list = await listUpcomingExamsForActor(actor, 3);
    if (!list?.length) return "I couldn't find upcoming exams in the database.";
    if (list.length < 2) {
      const only = list[0];
      const when = only.startAt || only.examDate;
      return `There is only one upcoming exam:\n1) ${examTitle(only)} — ${formatDT(when, tz)} — status: ${only.status || "scheduled"}`;
    }
    const second = list[1];
    const when = second.startAt || second.examDate;
    return `Second upcoming exam:\n${examTitle(second)}\n- Date: ${formatDT(when, tz)}\n- Status: ${second.status || "scheduled"}`;
  }

  // Next exam
  if (isNextExamQuestion(t)) {
    const nx = await findNextExamForActor(actor);
    if (!nx) return "I couldn't find an upcoming exam in the database.";
    const tz = getTZ();
    const when = nx.startAt || nx.examDate;
    return `Next exam: ${examTitle(nx)}\n- Date: ${formatDT(when, tz)}\n- Status: ${nx.status || "scheduled"}`;
  }

  // Report for exam X (running/next/last/by name/by id)
  if (isExamReportQuestion(t)) {
    const ex = await resolveTargetExamForReport(actor, userText);
    if (!ex) return "I couldn't find that exam in the database.";

    const tz = getTZ();
    const when = ex.startAt || ex.examDate;
    const rooms = (ex.classrooms || []).map((r) => r?.name || r?.id).filter(Boolean);
    const supervisors = Array.isArray(ex.supervisors) ? ex.supervisors : [];

    // Summary:
    const summary = ex?.report?.summary || null;
    const c = countAttendance(ex, null);

    // Toilet top 5 (if exists)
    const topN = pickTopN(userText, 5);
    const topToilet = buildTopToiletStudents(ex, null, topN);

    const lines = [];
    lines.push(`Exam report: ${examTitle(ex)}`);
    lines.push(`- Date: ${formatDT(when, tz)}`);
    lines.push(`- Status: ${ex.status || "scheduled"}`);

    if (rooms.length) lines.push(`- Rooms: ${rooms.length} (${rooms.slice(0, 8).join(", ")}${rooms.length > 8 ? ", …" : ""})`);
    if (supervisors.length) lines.push(`- Supervisors: ${supervisors.length}`);

    // Prefer stored report.summary if available, otherwise fallback to live attendance counts
    if (summary) {
      lines.push(`\nSummary (from report):`);
      lines.push(`- Total students: ${summary.totalStudents ?? c.total}`);
      lines.push(`- Present: ${summary.present ?? c.present}`);
      lines.push(`- Not arrived: ${summary.not_arrived ?? c.not_arrived}`);
      lines.push(`- Temp out: ${summary.temp_out ?? c.temp_out}`);
      lines.push(`- Absent: ${summary.absent ?? c.absent}`);
      lines.push(`- Finished: ${summary.finished ?? c.finished}`);
      lines.push(`- Incidents: ${summary.incidents ?? 0}`);
      lines.push(`- Violations: ${summary.violations ?? 0}`);
      lines.push(`- Transfers: ${summary.transfers ?? 0}`);
    } else {
      lines.push(`\nLive attendance snapshot:`);
      lines.push(`- Total: ${c.total}`);
      lines.push(`- Present: ${c.present}`);
      lines.push(`- Not arrived: ${c.not_arrived}`);
      lines.push(`- Temp out: ${c.temp_out}`);
      lines.push(`- Absent: ${c.absent}`);
      lines.push(`- Moving: ${c.moving}`);
      lines.push(`- Finished: ${c.finished}`);
    }

    if (topToilet.supported && topToilet.rows.length) {
      lines.push(`\nTop ${topToilet.rows.length} students by toilet exits:`);
      for (const r of topToilet.rows) {
        const mins = Math.round((r.totalToiletMs || 0) / 60000);
        lines.push(
          `- ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, total: ${mins} min, room: ${prettyRoomId(r.roomId)}${r.seat ? `, seat: ${r.seat}` : ""}`
        );
      }
    } else {
      lines.push(`\nTop toilet students: not available (no studentStats in report).`);
    }

    return lines.join("\n");
  }

  // For any other "live" DB answers, we usually need a running exam
  const exam = await findRunningExamForActor(actor);
  if (!exam) return "I couldn't find a running exam right now in the database.";

  const title = examTitle(exam);
  const scope = resolveRoomScope(userText, actor);
  const roomId = scope.scope === "room" ? scope.roomId : null;
  const where = roomId ? `Room ${prettyRoomId(roomId)}` : "All rooms";

  // Time remaining
  if (
    t.includes("time remaining") ||
    (t.includes("time") && (t.includes("remaining") || t.includes("left"))) ||
    (t.includes("when") && t.includes("end"))
  ) {
    const end = exam?.endAt ? new Date(exam.endAt) : null;
    if (!end || Number.isNaN(end.getTime())) {
      return `I can't calculate time remaining because endAt is missing.\n(Exam: ${title})`;
    }
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return `Exam time window ended.\n(Exam: ${title})`;
    return `Time remaining: ${msToHuman(diff)}\n(Exam: ${title})`;
  }

  // List students NOT ARRIVED
  if (isListNotArrivedStudentsQuestion(t)) {
    const list = listStudentsByStatus(exam, "not_arrived", roomId);
    const total = list.length;

    if (!total) return `No "not arrived" students right now (${where}).\n(Exam: ${title})`;

    const max = pickTopN(userText, 12, 5, 30); // reuse top parsing for "show 15"
    const slice = list.slice(0, max);

    const lines = slice.map((s, idx) => {
      const r = prettyRoomId(s?.roomId || s?.classroom || "");
      const seat = s?.seat ? `, seat: ${s.seat}` : "";
      const num = s?.studentNumber ? ` (${s.studentNumber})` : "";
      return `${idx + 1}) ${s?.name || "Student"}${num} — ${r}${seat}`;
    });

    return `Not arrived students (${where}) — ${total}:\n${lines.join("\n")}\n(Exam: ${title})`;
  }

  // Top students by toilet exits (live exam scope)
  if (isTopToiletStudentsQuestion(t)) {
    const topN = pickTopN(userText, 5);
    const top = buildTopToiletStudents(exam, roomId, topN);
    if (!top.supported) return `Top toilet students are not available right now (no studentStats in report).\n(Exam: ${title})`;
    if (!top.rows.length) return `No toilet exits recorded yet (${where}).\n(Exam: ${title})`;

    const lines = top.rows.map((r, idx) => {
      const mins = Math.round((r.totalToiletMs || 0) / 60000);
      return `${idx + 1}) ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, total: ${mins} min, room: ${prettyRoomId(r.roomId)}${r.seat ? `, seat: ${r.seat}` : ""}`;
    });

    return `Top ${top.rows.length} students by toilet exits (${where}):\n${lines.join("\n")}\n(Exam: ${title})`;
  }

  // Toilet stats (overall or room)
  if (isToiletQuestion(t) && (looksLikeCountQuestion(t) || t.includes("stats") || t.includes("summary"))) {
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
    const main = exam.lecturer
      ? `- Main lecturer: ${exam.lecturer.name} (rooms: ${exam.lecturer.roomIds?.map(prettyRoomId).join(", ") || "--"})`
      : null;
    const co = (exam.coLecturers || []).map(
      (l) => `- Co-lecturer: ${l?.name || "Lecturer"} (rooms: ${l?.roomIds?.map(prettyRoomId).join(", ") || "--"})`
    );
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

  // Events count / last events
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
  if (isRunningExamQuestion(t)) {
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

STRICT RULES:
- If the user asks for ANY database facts (numbers, lists, counts, rankings, schedules, attendance, toilets, transfers, incidents, messages, reports), reply EXACTLY:
  "This question requires database facts. Please ask it as a dashboard/DB query."
- Only answer "how to" / explanations / UI guidance.

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
      res.json({
        text: "AI quota reached for today. I can still answer dashboard/database questions (counts, rooms, attendance, toilet stats, upcoming exams, reports, etc.).",
      });
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
