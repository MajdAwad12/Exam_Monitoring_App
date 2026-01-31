// ===== file: server/src/controllers/exams.controller.js =====
import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import User from "../models/User.js";

/* =========================
   WS broadcaster (global)
   - server/index.js should set: globalThis.__wss = wss
========================= */
function wsBroadcast(payload) {
  const wss = globalThis.__wss;
  if (!wss) return;

  const msg = JSON.stringify(payload);
  wss.clients?.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

/* =========================
   Helpers
========================= */
function pushExamEvent(exam, ev) {
  // ✅ Events panel must store STUDENT ObjectId (studentId), not actor id
  const sid = ev?.studentId;
  const sidStr = sid ? String(sid) : "";

  const clean = {
    type: String(ev?.type || ""),
    timestamp: ev?.timestamp ? new Date(ev.timestamp) : new Date(),
    description: String(ev?.description || ""),
    severity: ["low", "medium", "high", "critical"].includes(ev?.severity) ? ev.severity : "low",
    classroom: String(ev?.classroom || ""),
    seat: String(ev?.seat || ""),
    studentId:
      sid && mongoose.Types.ObjectId.isValid(sidStr)
        ? new mongoose.Types.ObjectId(sidStr)
        : null,
  };

  exam.events = [...(exam.events || []), clean].slice(-200);
}

/**
 * ✅ Fix for "fast clicks override each other":
 * Always re-fetch latest doc inside retries, mutate, then save.
 */
async function updateExamWithRetry(examId, mutator, retries = 6) {
  for (let i = 0; i < retries; i++) {
    const exam = await Exam.findById(examId);
    if (!exam) return { exam: null, notFound: true };

    await mutator(exam);

    // toObject -> plain JS, safe for $set
    const next = exam.toObject({ depopulate: true, getters: false, virtuals: false });

    // IMPORTANT: set ALL fields (except _id and __v)
    const { _id, __v, ...setDoc } = next;

    const updated = await Exam.findOneAndUpdate(
      { _id: examId, __v: exam.__v },
      { $set: setDoc, $inc: { __v: 1 } },
      { new: true }
    );

    if (updated) return { exam: updated, notFound: false };

    await new Promise((r) => setTimeout(r, 25 * (i + 1)));
  }

  const err = new Error("CONCURRENT_UPDATE_RETRY_EXHAUSTED");
  err.statusCode = 409;
  throw err;
}



function toOut(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject({ getters: true }) : (doc || {});
  const _id = o._id || o.id;
  return { ...o, id: String(_id || "") };
}

function slugCourseId(courseName) {
  const s = String(courseName || "").trim();
  if (!s) return "";
  // Example: "Software Engineering" -> "SE" + stable hash-ish tail
  const letters = s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 6);
  const tail = Math.abs(
    Array.from(s).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)
  )
    .toString(36)
    .toUpperCase()
    .slice(0, 4);
  return `${letters}${tail}`;
}

function ensureReport(exam) {
  if (!exam.report) exam.report = {};
  if (!exam.report.summary) exam.report.summary = {};
  if (!Array.isArray(exam.report.timeline)) exam.report.timeline = [];

  if (!exam.report.studentFiles || typeof exam.report.studentFiles.get !== "function") {
    exam.report.studentFiles = new Map(Object.entries(exam.report.studentFiles || {}));
  }
  if (!exam.report.studentStats || typeof exam.report.studentStats.get !== "function") {
    exam.report.studentStats = new Map(Object.entries(exam.report.studentStats || {}));
  }
}

function getStudentStat(exam, studentIdKey) {
  ensureReport(exam);
  const key = String(studentIdKey);

  const existing = exam.report.studentStats.get(key);
  if (existing) return existing;

  const stat = {
    toiletCount: 0,
    totalToiletMs: 0,
    activeToilet: {
      leftAt: null,
      bySupervisorId: null,
      reason: "toilet",
    },
    incidentCount: 0,
    lastIncidentAt: null,
  };

  exam.report.studentStats.set(key, stat);
  return stat;
}

function getStudentFile(exam, studentIdKey) {
  ensureReport(exam);
  const key = String(studentIdKey);

  const existing = exam.report.studentFiles.get(key);
  if (existing) return existing;

  const file = {
    arrivedAt: null,
    finishedAt: null,

    toiletCount: 0,
    totalToiletMs: 0,
    activeToilet: {
      leftAt: null,
      bySupervisorId: null,
    },

    incidentCount: 0,
    violations: 0,

    notes: [],
    timeline: [],
  };

  exam.report.studentFiles.set(key, file);
  return file;
}

function syncToiletToStudentFile(sf, ss) {
  // ✅ keep studentFiles aligned with studentStats (studentStats is source of truth)
  sf.toiletCount = Number(ss?.toiletCount) || 0;
  sf.totalToiletMs = Number(ss?.totalToiletMs) || 0;

  const leftAt = ss?.activeToilet?.leftAt || null;
  const byId = ss?.activeToilet?.bySupervisorId || null;

  sf.activeToilet = {
    leftAt: leftAt ? new Date(leftAt) : null,
    bySupervisorId: byId ? byId : null,
  };
}

function pushExamTimeline(exam, payload) {
  ensureReport(exam);
  exam.report.timeline.push(payload);
  if (exam.report.timeline.length > 400) exam.report.timeline = exam.report.timeline.slice(-400);
}

function pushStudentTimeline(exam, studentIdKey, payload) {
  const file = getStudentFile(exam, studentIdKey);
  file.timeline.push(payload);
  if (file.timeline.length > 200) file.timeline = file.timeline.slice(-200);
}

function actorFromReq(req) {
  const u = req.user || {};
  const raw = u.id || u._id || null;
  const idStr = raw ? String(raw) : "";

  return {
    id: mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : null,
    name: u.fullName || u.username || "",
    role: u.role || "",
  };
}

function studentSnapshot(att) {
  return {
    id: att.studentId || null,
    name: att.name || "",
    code: att.studentNumber || "",
    seat: att.seat || "",
    classroom: att.classroom || "",
  };
}

function recalcSummary(exam) {
  ensureReport(exam);

  const att = exam.attendance || [];
  const statuses = att.map((x) => String(x.status || ""));

  const sum = exam.report.summary;

  sum.totalStudents = att.length;
  sum.present = statuses.filter((s) => s === "present").length;
  sum.absent = statuses.filter((s) => s === "absent").length;
  sum.temp_out = statuses.filter((s) => s === "temp_out").length;
  sum.not_arrived = statuses.filter((s) => s === "not_arrived").length;
  sum.finished = statuses.filter((s) => s === "finished").length;

  sum.incidents = Array.isArray(exam.events) ? exam.events.length : 0;
  sum.violations = att.reduce((acc, a) => acc + (Number(a.violations) || 0), 0);
  sum.transfers = statuses.filter((s) => s === "moving").length;
}

function findAttendance(exam, studentIdOrNumber) {
  const key = String(studentIdOrNumber || "").trim();
  if (!key) return null;

  const list = exam.attendance || [];

  let att = list.find((x) => String(x.studentId) === key);
  if (att) return att;

  att = list.find((x) => String(x.studentNumber || "") === key);
  if (att) return att;

  return null;
}

/* =========================
   Seating / capacity helpers
========================= */
function normalizeRoomId(v) {
  return String(v || "").trim();
}

function normalizeSeat(seat) {
  const s = String(seat || "").trim().toUpperCase();
  return s || "";
}

function roomDims(exam, roomId) {
  const rid = normalizeRoomId(roomId);
  const r = (exam?.classrooms || []).find((x) => normalizeRoomId(x?.id || x?.name) === rid);
  return { rows: Number(r?.rows || 5), cols: Number(r?.cols || 5) };
}

function seatLabel(r, c) {
  return `R${r}-C${c}`;
}

function isOccupyingStatus(status) {
  const s = String(status || "").toLowerCase();
  return ["not_arrived", "present", "temp_out", "moving", "finished"].includes(s);
}

function roomCapacity(exam, roomId) {
  const { rows, cols } = roomDims(exam, roomId);
  const capacity = Math.max(0, rows * cols);
  return { rows, cols, capacity };
}

function roomOccupiedCount(exam, roomId) {
  const rid = normalizeRoomId(roomId);
  let occupied = 0;

  for (const a of exam.attendance || []) {
    const ar = normalizeRoomId(a.classroom || a.roomId);
    if (ar !== rid) continue;
    if (!isOccupyingStatus(a.status)) continue;
    occupied += 1;
  }
  return occupied;
}

function ensureSeatsForRoom(exam, roomId) {
  const rid = normalizeRoomId(roomId);
  const { rows, cols, capacity } = roomCapacity(exam, rid);
  if (capacity <= 0) return;

  const list = exam.attendance || [];

  const used = new Set(
    list
      .filter((a) => normalizeRoomId(a.classroom || a.roomId) === rid)
      .filter((a) => isOccupyingStatus(a.status))
      .map((a) => normalizeSeat(a.seat))
      .filter(Boolean)
  );

  for (const a of list) {
    if (normalizeRoomId(a.classroom || a.roomId) !== rid) continue;
    if (!isOccupyingStatus(a.status)) continue;

    const seat = normalizeSeat(a.seat);
    if (seat) continue;

    let found = "";
    for (let r = 1; r <= rows && !found; r++) {
      for (let c = 1; c <= cols; c++) {
        const label = seatLabel(r, c);
        if (!used.has(label)) {
          found = label;
          break;
        }
      }
    }

    if (!found) break;
    a.seat = found;
    used.add(found);
  }
}

function hasFreeSeat(exam, roomId) {
  const { capacity } = roomCapacity(exam, roomId);
  if (capacity <= 0) return false;
  return roomOccupiedCount(exam, roomId) < capacity;
}

function findFirstFreeSeat(exam, roomId) {
  const rid = normalizeRoomId(roomId);
  const { rows, cols } = roomDims(exam, rid);

  const used = new Set(
    (exam.attendance || [])
      .filter((a) => normalizeRoomId(a.classroom || a.roomId) === rid)
      .filter((a) => isOccupyingStatus(a.status))
      .map((a) => normalizeSeat(a.seat))
      .filter(Boolean)
  );

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const label = seatLabel(r, c);
      if (!used.has(label)) return label;
    }
  }
  return "";
}

function isSeatTaken(exam, roomId, seat) {
  const rid = normalizeRoomId(roomId);
  const s = normalizeSeat(seat);
  if (!s) return false;

  return (exam.attendance || []).some(
    (a) =>
      normalizeRoomId(a.classroom || a.roomId) === rid &&
      isOccupyingStatus(a.status) &&
      normalizeSeat(a.seat) === s
  );
}

/* =========================
   Schedule conflict checks (time + classrooms)
========================= */
function roomIdsFromClassrooms(classrooms) {
  return (Array.isArray(classrooms) ? classrooms : [])
    .map((r) => String(r?.id || "").trim())
    .filter(Boolean);
}

function intersect(a, b) {
  const setB = new Set((b || []).map(String));
  return (a || []).map(String).filter((x) => setB.has(String(x)));
}

async function findScheduleConflicts({ startAt, endAt, roomIds, excludeExamId } = {}) {
  const s = startAt instanceof Date ? startAt : new Date(startAt || 0);
  const e = endAt instanceof Date ? endAt : new Date(endAt || 0);

  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e.getTime() <= s.getTime()) return [];
  if (!Array.isArray(roomIds) || roomIds.length === 0) return [];

  const query = {
    startAt: { $lt: e },
    endAt: { $gt: s },
    "classrooms.id": { $in: roomIds },
  };

  if (excludeExamId) {
    query._id = { $ne: excludeExamId };
  }

  const docs = await Exam.find(query)
    .select("_id courseName startAt endAt status classrooms")
    .lean();

  return (docs || []).map((x) => {
    const otherRooms = roomIdsFromClassrooms(x?.classrooms);
    return {
      examId: String(x?._id || ""),
      courseName: String(x?.courseName || ""),
      status: String(x?.status || ""),
      startAt: x?.startAt,
      endAt: x?.endAt,
      sharedRooms: intersect(roomIds, otherRooms),
    };
  });
}

/* =========================
   Exam window helpers
========================= */
function getExamWindowMs(exam) {
  const startMs = new Date(exam?.startAt || exam?.examDate || 0).getTime();
  const endMs = new Date(exam?.endAt || 0).getTime();
  return { startMs, endMs };
}

function examWindowState(exam) {
  const { startMs, endMs } = getExamWindowMs(exam);
  const nowMs = Date.now();

  const ok =
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    startMs > 0 &&
    endMs > 0 &&
    endMs > startMs;

  if (!ok) {
    return { ok: false, active: false, future: false, past: false, nowMs, startMs, endMs };
  }

  const active = nowMs >= startMs && nowMs <= endMs;
  const future = nowMs < startMs;
  const past = nowMs > endMs;
  return { ok: true, active, future, past, nowMs, startMs, endMs };
}

/* =========================
   Create helpers (names)
========================= */
async function buildLecturerObject(lecturerId) {
  const lid = String(lecturerId || "").trim();
  if (!lid) throw new Error("lecturerId is required");

  const lec = await User.findById(lid).select("fullName role").lean();
  if (!lec) throw new Error("Lecturer not found");
  if (lec.role !== "lecturer") throw new Error("Selected user is not a lecturer");

  return { id: lec._id, name: lec.fullName || "", roomIds: [] };
}

async function buildSupervisorsFromClassrooms(classrooms) {
  const rooms = Array.isArray(classrooms) ? classrooms : [];
  const pairs = rooms
    .map((r) => ({
      roomId: String(r?.id || r?.name || "").trim(),
      supId: r?.assignedSupervisorId ? String(r.assignedSupervisorId) : "",
      supNameHint: String(r?.assignedSupervisorName || "").trim(),
    }))
    .filter((x) => x.roomId && x.supId);

  if (!pairs.length) return [];

  const supUsers = await User.find({
    _id: { $in: pairs.map((x) => x.supId) },
    role: "supervisor",
  })
    .select("fullName")
    .lean();

  const byId = new Map(supUsers.map((u) => [String(u._id), u]));

  return pairs
    .filter((p) => mongoose.Types.ObjectId.isValid(p.supId))
    .map((p) => ({
      // Store as ObjectId (schema expects ObjectId)
      id: new mongoose.Types.ObjectId(p.supId),
      name: byId.get(String(p.supId))?.fullName || p.supNameHint || "",
      roomId: p.roomId,
    }));
}

/* =========================
   resolve student user
========================= */
async function resolveStudentUser(studentIdOrNumber) {
  const raw = String(studentIdOrNumber || "").trim();
  const sid = raw.replace(/\s+/g, "");
  if (!sid) return { user: null, studentNumber: "" };

  if (mongoose.Types.ObjectId.isValid(sid) && sid.length === 24) {
    const u = await User.findById(sid).select("_id fullName role studentId username").lean();
    return { user: u || null, studentNumber: u?.studentId || u?.username || "" };
  }

  const u =
    (await User.findOne({ studentId: sid }).select("_id fullName role studentId username").lean()) ||
    (await User.findOne({ username: sid }).select("_id fullName role studentId username").lean());

  return { user: u || null, studentNumber: sid };
}

/* =========================
   Controllers
========================= */

// ✅ GET /api/exams
export async function getExams(req, res) {
  try {
    const me = req.user || {};
    const role = String(me.role || "").toLowerCase();
    const myId = me._id || me.id;

    // ✅ Security: do NOT return all exams to lecturer/supervisor/student.
    // Build a DB-side filter to return only the exams the user is related to.
    const filter = {};

    if (role === "supervisor") {
      filter.supervisors = { $elemMatch: { id: myId } };
    } else if (role === "student") {
      filter.attendance = { $elemMatch: { studentId: myId } };
    } else if (role === "lecturer") {
      filter.$or = [
        { "lecturer.id": myId },
        { coLecturers: { $elemMatch: { id: myId } } },
      ];
    }
    // admin (and other roles) keep full access

    const exams = await Exam.find(filter)
      .select("_id courseName examMode status startAt endAt classrooms lecturer coLecturers supervisors report.summary createdAt updatedAt")
      .sort({ startAt: -1 })
      .lean();
    return res.json({ ok: true, exams: exams.map(toOut) });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to load exams" });
  }
}


// ✅ GET /api/exams/:examId
export async function getExamById(req, res) {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    return res.json({ ok: true, exam: toOut(exam) });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to load exam" });
  }
}

/**
 * ✅ PATCH /api/exams/:examId/attendance/:studentId
 * ✅ FIXED:
 * - toiletCount increments ONLY on transition into temp_out
 * - outStartedAt NEVER resets on repeated temp_out clicks
 * - studentStats is source of truth; studentFiles is synced
 * - Events panel studentId is always the student ObjectId
 */
export async function updateAttendance(req, res) {
  try {
    const { examId, studentId } = req.params;
    const patch = req.body || {};
    // 🔔 WS payload for immediate UI updates (Plan A)
    let attendanceWs = null;

    const result = await updateExamWithRetry(examId, async (exam) => {
      const att = findAttendance(exam, studentId);
      if (!att) {
        const err = new Error("Student not found in attendance");
        err.statusCode = 404;
        throw err;
      }

      ensureReport(exam);
      const now = new Date();
      const actor = actorFromReq(req);

      const prevStatus = String(att.status || "");
      const nextStatus = patch.status !== undefined ? String(patch.status) : null;

      const realStudentKey = String(att.studentId);
      const sf = getStudentFile(exam, realStudentKey);
      const ss = getStudentStat(exam, realStudentKey);
      const sSnap = studentSnapshot(att);

      /* ============ OPTIONAL: seat/classroom patch validation ============ */
      const wantsMove =
        patch.classroom !== undefined || patch.roomId !== undefined || patch.seat !== undefined;

      if (wantsMove) {
        const targetRoom = normalizeRoomId(
          patch.classroom ?? patch.roomId ?? att.classroom ?? att.roomId
        );
        const targetSeatRaw =
          patch.seat !== undefined ? String(patch.seat) : String(att.seat || "");
        const targetSeat = normalizeSeat(targetSeatRaw) || "AUTO";

        ensureSeatsForRoom(exam, targetRoom);

        if (
          !hasFreeSeat(exam, targetRoom) &&
          normalizeRoomId(att.classroom || att.roomId) !== targetRoom
        ) {
          const err = new Error("ROOM_FULL");
          err.statusCode = 409;
          throw err;
        }

        let finalSeat = "";
        if (targetSeat === "AUTO") {
          finalSeat = findFirstFreeSeat(exam, targetRoom);
        } else {
          if (!isSeatTaken(exam, targetRoom, targetSeat)) finalSeat = targetSeat;
          else finalSeat = findFirstFreeSeat(exam, targetRoom);
        }

        if (!finalSeat) {
          const err = new Error("ROOM_FULL");
          err.statusCode = 409;
          throw err;
        }

        att.classroom = targetRoom;
        att.roomId = targetRoom;
        att.seat = finalSeat;
        att.lastStatusAt = now;

        pushStudentTimeline(exam, realStudentKey, {
          at: now,
          kind: "SEAT_UPDATE",
          note: `Seat/Classroom updated to ${targetRoom} ${finalSeat}`,
          severity: "low",
          classroom: targetRoom,
          seat: finalSeat,
          meta: { by: actor },
        });

        pushExamTimeline(exam, {
          kind: "SEAT_UPDATE",
          at: now,
          roomId: targetRoom,
          actor,
          student: { ...sSnap, classroom: targetRoom, seat: finalSeat },
          details: { classroom: targetRoom, seat: finalSeat },
        });
      }

      /* ============ Notes ============ */
      if (typeof patch.addNote === "string" && patch.addNote.trim()) {
        const note = patch.addNote.trim();
        sf.notes.push(note);

        pushStudentTimeline(exam, realStudentKey, {
          at: now,
          kind: "NOTE",
          note,
          severity: "low",
          classroom: att.classroom || "",
          seat: att.seat || "",
          meta: { by: actor },
        });

        pushExamTimeline(exam, {
          kind: "NOTE",
          at: now,
          roomId: att.classroom || "",
          actor,
          student: sSnap,
          details: { note },
        });
      }

      /* ============ Violations ============ */
      if (typeof patch.addViolation === "number" && patch.addViolation !== 0) {
        const delta = patch.addViolation;

        att.violations = (Number(att.violations) || 0) + delta;
        sf.violations = (Number(sf.violations) || 0) + delta;

        pushStudentTimeline(exam, realStudentKey, {
          at: now,
          kind: "VIOLATION",
          note: `Violation +${delta}`,
          severity: "medium",
          classroom: att.classroom || "",
          seat: att.seat || "",
          meta: { by: actor, delta },
        });

        pushExamTimeline(exam, {
          kind: "VIOLATION",
          at: now,
          roomId: att.classroom || "",
          actor,
          student: sSnap,
          details: { delta, total: att.violations || 0 },
        });
      }

      /* ============ Status Changes ============ */
      if (nextStatus) {
        const allowed = new Set([
          "not_arrived",
          "present",
          "temp_out",
          "absent",
          "moving",
          "finished",
        ]);
        if (!allowed.has(nextStatus)) {
          const err = new Error("Invalid status");
          err.statusCode = 400;
          throw err;
        }

        if (prevStatus !== nextStatus) {
          // set status first
          att.status = nextStatus;

          // reset fields only on explicit reset statuses
          if (nextStatus === "not_arrived") {
            att.arrivedAt = null;
            att.outStartedAt = null;

            // also clear active toilet if someone force-resets
            ss.activeToilet = { leftAt: null, bySupervisorId: null, reason: "toilet" };
            syncToiletToStudentFile(sf, ss);
          }

          if (nextStatus === "absent") {
            att.outStartedAt = null;
            ss.activeToilet = { leftAt: null, bySupervisorId: null, reason: "toilet" };
            syncToiletToStudentFile(sf, ss);
          }

          att.lastStatusAt = now;

          // ensure seat if occupying
          if (isOccupyingStatus(nextStatus)) {
            const rid = normalizeRoomId(att.classroom || att.roomId);
            ensureSeatsForRoom(exam, rid);
            if (!att.seat || !String(att.seat).trim()) {
              const seat = findFirstFreeSeat(exam, rid);
              if (seat) att.seat = seat;
            }
          }

          // ARRIVED
          if (prevStatus === "not_arrived" && nextStatus === "present") {
            att.arrivedAt = att.arrivedAt || now;
            sf.arrivedAt = sf.arrivedAt || now;

            pushStudentTimeline(exam, realStudentKey, {
              at: now,
              kind: "ARRIVED",
              note: "Student arrived",
              severity: "low",
              classroom: att.classroom || "",
              seat: att.seat || "",
              meta: { by: actor },
            });

            pushExamTimeline(exam, {
              kind: "ARRIVED",
              at: now,
              roomId: att.classroom || "",
              actor,
              student: sSnap,
              details: {},
            });
          }

          // TOILET OUT (temp_out) — ✅ NO RESET, ✅ INCREMENT ONCE
          if (nextStatus === "temp_out" && prevStatus !== "temp_out") {
            // ✅ do not override existing outStartedAt
            const leftAtCandidate = patch?.outStartedAt ? new Date(patch.outStartedAt) : null;
            const leftAt = leftAtCandidate && !Number.isNaN(leftAtCandidate.getTime())
              ? leftAtCandidate
              : (att.outStartedAt ? new Date(att.outStartedAt) : now);
            att.outStartedAt = leftAt;

            // ✅ increment once on transition
            // IMPORTANT: use studentFile as the baseline if it was edited/reset manually in DB,
            // otherwise studentStats may overwrite the reset with an older cached value.
            const baseCount = Number(sf?.toiletCount ?? ss.toiletCount ?? 0) || 0;
            ss.toiletCount = baseCount + 1;
            ss.activeToilet = {
              leftAt,
              bySupervisorId: actor.id,
              reason: "toilet",
            };



            // keep file aligned
            syncToiletToStudentFile(sf, ss);

            pushStudentTimeline(exam, realStudentKey, {
              at: leftAt,
              kind: "TOILET_OUT",
              note: "Left to toilet",
              severity: "low",
              classroom: att.classroom || "",
              seat: att.seat || "",
              meta: { by: actor },
            });

            pushExamTimeline(exam, {
              kind: "TOILET_OUT",
              at: leftAt,
              roomId: att.classroom || "",
              actor,
              student: sSnap,
              details: { toiletCount: ss.toiletCount },
            });

            if (ss.toiletCount === 3) {
              pushExamTimeline(exam, {
                kind: "TOO_MANY_TOILET_EXITS",
                at: leftAt,
                roomId: att.classroom || "",
                actor,
                student: sSnap,
                details: { toiletCount: ss.toiletCount },
              });

              // ✅ Events panel: studentId must be the student
              pushExamEvent(exam, {
                type: "TOO_MANY_TOILET_EXITS",
                timestamp: leftAt,
                severity: "medium",
                description: `${att.name} (${att.studentNumber || "—"}) exceeded toilet exits (${ss.toiletCount}).`,
                classroom: att.classroom || "",
                seat: att.seat || "",
                studentNumber: String(att.studentNumber || ""),
                studentName: String(att.name || ""),
                studentId: att.studentId || null,
              });
            }
                        // 🔔 WS: immediate UI update (OUT)
            attendanceWs = {
              type: "ATTENDANCE_UPDATED",
              examId: String(exam._id),
              studentId: String(att.studentId),
              status: "temp_out",
              classroom: String(att.classroom || ""),
              seat: String(att.seat || ""),
              outStartedAt: att.outStartedAt ? new Date(att.outStartedAt).toISOString() : null,
              toiletCount: Number(ss.toiletCount) || 0,
              totalToiletMs: Number(ss.totalToiletMs) || 0,
              at: now.toISOString(),
            };

          }

          // TOILET BACK (temp_out -> present)
          if (prevStatus === "temp_out" && nextStatus === "present") {
            const leftAt = att.outStartedAt ? new Date(att.outStartedAt) : null;

            if (leftAt && !Number.isNaN(leftAt.getTime())) {
              const deltaMs = now.getTime() - leftAt.getTime();
              ss.totalToiletMs = (Number(ss.totalToiletMs) || 0) + Math.max(0, deltaMs);
            }

            // clear out state
            att.outStartedAt = null;
            ss.activeToilet = { leftAt: null, bySupervisorId: null, reason: "toilet" };

            // sync file
            syncToiletToStudentFile(sf, ss);

            pushStudentTimeline(exam, realStudentKey, {
              at: now,
              kind: "TOILET_BACK",
              note: "Returned from toilet",
              severity: "low",
              classroom: att.classroom || "",
              seat: att.seat || "",
              meta: { by: actor },
            });

            pushExamTimeline(exam, {
              kind: "TOILET_BACK",
              at: now,
              roomId: att.classroom || "",
              actor,
              student: sSnap,
              details: {},
            });
                        // 🔔 WS: immediate UI update (BACK)
            attendanceWs = {
              type: "ATTENDANCE_UPDATED",
              examId: String(exam._id),
              studentId: String(att.studentId),
              status: "present",
              classroom: String(att.classroom || ""),
              seat: String(att.seat || ""),
              outStartedAt: null,
              toiletCount: Number(ss.toiletCount) || 0,
              totalToiletMs: Number(ss.totalToiletMs) || 0,
              at: now.toISOString(),
            };

          }

          // FINISHED
          if (nextStatus === "finished") {
            att.finishedAt = att.finishedAt || now;
            sf.finishedAt = sf.finishedAt || now;

            pushStudentTimeline(exam, realStudentKey, {
              at: now,
              kind: "FINISHED",
              note: "Student finished exam",
              severity: "low",
              classroom: att.classroom || "",
              seat: att.seat || "",
              meta: { by: actor },
            });

            pushExamTimeline(exam, {
              kind: "FINISHED",
              at: now,
              roomId: att.classroom || "",
              actor,
              student: sSnap,
              details: {},
            });
          }

          const isSpecial =
            (prevStatus === "not_arrived" && nextStatus === "present") ||
            (prevStatus !== "temp_out" && nextStatus === "temp_out") ||
            (prevStatus === "temp_out" && nextStatus === "present") ||
            nextStatus === "finished";

          if (!isSpecial) {
            pushStudentTimeline(exam, realStudentKey, {
              at: now,
              kind: "STATUS",
              note: `Status: ${prevStatus} → ${nextStatus}`,
              severity: "low",
              classroom: att.classroom || "",
              seat: att.seat || "",
              meta: { by: actor },
            });

            pushExamTimeline(exam, {
              kind: "STATUS",
              at: now,
              roomId: att.classroom || "",
              actor,
              student: sSnap,
              details: { from: prevStatus, to: nextStatus },
            });
          }
        }
      }

      recalcSummary(exam);
    });

    if (result.notFound) return res.status(404).json({ message: "Exam not found" });

    const savedExam = result.exam;
    if (attendanceWs) wsBroadcast(attendanceWs);
    wsBroadcast({
      type: "EXAM_UPDATED",
      examId: String(savedExam._id),
      at: new Date().toISOString(),
      reason: "attendance_updated",
    });

    return res.json({ ok: true, exam: toOut(savedExam) });
  } catch (e) {
    const status = Number(e?.statusCode) || 500;
    const msg = e?.message || "Failed to update attendance";
    return res.status(status).json({ message: msg });
  }
}

/* =========================
   Add/Delete Students
========================= */

// ✅ POST /api/exams/:examId/students
export async function addStudentToExam(req, res) {
  try {
    const me = req.user || {};
    const role = String(me.role || "");
    if (role !== "admin" && role !== "lecturer") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { examId } = req.params;
    const body = req.body || {};

    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const studentIdInput = String(body.studentId || "").trim();
    const roomId = String(body.roomId || "").trim();

    if (!firstName || !lastName || !studentIdInput || !roomId) {
      return res.status(400).json({ message: "Missing fields." });
    }

    const { user: studentUser, studentNumber } = await resolveStudentUser(studentIdInput);
    if (!studentUser?._id) {
      return res.status(404).json({
        message: "Student user not found (check studentId/studentNumber in DB)",
      });
    }

    const now = new Date();
    const actor = actorFromReq(req);
    const fullName = `${firstName} ${lastName}`.trim();

    const result = await updateExamWithRetry(examId, async (exam) => {
      const roomExists = (exam.classrooms || []).some(
        (r) => String(r?.id || r?.name || "").trim() === roomId
      );
      if (!roomExists) {
        const err = new Error("Invalid roomId");
        err.statusCode = 400;
        throw err;
      }

      const exists =
        (exam.attendance || []).some((a) => String(a.studentId) === String(studentUser._id)) ||
        (exam.attendance || []).some(
          (a) => String(a.studentNumber || "") === String(studentNumber)
        );
      if (exists) {
        const err = new Error("Student already exists in this exam");
        err.statusCode = 409;
        throw err;
      }

      ensureSeatsForRoom(exam, roomId);
      if (!hasFreeSeat(exam, roomId)) {
        const err = new Error("ROOM_FULL");
        err.statusCode = 409;
        throw err;
      }

      const seat = findFirstFreeSeat(exam, roomId);
      if (!seat) {
        const err = new Error("ROOM_FULL");
        err.statusCode = 409;
        throw err;
      }

      exam.attendance = exam.attendance || [];
      exam.attendance.push({
        studentId: studentUser._id,
        name: fullName,
        studentNumber: studentNumber,
        classroom: roomId,
        roomId: roomId,
        seat,
        status: "not_arrived",
        arrivedAt: null,
        outStartedAt: null,
        finishedAt: null,
        lastStatusAt: now,
        violations: 0,
      });

      ensureReport(exam);
      getStudentFile(exam, String(studentUser._id));
      getStudentStat(exam, String(studentUser._id));

      pushStudentTimeline(exam, String(studentUser._id), {
        at: now,
        kind: "STUDENT_ADDED",
        note: `Student added to exam (${roomId} ${seat})`,
        severity: "low",
        classroom: roomId,
        seat,
        meta: { by: actor },
      });

      pushExamTimeline(exam, {
        kind: "STUDENT_ADDED",
        at: now,
        roomId,
        actor,
        student: {
          id: studentUser._id,
          name: fullName,
          code: studentNumber,
          classroom: roomId,
          seat,
        },
        details: { roomId, seat },
      });

      recalcSummary(exam);
    });

    if (result.notFound) return res.status(404).json({ message: "Exam not found" });

    wsBroadcast({
      type: "EXAM_UPDATED",
      examId: String(result.exam._id),
      at: new Date().toISOString(),
      reason: "student_added",
    });

    return res.json({ ok: true, message: "Student added.", studentNumber });
  } catch (e) {
    const status = Number(e?.statusCode) || 500;
    return res.status(status).json({ message: e.message || "Failed to add student" });
  }
}

// ✅ DELETE /api/exams/:examId/students/:studentId
export async function deleteStudentFromExam(req, res) {
  try {
    const me = req.user || {};
    const role = String(me.role || "");
    if (role !== "admin" && role !== "lecturer") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { examId, studentId } = req.params;
    const input = String(studentId || "").trim();
    const sid = input.replace(/\s+/g, "");
    if (!sid) return res.status(400).json({ message: "Student ID is required" });

    const { user: studentUser, studentNumber } = await resolveStudentUser(sid);
    const userIdStr = studentUser?._id ? String(studentUser._id) : null;
    const numberKey = String(studentNumber || sid);

    const now = new Date();
    const actor = actorFromReq(req);

    const result = await updateExamWithRetry(examId, async (exam) => {
      const before = (exam.attendance || []).length;

      const removed = (exam.attendance || []).find((a) => {
        if (userIdStr && String(a.studentId) === userIdStr) return true;
        if (String(a.studentNumber || "") === numberKey) return true;
        return false;
      });

      exam.attendance = (exam.attendance || []).filter((a) => {
        if (userIdStr && String(a.studentId) === userIdStr) return false;
        if (String(a.studentNumber || "") === numberKey) return false;
        return true;
      });

      if (exam.attendance.length === before) {
        const err = new Error("Student not found in this exam");
        err.statusCode = 404;
        throw err;
      }

      ensureReport(exam);

      const reportKey = userIdStr || (removed ? String(removed.studentId) : null);
      if (reportKey && exam.report?.studentFiles?.delete) {
        exam.report.studentFiles.delete(String(reportKey));
      }
      if (reportKey && exam.report?.studentStats?.delete) {
        exam.report.studentStats.delete(String(reportKey));
      }

      pushExamTimeline(exam, {
        kind: "STUDENT_DELETED",
        at: now,
        roomId: removed?.classroom || removed?.roomId || null,
        actor,
        student: removed
          ? studentSnapshot(removed)
          : { id: reportKey || null, name: "", code: numberKey, classroom: "", seat: "" },
        details: {},
      });

      recalcSummary(exam);
    });

    if (result.notFound) return res.status(404).json({ message: "Exam not found" });

    wsBroadcast({
      type: "EXAM_UPDATED",
      examId: String(result.exam._id),
      at: new Date().toISOString(),
      reason: "student_deleted",
    });

    return res.json({ ok: true, message: "Student deleted.", studentNumber: numberKey });
  } catch (e) {
    const status = Number(e?.statusCode) || 500;
    return res.status(status).json({ message: e.message || "Failed to delete student" });
  }
}

/* ---- START / END EXAM ---- */
export async function startExam(req, res) {
  try {
    const { examId } = req.params;
    const force = String(req.query.force || "") === "1" || Boolean(req.body?.force);

    if (!force) {
      const now = new Date();
      const actor = actorFromReq(req);

      const result = await updateExamWithRetry(examId, async (exam) => {
        ensureReport(exam);

        const ws = examWindowState(exam);
        if (!ws.ok) {
          const err = new Error("Invalid exam time window");
          err.statusCode = 400;
          throw err;
        }
        if (!ws.active) {
          const err = new Error(ws.future ? "EXAM_NOT_STARTED_YET" : "EXAM_TIME_WINDOW_ENDED");
          err.statusCode = 400;
          throw err;
        }

        if (exam.status !== "running") exam.status = "running";

        for (const c of exam.classrooms || []) {
          const rid = String(c?.id || c?.name || "").trim();
          if (rid) ensureSeatsForRoom(exam, rid);
        }

        pushExamTimeline(exam, {
          kind: "EXAM_STARTED",
          at: now,
          roomId: null,
          actor,
          student: null,
          details: { startAt: exam.startAt, endAt: exam.endAt, force: false },
        });

        // ✅ Also push to events panel (dashboard)
        pushExamEvent(exam, {
          type: "EXAM_STARTED",
          timestamp: now,
          severity: "low",
          description: `Exam started${force ? " (forced)" : ""}.`,
          classroom: "",
          seat: "",
          studentId: null,
        });

        recalcSummary(exam);
      });

      if (result.notFound) return res.status(404).json({ message: "Exam not found" });

      wsBroadcast({
        type: "EXAM_STARTED",
        examId: String(result.exam._id),
        at: new Date().toISOString(),
      });

      return res.json({ ok: true, exam: toOut(result.exam) });
    }

    // force start
    const now = new Date();
    const actor = actorFromReq(req);
    const threeHoursMs = 3 * 60 * 60 * 1000;

    const result = await updateExamWithRetry(examId, async (exam) => {
      ensureReport(exam);

      exam.startAt = now;
      exam.endAt = new Date(now.getTime() + threeHoursMs);
      exam.status = "running";

      pushExamTimeline(exam, {
        kind: "EXAM_STARTED",
        at: now,
        roomId: null,
        actor,
        student: null,
        details: { startAt: exam.startAt, endAt: exam.endAt, durationHours: 3, force: true },
      });

        // ✅ Also push to events panel (dashboard)
        pushExamEvent(exam, {
          type: "EXAM_STARTED",
          timestamp: now,
          severity: "low",
          description: `Exam started${force ? " (forced)" : ""}.`,
          classroom: "",
          seat: "",
          studentId: null,
        });

      for (const c of exam.classrooms || []) {
        const rid = String(c?.id || c?.name || "").trim();
        if (rid) ensureSeatsForRoom(exam, rid);
      }

      recalcSummary(exam);
    });

    if (result.notFound) return res.status(404).json({ message: "Exam not found" });

    wsBroadcast({
      type: "EXAM_STARTED",
      examId: String(result.exam._id),
      at: new Date().toISOString(),
    });

    return res.json({ ok: true, exam: toOut(result.exam) });
  } catch (e) {
    const status = Number(e?.statusCode) || 500;
    return res.status(status).json({ message: e.message || "Failed to start exam" });
  }
}

export async function endExam(req, res) {
  try {
    const { examId } = req.params;
    const force = String(req.query.force || "") === "1" || Boolean(req.body?.force);

    const now = new Date();
    const actor = actorFromReq(req);

    const result = await updateExamWithRetry(examId, async (exam) => {
      ensureReport(exam);

      const ws = examWindowState(exam);
      if (!ws.ok) {
        const err = new Error("Invalid exam time window");
        err.statusCode = 400;
        throw err;
      }
      if (!ws.active) {
        const isAdmin = String(actor?.role || "").toLowerCase() === "admin";
        if (!isAdmin) {
          const err = new Error(ws.future ? "EXAM_NOT_STARTED_YET" : "EXAM_TIME_WINDOW_ENDED");
          err.statusCode = 400;
          throw err;
        }
        // ✅ Admin can end outside the window when using force=1 (and also if the window already passed)
        // (client may send force=1; we still allow admin even without it)
      }

      exam.status = "ended";
      exam.markModified("status");

      pushExamTimeline(exam, {
        kind: "EXAM_ENDED",
        at: now,
        roomId: null,
        actor,
        student: null,
        details: { endedAt: now },
      });

      // ✅ Also push to events panel (dashboard)
      pushExamEvent(exam, {
        type: "EXAM_ENDED",
        timestamp: now,
        severity: "low",
        description: "Exam ended.",
        classroom: "",
        seat: "",
        studentId: null,
      });

      recalcSummary(exam);
    });

    if (result.notFound) return res.status(404).json({ message: "Exam not found" });

    wsBroadcast({
      type: "EXAM_ENDED",
      examId: String(result.exam._id),
      at: new Date().toISOString(),
    });

    return res.json({ ok: true, exam: toOut(result.exam) });
  } catch (e) {
    const status = Number(e?.statusCode) || 500;
    return res.status(status).json({ message: e.message || "Failed to end exam" });
  }
}

// ✅ POST /api/exams
export async function createExam(req, res) {
  try {
    const me = req.user || {};
    if (String(me.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const body = req.body || {};

    const courseId = String(body.courseId || "").trim();
    const courseName = String(body.courseName || "").trim();
    const examMode = String(body.examMode || "onsite").trim();
    const startAt = new Date(body.startAt || body.examDate || 0);
    const endAt = new Date(body.endAt || 0);

    if (!courseName) return res.status(400).json({ message: "Course name is required." });
    if (Number.isNaN(startAt.getTime()))
      return res.status(400).json({ message: "Invalid startAt." });
    if (Number.isNaN(endAt.getTime()))
      return res.status(400).json({ message: "Invalid endAt." });
    if (endAt.getTime() <= startAt.getTime()) {
      return res.status(400).json({ message: "End time must be after Start time." });
    }

    const classrooms = Array.isArray(body.classrooms) ? body.classrooms : [];
    const cleanRooms = classrooms
      .map((r) => ({
        id: String(r?.id || r?.name || "").trim(),
        name: String(r?.name || r?.id || "").trim(),
        rows: Number(r?.rows || 5),
        cols: Number(r?.cols || 5),
        assignedSupervisorId: r?.assignedSupervisorId ?? null,
        assignedSupervisorName: r?.assignedSupervisorName ?? "",
      }))
      .filter((r) => r.id);
      if (!cleanRooms.length) {
      return res.status(400).json({ message: "At least one classroom is required." });
    }

    

    // ✅ Prevent time+classroom overlaps (same classroom(s) + overlapping time window)
    const roomIds = roomIdsFromClassrooms(cleanRooms);
    const conflicts = await findScheduleConflicts({ startAt, endAt, roomIds });
    if (conflicts.length) {
      return res.status(409).json({
        message: "Schedule conflict: another exam overlaps in time and shares at least one classroom.",
        conflicts,
      });
    }
    const lecturerId = body.lecturerId ? String(body.lecturerId) : "";
    if (!lecturerId) return res.status(400).json({ message: "lecturerId is required" });

    let lecturerObj;
    try {
      lecturerObj = await buildLecturerObject(lecturerId);
    } catch (err) {
      return res.status(400).json({ message: err.message || "Invalid lecturerId" });
    }

    const supervisorsObj = await buildSupervisorsFromClassrooms(cleanRooms);

    let coLecturersObj = [];
    if (Array.isArray(body.coLecturers)) {
      const ids = body.coLecturers.map((x) => String(x?.id || x)).filter(Boolean);
      if (ids.length) {
        const lecUsers = await User.find({ _id: { $in: ids }, role: "lecturer" })
          .select("fullName")
          .lean();
        const byId = new Map(lecUsers.map((u) => [String(u._id), u]));
        coLecturersObj = body.coLecturers
          .map((x) => {
            const rawId = String(x?.id || x || "").trim();
            return {
              id: mongoose.Types.ObjectId.isValid(rawId) ? new mongoose.Types.ObjectId(rawId) : null,
              name: byId.get(rawId)?.fullName || String(x?.name || ""),
              roomIds: Array.isArray(x?.roomIds) ? x.roomIds : [],
            };
          })
          .filter((x) => x.id);
      }
    }

    const resolvedCourseId = courseId || slugCourseId(courseName);

    const exam = await Exam.create({
      courseId: resolvedCourseId,
      courseName,
      examMode,
      examDate: startAt,
      startAt,
      endAt,
      status: "scheduled",

      lecturer: lecturerObj,
      coLecturers: coLecturersObj,

      supervisors: supervisorsObj,
      classrooms: cleanRooms,

      attendance: [],
      events: [],
      messages: [],
      note: "",
      report: { summary: {}, timeline: [], studentFiles: {}, studentStats: {} },
    }); 

    return res.json({ ok: true, exam: toOut(exam) });
  } catch (e) {
    return res.status(500).json({ message: e.message || "Failed to create exam" });
  } 
}
