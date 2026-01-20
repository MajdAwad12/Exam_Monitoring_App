// server/src/controllers/chat.controller.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import Exam from "../models/Exam.js";
import TransferRequest from "../models/TransferRequest.js";

/**
 * ✅ Safety-first chatbot (Production-style):
 * - ANY factual / DB question -> DB ONLY (NO Gemini guessing).
 * - Gemini is used ONLY for: "how to", explanations, general knowledge (no numbers).
 *
 * ✅ Key fixes (Updated for your presentation):
 * 1) ✅ English + Hebrew intent detection for the supervisor questions.
 * 2) ✅ Direct DB answers for:
 *    - כמה סטודנטים לא הגיעו?
 *    - מה המבחן הנוכחי?
 *    - מי יצא לשירותים יותר מ X פעמים? (default 3)
 *    - איזה סטודנט בחוץ עכשיו?
 * 3) Upcoming exams list + second upcoming exam.
 * 4) Not arrived (count + list with safe truncation).
 * 5) Toilet stats:
 *    - Primary: report.studentStats
 *    - Fallback: exam.events (best-effort count)
 * 6) ✅ ACL: exam id lookup is role-scoped (no data leak).
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
    match: (t) =>
      (t.includes("gray") || t.includes("grey") || t.includes("not arrived")) &&
      (t.includes("mean") || t.includes("meaning") || t.includes("what does") || t.includes("explain")),
    answer:
      "Not arrived (gray) means the student has not checked in yet.\nAfter QR scan or marking Present, the student appears on the room map.",
  },
  {
    match: (t) =>
      (t.includes("toilet") || t.includes("bathroom") || t.includes("restroom")) &&
      (t.includes("how") || t.includes("track") || t.includes("start") || t.includes("return") || t.includes("use")),
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

function pickShowN(text, def = 12, min = 5, max = 30) {
  const m = String(text || "").match(/\b(show|list)\s+(\d{1,2})\b/i);
  if (!m) return def;
  const n = Number(m[2]);
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
    t.includes("all of them") ||
    // Hebrew common
    t.includes("כל הכיתות") ||
    t.includes("כל החדרים") ||
    t.includes("בכל החדרים") ||
    t.includes("בסך הכל") ||
    t.includes("בכללי")
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
   Intent detection (English + Hebrew)
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
    (t.includes("scheduled") && t.includes("exams")) ||
    (t.includes("list") && t.includes("upcoming") && t.includes("exams")) ||
    (t.includes("show") && t.includes("upcoming") && t.includes("exams"))
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
  return (
    t.includes("toilet") ||
    t.includes("bathroom") ||
    t.includes("restroom") ||
    // Hebrew
    t.includes("שירותים")
  );
}

function looksLikeCountQuestion(t) {
  return (
    t.includes("how many") ||
    t.includes("count") ||
    t.includes("number") ||
    t.includes("how much") ||
    // Hebrew
    t.includes("כמה")
  );
}

function isListNotArrivedStudentsQuestion(t) {
  return (
    ((t.includes("which") || t.includes("who") || t.includes("list") || t.includes("show")) &&
      (t.includes("not arrived") ||
        t.includes("haven't arrived") ||
        t.includes("hasn't arrived") ||
        t.includes("didn't arrive"))) ||
    // Hebrew
    (t.includes("מי") && (t.includes("לא הגיע") || t.includes("לא הגיעו") || t.includes("לא הגיע עדיין"))) ||
    (t.includes("רשימה") && (t.includes("לא הגיע") || t.includes("לא הגיעו")))
  );
}

function isNotArrivedCountQuestionHeb(t) {
  // "כמה סטודנטים לא הגיעו" / "כמה לא הגיעו"
  return t.includes("כמה") && (t.includes("לא הגיע") || t.includes("לא הגיעו") || t.includes("לא הגיעו עדיין"));
}

function isTopToiletStudentsQuestion(t) {
  return (
    (t.includes("top") || t.includes("most") || t.includes("highest")) &&
    (t.includes("toilet") || t.includes("bathroom") || t.includes("restroom")) &&
    (t.includes("students") || t.includes("student") || t.includes("who"))
  );
}

function isToiletMoreThanQuestionHeb(t) {
  // "מי יצא לשירותים יותר מ 3 פעמים"
  return (
    (t.includes("מי") || t.includes("איזה") || t.includes("רשימה")) &&
    t.includes("שירותים") &&
    (t.includes("יותר מ") || t.includes(">") || t.includes("מעל"))
  );
}

function parseHebMoreThanNumber(t, def = 3) {
  // catches: "יותר מ 3" / "מעל 4" / "> 2"
  const m1 = t.match(/יותר\s*מ\s*(\d{1,2})/i);
  if (m1?.[1]) return Number(m1[1]);

  const m2 = t.match(/מעל\s*(\d{1,2})/i);
  if (m2?.[1]) return Number(m2[1]);

  const m3 = t.match(/>\s*(\d{1,2})/i);
  if (m3?.[1]) return Number(m3[1]);

  return def;
}

function isExamReportQuestion(t) {
  return t.includes("report for") || t.includes("generate report") || t.includes("exam report") || (t.includes("report") && t.includes("exam"));
}

function isRunningExamQuestion(t) {
  return (
    t.includes("running") ||
    t.includes("current exam") ||
    t.includes("what exam") ||
    t.includes("which exam") ||
    // Hebrew
    t.includes("מה המבחן הנוכחי") ||
    (t.includes("איזה") && t.includes("מבחן") && (t.includes("עכשיו") || t.includes("נוכחי"))) ||
    (t.includes("מה") && t.includes("מבחן") && (t.includes("עכשיו") || t.includes("נוכחי")))
  );
}

function isOutsideNowQuestionHeb(t) {
  // "איזה סטודנט בחוץ עכשיו" / "מי בחוץ עכשיו"
  return (
    (t.includes("בחוץ") || t.includes("מחוץ")) &&
    (t.includes("עכשיו") || t.includes("כרגע") || t.includes("ברגע זה") || t.includes("מי") || t.includes("איזה"))
  );
}

/**
 * ✅ DB-required questions:
 * Anything that expects facts from DB: lists, counts, rankings, stats, exams schedule, etc.
 */
function isDbRequiredQuestion(tRaw) {
  const t = norm(tRaw);

  // Time now is DB-free
  if (isTimeNowQuestion(t)) return false;

  // Hebrew direct intents
  if (isNotArrivedCountQuestionHeb(t)) return true;
  if (isRunningExamQuestion(t)) return true;
  if (isToiletMoreThanQuestionHeb(t)) return true;
  if (isOutsideNowQuestionHeb(t)) return true;

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
    "running",
    "current exam",
    "exam running",
    "what exam",
    // Hebrew common DB triggers
    "כמה",
    "סטודנטים",
    "סטודנט",
    "נוכחי",
    "עכשיו",
    "כרגע",
    "לא הגיע",
    "לא הגיעו",
    "שירותים",
    "בחוץ",
    "מחוץ",
    "כיתה",
    "חדר",
    "נוכחות",
    "העברות",
    "דוח",
  ];

  return triggers.some((k) => t.includes(k));
}

/* =========================
   Role-scoped exam access (ACL)
========================= */
function actorCanAccessExam(actor, exam) {
  if (!actor || !exam) return false;

  const actorId = String(actor._id || "");
  if (!actorId) return false;

  if (actor.role === "admin") return true;

  if (actor.role === "lecturer") {
    const main = String(exam?.lecturer?.id || "");
    if (main && main === actorId) return true;

    const co = Array.isArray(exam?.coLecturers) ? exam.coLecturers : [];
    if (co.some((l) => String(l?.id || "") === actorId)) return true;
    return false;
  }

  if (actor.role === "supervisor") {
    const sup = Array.isArray(exam?.supervisors) ? exam.supervisors : [];
    return sup.some((s) => String(s?.id || "") === actorId);
  }

  if (actor.role === "student") {
    const att = Array.isArray(exam?.attendance) ? exam.attendance : [];
    return att.some((a) => String(a?.studentId || "") === actorId);
  }

  return false;
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
    $and: [{ $or: [{ examDate: { $gte: now } }, { startAt: { $gte: now } }] }, { status: { $ne: "ended" } }],
  };

  const roleFilter =
    actor?.role === "lecturer"
      ? { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] }
      : actor?.role === "supervisor"
      ? { supervisors: { $elemMatch: { id: actor._id } } }
      : actor?.role === "student"
      ? { attendance: { $elemMatch: { studentId: actor._id } } }
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
    $and: [{ $or: [{ examDate: { $gte: now } }, { startAt: { $gte: now } }] }, { status: { $ne: "ended" } }],
  };

  const roleFilter =
    actor?.role === "lecturer"
      ? { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] }
      : actor?.role === "supervisor"
      ? { supervisors: { $elemMatch: { id: actor._id } } }
      : actor?.role === "student"
      ? { attendance: { $elemMatch: { studentId: actor._id } } }
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
        $and: [base, { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] }],
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

  if (actor?.role === "student") {
    return (
      (await Exam.find({
        $and: [base, { attendance: { $elemMatch: { studentId: actor._id } } }],
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

  const m1 = s.match(/report\s+for\s+(.+)$/i);
  if (m1?.[1]) return m1[1].trim().slice(0, 80);

  const m2 = s.match(/\bexam\s*[:\-]\s*(.+)$/i);
  if (m2?.[1]) return m2[1].trim().slice(0, 80);

  const m3 = s.match(/"([^"]{3,80})"/);
  if (m3?.[1]) return m3[1].trim().slice(0, 80);

  return null;
}

async function findExamByCourseNameFuzzy(actor, courseHint) {
  const hint = String(courseHint || "").trim();
  if (!hint) return null;

  const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");

  const sort = { examDate: -1, startAt: -1, createdAt: -1 };

  const roleFilter =
    actor?.role === "lecturer"
      ? { $or: [{ "lecturer.id": actor._id }, { coLecturers: { $elemMatch: { id: actor._id } } }] }
      : actor?.role === "supervisor"
      ? { supervisors: { $elemMatch: { id: actor._id } } }
      : actor?.role === "student"
      ? { attendance: { $elemMatch: { studentId: actor._id } } }
      : null;

  const q = roleFilter ? { $and: [roleFilter, { courseName: re }] } : { courseName: re };

  return (await Exam.find(q).sort(sort).limit(1))[0] || null;
}

async function resolveTargetExamForReport(actor, userText) {
  const t = norm(userText);

  const id = extractExamIdFromText(userText);
  if (id && isValidObjectIdLike(id)) {
    const doc = await Exam.findById(id);
    if (doc && actorCanAccessExam(actor, doc)) return doc;
  }

  if (t.includes("running") || t.includes("current") || t.includes("נוכחי") || t.includes("עכשיו")) {
    const running = await findRunningExamForActor(actor);
    if (running) return running;
  }

  if (t.includes("next") || t.includes("הבא")) {
    const nx = await findNextExamForActor(actor);
    if (nx) return nx;
  }

  if (t.includes("last") || t.includes("previous") || t.includes("ended") || t.includes("אחרון") || t.includes("הסתיים")) {
    const last = await findLatestEndedExamForActor(actor);
    if (last) return last;
  }

  const courseHint = extractCourseNameHint(userText);
  if (courseHint) {
    const byName = await findExamByCourseNameFuzzy(actor, courseHint);
    if (byName) return byName;
  }

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

  return arr.filter((a) => {
    const st = String(a?.status || "not_arrived");
    if (st !== status) return false;
    if (!target) return true;
    const r = normalizeRoomId(a?.roomId || a?.classroom || "");
    return r === target;
  });
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
    const pretty = prettyRoomId(target);
    const raw = target;
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
   Toilet stats (Primary: report.studentStats)
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

function buildTopToiletStudentsFromReport(exam, roomId = null, topN = 5) {
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
      activeNow: !!(st?.activeToilet?.leftAt),
    });
  }

  rows.sort((a, b) => {
    if (b.toiletCount !== a.toiletCount) return b.toiletCount - a.toiletCount;
    return b.totalToiletMs - a.totalToiletMs;
  });

  return { supported: true, rows: rows.slice(0, topN) };
}

/* =========================
   Toilet stats fallback (Best-effort: exam.events)
========================= */
function buildTopToiletStudentsFromEvents(exam, roomId = null, topN = 5) {
  const events = Array.isArray(exam?.events) ? exam.events : [];
  if (!events.length) return { supported: false, rows: [] };

  const att = Array.isArray(exam?.attendance) ? exam.attendance : [];
  const byId = new Map();
  for (const a of att) {
    if (!a?.studentId) continue;
    byId.set(String(a.studentId), a);
  }

  const target = roomId ? normalizeRoomId(roomId) : null;

  const counts = new Map(); // sid -> count

  for (const e of events) {
    const type = norm(e?.type || "");
    const desc = norm(e?.description || "");
    const isToilet = type.includes("toilet") || desc.includes("toilet") || desc.includes("bathroom") || desc.includes("restroom");
    if (!isToilet) continue;

    const isReturn = type.includes("return") || desc.includes("return");
    if (isReturn) continue;

    const sid = e?.studentId ? String(e.studentId) : "";
    if (!sid) continue;

    const a = byId.get(sid);
    if (!a) continue;

    const r = normalizeRoomId(a?.roomId || a?.classroom || e?.classroom || "");
    if (target && r !== target) continue;

    counts.set(sid, (counts.get(sid) || 0) + 1);
  }

  const rows = [];
  for (const [sid, toiletCount] of counts.entries()) {
    const a = byId.get(sid);
    if (!a) continue;

    rows.push({
      studentId: sid,
      name: a?.name || "Student",
      studentNumber: a?.studentNumber || "",
      roomId: normalizeRoomId(a?.roomId || a?.classroom || ""),
      seat: a?.seat || "",
      toiletCount,
    });
  }

  rows.sort((a, b) => b.toiletCount - a.toiletCount);
  return { supported: true, rows: rows.slice(0, topN) };
}

/* =========================
   ✅ NEW helpers for your 4 supervisor questions
========================= */
function listToiletAboveThreshold(exam, roomId, threshold) {
  // Prefer report.studentStats
  const all = buildTopToiletStudentsFromReport(exam, roomId, 999);
  if (all.supported) {
    const rows = (all.rows || []).filter((r) => Number(r.toiletCount || 0) > threshold);
    rows.sort((a, b) => b.toiletCount - a.toiletCount);
    return { supported: true, source: "report", rows };
  }

  // Fallback: events
  const ev = buildTopToiletStudentsFromEvents(exam, roomId, 999);
  if (ev.supported) {
    const rows = (ev.rows || []).filter((r) => Number(r.toiletCount || 0) > threshold);
    rows.sort((a, b) => b.toiletCount - a.toiletCount);
    return { supported: true, source: "events", rows };
  }

  return { supported: false, source: "none", rows: [] };
}

function listOutsideNow(exam, roomId) {
  // outside now = status temp_out OR active toilet in report (if exists)
  const tempOut = listStudentsByStatus(exam, "temp_out", roomId);

  const statsMap = exam?.report?.studentStats;
  let activeToilet = [];
  if (statsMap) {
    const entries = statsMap instanceof Map ? Array.from(statsMap.entries()) : Object.entries(statsMap);
    const att = Array.isArray(exam?.attendance) ? exam.attendance : [];
    const byId = new Map();
    for (const a of att) if (a?.studentId) byId.set(String(a.studentId), a);

    const target = roomId ? normalizeRoomId(roomId) : null;

    for (const [sid, st] of entries) {
      const leftAt = st?.activeToilet?.leftAt ? new Date(st.activeToilet.leftAt) : null;
      if (!leftAt || Number.isNaN(leftAt.getTime())) continue;

      const a = byId.get(String(sid));
      if (!a) continue;

      const r = normalizeRoomId(a?.roomId || a?.classroom || "");
      if (target && r !== target) continue;

      activeToilet.push(a);
    }
  }

  // Deduplicate by studentId
  const seen = new Set();
  const merged = [];
  for (const s of [...tempOut, ...activeToilet]) {
    const id = String(s?.studentId || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(s);
  }

  return merged;
}

/* =========================
   DB direct answers (ONLY truth)
========================= */
async function dbDirectAnswer(userText, actor) {
  const t = norm(userText);
  if (!t) return null;

  // Time now (no Gemini)
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

  // Report for exam X
  if (isExamReportQuestion(t)) {
    const ex = await resolveTargetExamForReport(actor, userText);
    if (!ex) return "I couldn't find that exam in the database (or you don't have access to it).";

    const tz = getTZ();
    const when = ex.startAt || ex.examDate;
    const rooms = (ex.classrooms || []).map((r) => r?.name || r?.id).filter(Boolean);
    const supervisors = Array.isArray(ex.supervisors) ? ex.supervisors : [];

    const summary = ex?.report?.summary || null;
    const c = countAttendance(ex, null);

    const topN = pickTopN(userText, 5);
    const topToiletReport = buildTopToiletStudentsFromReport(ex, null, topN);
    const topToiletEvents = !topToiletReport.supported ? buildTopToiletStudentsFromEvents(ex, null, topN) : null;

    const lines = [];
    lines.push(`Exam report: ${examTitle(ex)}`);
    lines.push(`- Date: ${formatDT(when, tz)}`);
    lines.push(`- Status: ${ex.status || "scheduled"}`);

    if (rooms.length) lines.push(`- Rooms: ${rooms.length} (${rooms.slice(0, 8).join(", ")}${rooms.length > 8 ? ", …" : ""})`);
    if (supervisors.length) lines.push(`- Supervisors: ${supervisors.length}`);

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

    if (topToiletReport.supported && topToiletReport.rows.length) {
      lines.push(`\nTop ${topToiletReport.rows.length} students by toilet exits (report):`);
      for (const r of topToiletReport.rows) {
        const mins = Math.round((r.totalToiletMs || 0) / 60000);
        lines.push(
          `- ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, total: ${mins} min, room: ${prettyRoomId(r.roomId)}${r.seat ? `, seat: ${r.seat}` : ""}`
        );
      }
    } else if (topToiletEvents?.supported && topToiletEvents.rows.length) {
      lines.push(`\nTop ${topToiletEvents.rows.length} students by toilet exits (events fallback):`);
      for (const r of topToiletEvents.rows) {
        lines.push(`- ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, room: ${prettyRoomId(r.roomId)}${r.seat ? `, seat: ${r.seat}` : ""}`);
      }
      lines.push(`(Note: fallback uses events count only; total time requires report.studentStats.)`);
    } else {
      lines.push(`\nTop toilet students: not available right now.`);
    }

    return lines.join("\n");
  }

  // Other live DB answers need a running exam
  const exam = await findRunningExamForActor(actor);
  if (!exam) return "I couldn't find a running exam right now in the database.";

  const title = examTitle(exam);
  const scope = resolveRoomScope(userText, actor);
  const roomId = scope.scope === "room" ? scope.roomId : null;
  const where = roomId ? `Room ${prettyRoomId(roomId)}` : "All rooms";

  /* =========================
     ✅ Direct answers for TODAY presentation (Hebrew-friendly)
  ========================= */

  // 1) כמה סטודנטים לא הגיעו?
  if (isNotArrivedCountQuestionHeb(t)) {
    const c = roomId ? countAttendance(exam, roomId) : countAttendance(exam, null);
    return `Not arrived (${where}): ${c.not_arrived} / ${c.total}\n(Exam: ${title})`;
  }

  // 2) מה המבחן הנוכחי?
  if (isRunningExamQuestion(t)) {
    const tz = getTZ();
    const when = exam.startAt || exam.examDate;
    return `Running exam: ${title}\n- Date: ${formatDT(when, tz)}\n- Status: ${exam.status || "running"}`;
  }

  // 3) מי יצא לשירותים יותר מ X פעמים?
  if (isToiletMoreThanQuestionHeb(t)) {
    const threshold = parseHebMoreThanNumber(t, 3);
    const out = listToiletAboveThreshold(exam, roomId, threshold);

    if (!out.supported) {
      return `Toilet stats are not available right now.\n(Exam: ${title})`;
    }

    const rows = out.rows || [];
    if (!rows.length) {
      return `No students found with toilet exits > ${threshold} (${where}).\n(Exam: ${title})`;
    }

    const showN = Math.min(20, rows.length);
    const lines = rows.slice(0, showN).map((r, idx) => {
      const seat = r.seat ? `, seat: ${r.seat}` : "";
      return `${idx + 1}) ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, room: ${prettyRoomId(r.roomId)}${seat}`;
    });

    const note = out.source === "events" ? "\n(Note: fallback uses events count only; durations require report.studentStats.)" : "";
    return `Students with toilet exits > ${threshold} (${where}) [${out.source}]:\n${lines.join("\n")}${note}\n(Exam: ${title})`;
  }

  // 4) איזה סטודנט בחוץ עכשיו?
  if (isOutsideNowQuestionHeb(t) || (t.includes("outside") && t.includes("now"))) {
    const outside = listOutsideNow(exam, roomId);
    if (!outside.length) return `No students are outside right now (${where}).\n(Exam: ${title})`;

    const lines = outside.slice(0, 20).map((s, idx) => {
      const r = prettyRoomId(s?.roomId || s?.classroom || "");
      const seat = s?.seat ? `, seat: ${s.seat}` : "";
      const num = s?.studentNumber ? ` (${s.studentNumber})` : "";
      return `${idx + 1}) ${s?.name || "Student"}${num} — ${r}${seat}`;
    });

    const more = outside.length > 20 ? `\nShowing first 20 of ${outside.length}.` : "";
    return `Students outside now (${where}) — ${outside.length}:\n${lines.join("\n")}${more}\n(Exam: ${title})`;
  }

  /* =========================
     Existing English DB answers (kept)
  ========================= */

  // Time remaining
  if (
    t.includes("time remaining") ||
    (t.includes("time") && (t.includes("remaining") || t.includes("left"))) ||
    (t.includes("when") && t.includes("end"))
  ) {
    const end = exam?.endAt ? new Date(exam.endAt) : null;
    if (!end || Number.isNaN(end.getTime()))
      return `I can't calculate time remaining because endAt is missing.\n(Exam: ${title})`;
    const diff = end.getTime() - Date.now();
    if (diff <= 0) return `Exam time window ended.\n(Exam: ${title})`;
    return `Time remaining: ${msToHuman(diff)}\n(Exam: ${title})`;
  }

  // List NOT ARRIVED
  if (isListNotArrivedStudentsQuestion(t)) {
    const list = listStudentsByStatus(exam, "not_arrived", roomId);
    const total = list.length;
    if (!total) return `No "not arrived" students right now (${where}).\n(Exam: ${title})`;

    const showN = pickShowN(userText, 12, 5, 20);
    const slice = list.slice(0, showN);

    const lines = slice.map((s, idx) => {
      const r = prettyRoomId(s?.roomId || s?.classroom || "");
      const seat = s?.seat ? `, seat: ${s.seat}` : "";
      const num = s?.studentNumber ? ` (${s.studentNumber})` : "";
      return `${idx + 1}) ${s?.name || "Student"}${num} — ${r}${seat}`;
    });

    const more =
      total > slice.length ? `\nShowing first ${slice.length} of ${total}. (Ask "show ${Math.min(20, total)}" if needed.)` : "";
    return `Not arrived students (${where}) — ${total}:\n${lines.join("\n")}${more}\n(Exam: ${title})`;
  }

  // Top toilet students (English)
  if (isTopToiletStudentsQuestion(t)) {
    const topN = pickTopN(userText, 5);
    const topReport = buildTopToiletStudentsFromReport(exam, roomId, topN);

    if (topReport.supported && topReport.rows.length) {
      const lines = topReport.rows.map((r, idx) => {
        const mins = Math.round((r.totalToiletMs || 0) / 60000);
        return `${idx + 1}) ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, total: ${mins} min, room: ${prettyRoomId(r.roomId)}${r.seat ? `, seat: ${r.seat}` : ""}`;
      });
      return `Top ${topReport.rows.length} students by toilet exits (${where}) [report]:\n${lines.join("\n")}\n(Exam: ${title})`;
    }

    const topEvents = buildTopToiletStudentsFromEvents(exam, roomId, topN);
    if (topEvents.supported && topEvents.rows.length) {
      const lines = topEvents.rows.map((r, idx) => {
        return `${idx + 1}) ${r.name} (${r.studentNumber || "—"}) — exits: ${r.toiletCount}, room: ${prettyRoomId(r.roomId)}${r.seat ? `, seat: ${r.seat}` : ""}`;
      });
      return `Top ${topEvents.rows.length} students by toilet exits (${where}) [events fallback]:\n${lines.join("\n")}\n(Note: total time requires report.studentStats.)\n(Exam: ${title})`;
    }

    return `Top toilet students are not available right now.\n(Exam: ${title})`;
  }

  // Toilet stats
  if (isToiletQuestion(t) && (looksLikeCountQuestion(t) || t.includes("stats") || t.includes("summary"))) {
    const toilet = getToiletStatsFromReport(exam, roomId);
    if (!toilet.supported) return `Toilet stats are not available right now (report.studentStats is missing).\n(Exam: ${title})`;
    const mins = Math.round(toilet.totalToiletMs / 60000);
    return `Toilet stats (${where}):\n- Total exits: ${toilet.totalToiletCount}\n- Active now: ${toilet.activeNow}\n- Total time: ${mins} min\n(Exam: ${title})`;
  }

  // Attendance summary
  if (
    t.includes("attendance") ||
    t.includes("summary") ||
    t.includes("stats") ||
    looksLikeCountQuestion(t) ||
    t.includes("students") ||
    t.includes("student") ||
    t.includes("present") ||
    t.includes("absent") ||
    t.includes("not arrived") ||
    t.includes("temp") ||
    t.includes("finished") ||
    // Hebrew
    t.includes("נוכחות") ||
    t.includes("סטודנטים") ||
    t.includes("לא הגיע") ||
    t.includes("בחוץ")
  ) {
    const c = roomId ? countAttendance(exam, roomId) : countAttendance(exam, null);

    const wantsPresent = t.includes("present") || t.includes("נוכחים");
    const wantsNotArrived = t.includes("not arrived") || (t.includes("לא הגיע") || t.includes("לא הגיעו"));
    const wantsAbsent = t.includes("absent") || t.includes("נעדר");
    const wantsTempOut = t.includes("temp_out") || (t.includes("temp") && t.includes("out")) || t.includes("בחוץ");
    const wantsMoving = t.includes("moving");
    const wantsFinished = t.includes("finished");

    if (wantsPresent) return `Present (${where}): ${c.present} / ${c.total}\n(Exam: ${title})`;
    if (wantsNotArrived) return `Not arrived (${where}): ${c.not_arrived} / ${c.total}\n(Exam: ${title})`;
    if (wantsAbsent) return `Absent (${where}): ${c.absent} / ${c.total}\n(Exam: ${title})`;
    if (wantsTempOut) return `Temp out (${where}): ${c.temp_out} / ${c.total}\n(Exam: ${title})`;
    if (wantsMoving) return `Moving (${where}): ${c.moving} / ${c.total}\n(Exam: ${title})`;
    if (wantsFinished) return `Finished (${where}): ${c.finished} / ${c.total}\n(Exam: ${title})`;

    return `Attendance summary (${where}):\n- Total: ${c.total}\n- Present: ${c.present}\n- Not arrived: ${c.not_arrived}\n- Temp out: ${c.temp_out}\n- Absent: ${c.absent}\n- Moving: ${c.moving}\n- Finished: ${c.finished}\n(Exam: ${title})`;
  }

  // Transfers stats
  if (t.includes("transfer") || t.includes("העברה") || t.includes("העברות")) {
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

  // Events / incidents
  if (t.includes("events") || t.includes("incidents") || t.includes("אירועים") || t.includes("תקריות")) {
    const events = Array.isArray(exam.events) ? exam.events : [];
    const incidentsCount = events.filter((e) => norm(e?.type).includes("incident")).length;

    if (looksLikeCountQuestion(t)) {
      if (t.includes("incident") || t.includes("תקרית")) return `Incidents: ${incidentsCount}\n(Exam: ${title})`;
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

  // Messages
  if (t.includes("messages") || (t.includes("chat") && t.includes("exam")) || t.includes("הודעות")) {
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

    // 1) DB-required -> DB ONLY
    const t = norm(message);
    if (isDbRequiredQuestion(t)) {
      const ans = await dbDirectAnswer(message, actor);
      return res.json({ text: ans || "I don't have that information available in the database right now." });
    }

    // 2) FAQ (only for how/meaning UI guidance)
    const faq = faqAnswer(message);
    if (faq) return res.json({ text: faq });

    // 3) Non-DB question -> Gemini allowed
    const maxPerDay = Number(process.env.GEMINI_MAX_PER_DAY || 50);
    if (mem.geminiUsed >= maxPerDay) {
      res.json({
        text: "AI quota reached for today. I can still answer dashboard/database questions (counts, rooms, attendance, toilet stats, upcoming exams, reports, etc.).",
      });
      return;
    }

    // Gemini cache (non-DB only)
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
