// server/src/controllers/dashboard.controller.js
import Exam from "../models/Exam.js";
import User from "../models/User.js";
import TransferRequest from "../models/TransferRequest.js";

/* =========================
   Save helper: retry on VersionError
========================= */
async function saveWithRetry(doc, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await doc.save();
    } catch (err) {
      const isVersionError =
        err?.name === "VersionError" ||
        String(err?.message || "").includes("VersionError");

      if (!isVersionError || i === retries - 1) throw err;

      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }
}

/* =========================
   helpers
========================= */
function isRecipient(msg, user) {
  const uid = String(user._id);
  const toUserIds = (msg.toUserIds || []).map(String);
  const toRoles = msg.toRoles || [];
  if (toUserIds.includes(uid)) return true;
  if (toRoles.includes(user.role)) return true;
  return false;
}

async function findRunningExamForUser(user, { examId, lean = false, select = null } = {}) {
  const role = String(user?.role || "").toLowerCase();
  const requestedId = examId ? String(examId) : "";

  const applyExamQuery = (q) => {
    if (select) q = q.select(select);
    if (lean) q = q.lean();
    return q;
  };

  // Admin can pick a specific RUNNING exam
  if (role === "admin") {
    if (requestedId) {
      return applyExamQuery(Exam.findOne({ _id: requestedId, status: "running" }).sort({ startAt: 1 }));
    }
    return applyExamQuery(Exam.findOne({ status: "running" }).sort({ startAt: 1 }));
  }

  const examQuery = { status: "running" };

  if (requestedId) {
    examQuery._id = requestedId;
  }

  if (role === "lecturer") {
    examQuery["$or"] = [{ "lecturer.id": user._id }, { "coLecturers.id": user._id }];
  }

  if (role === "supervisor") {
    // Support BOTH assignment styles:
    // 1) exam.supervisors[].id
    // 2) exam.classrooms[].assignedSupervisorId
    examQuery["$or"] = [
      { "supervisors.id": user._id },
      { "classrooms.assignedSupervisorId": user._id },
    ];
  }

return applyExamQuery(Exam.findOne(examQuery).sort({ startAt: 1 }));
}

function normalizeRoomId(v) {
  return String(v || "").trim();
}

// ✅ IMPORTANT: attendance room can be in classroom OR roomId
function attRoom(a) {
  return normalizeRoomId(a?.classroom || a?.roomId);
}

/**
 * deriveSupervisorRoomId
 */
function deriveSupervisorRoomId({ user, exam }) {
  const fromUser = normalizeRoomId(user?.assignedRoomId);
  if (fromUser) return fromUser;

  const sup = (exam?.supervisors || []).find((s) => String(s?.id) === String(user?._id));
  const fromExamSupervisor = normalizeRoomId(sup?.roomId);
  if (fromExamSupervisor) return fromExamSupervisor;

  const cls = (exam?.classrooms || []).find(
    (c) => String(c?.assignedSupervisorId) === String(user?._id)
  );
  const fromClassrooms = normalizeRoomId(cls?.id || cls?.roomId || cls?.name);
  if (fromClassrooms) return fromClassrooms;

  return "";
}

function safeLower(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

function pickClassroom(exam, roomId) {
  const rid = normalizeRoomId(roomId);
  const list = exam?.classrooms || [];
  return list.find((c) => normalizeRoomId(c?.id || c?.roomId || c?.name) === rid) || null;
}

function getRoomCapacity(classroom) {
  if (!classroom) return 0;

  // common options:
  if (Number.isFinite(classroom.capacity)) return Number(classroom.capacity);

  const rows = Number(classroom.rows);
  const cols = Number(classroom.cols);
  if (Number.isFinite(rows) && Number.isFinite(cols) && rows > 0 && cols > 0) return rows * cols;

  if (Array.isArray(classroom.seats) && classroom.seats.length > 0) return classroom.seats.length;

  return 0; // unknown -> treat as "no capacity info"
}

/** ✅ normalize seat ids so R1C1 == R1-C1 */
function normalizeSeat(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, ""); // R1-C1 -> R1C1
}

function buildSeatCandidates(classroom) {
  // 1) explicit seats array
  if (Array.isArray(classroom?.seats) && classroom.seats.length) {
    return classroom.seats.map((s) => String(s));
  }

  // 2) rows/cols -> create seat ids: R1-C1 (✅ consistent with the rest of system)
  const rows = Number(classroom?.rows);
  const cols = Number(classroom?.cols);
  if (Number.isFinite(rows) && Number.isFinite(cols) && rows > 0 && cols > 0) {
    const seats = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) seats.push(`R${r}-C${c}`);
    }
    return seats;
  }

  // 3) no candidates => we treat as "no seat map"
  return [];
}

function firstFreeSeat({ classroom, attendanceInRoom }) {
  const used = new Set(
    (attendanceInRoom || [])
      .map((a) => normalizeSeat(a?.seat))
      .filter(Boolean)
  );

  const candidates = buildSeatCandidates(classroom);

  for (const s of candidates) {
    if (!used.has(normalizeSeat(s))) return s;
  }

  // ✅ IMPORTANT: no fallback "S{n}" to avoid collisions/overwrites
  return "";
}

async function makeUniqueUsername(base) {
  let username = safeLower(base);
  if (!username) username = `student.${Date.now()}`;

  // ensure unique
  let tries = 0;
  while (tries < 20) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ username }).lean();
    if (!exists) return username;
    tries++;
    username = `${username}${Math.floor(Math.random() * 9) + 1}`;
  }
  return `${username}.${Date.now()}`;
}

function mustBeAdminOrLecturer(req, res) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin" && role !== "lecturer") {
    res.status(403).json({ message: "FORBIDDEN_ADMIN_OR_LECTURER_ONLY" });
    return false;
  }
  return true;
}

/**
 * ✅ If lecturer uses examId, make sure exam belongs to them (lecturer or coLecturer)
 */
function ensureLecturerOwnsExam(req, res, exam) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "lecturer") return true;

  const uid = String(req.user?._id);

  const isOwner =
    String(exam?.lecturer?.id || "") === uid ||
    (exam?.coLecturers || []).some((c) => String(c?.id || "") === uid);

  if (!isOwner) {
    res.status(403).json({ message: "FORBIDDEN_EXAM_NOT_OWNED" });
    return false;
  }
  return true;
}

/* =========================
   Ensure report maps exist AND are Maps
========================= */
function ensureReportMaps(exam) {
  if (!exam.report) exam.report = {};
  if (!exam.report.summary) exam.report.summary = {};

  const sf = exam.report.studentFiles;
  const sfIsMap = sf && typeof sf.get === "function" && typeof sf.set === "function";
  if (!sfIsMap) exam.report.studentFiles = new Map(Object.entries(sf || {}));

  const ss = exam.report.studentStats;
  const ssIsMap = ss && typeof ss.get === "function" && typeof ss.set === "function";
  if (!ssIsMap) exam.report.studentStats = new Map(Object.entries(ss || {}));
}

/* =========================
   clock + snapshot (existing)
========================= */
export async function getClock(req, res) {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const requestedExamId = req.query?.examId ? String(req.query.examId) : "";

    const exam = await findRunningExamForUser(user, { examId: requestedExamId });
    return res.json({
      simNow: new Date().toISOString(),
      simExamId: exam ? String(exam._id) : null,
      speed: 1,
    });
  } catch (err) {
    console.error("getClock error", err);
    return res.status(500).json({ message: "clock_error" });
  }
}

export async function getDashboardSnapshot(req, res) {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const requestedExamId = req.query?.examId ? String(req.query.examId) : "";

    const exam = await findRunningExamForUser(user, { examId: requestedExamId });

    if (!exam) {
      return res.json({
        me: {
          id: String(user._id),
          role: user.role,
          username: user.username,
          fullName: user.fullName,
          assignedRoomId: user.assignedRoomId || null,
        },
        exam: null,
        attendance: [],
        transfers: [],
        stats: {},
        alerts: [],
        inbox: { unread: 0, recent: [] },
        events: [],
        reportStudentStats: {},
        reportStudentFiles: {},
      });
    }

    const role = String(user.role || "").toLowerCase();
    const isSupervisorRole = role === "supervisor";
    const isLecturerLike = role === "lecturer" || role === "admin";

    const myRoomId = isSupervisorRole ? deriveSupervisorRoomId({ user, exam }) : "";

    // ---------------- Attendance visibility ----------------
    const allAttendance = exam.attendance || [];

    const visibleAttendance =
      isSupervisorRole && myRoomId
        ? allAttendance.filter((a) => attRoom(a) === normalizeRoomId(myRoomId))
        : allAttendance;

    // ---------------- studentStats map -> plain object ----------------
    const reportStatsMap = exam.report?.studentStats || new Map();
    const studentStats = {};
    if (reportStatsMap?.forEach) {
      reportStatsMap.forEach((val, key) => {
        studentStats[String(key)] = val;
      });
    } else if (reportStatsMap && typeof reportStatsMap === "object") {
      Object.assign(studentStats, reportStatsMap);
    }

    // ---------------- studentFiles map -> plain object ----------------
    const reportFilesMap = exam.report?.studentFiles || new Map();
    const studentFiles = {};
    if (reportFilesMap?.forEach) {
      reportFilesMap.forEach((val, key) => {
        studentFiles[String(key)] = val;
      });
    } else if (reportFilesMap && typeof reportFilesMap === "object") {
      Object.assign(studentFiles, reportFilesMap);
    }

    // ---------------- Stats ----------------
    const stats = {
      totalStudents: visibleAttendance.length,
      present: visibleAttendance.filter((a) => a.status === "present").length,
      tempOut: visibleAttendance.filter((a) => a.status === "temp_out").length,
      absent: visibleAttendance.filter((a) => a.status === "absent").length,
      moving: visibleAttendance.filter((a) => a.status === "moving").length,
      finished: visibleAttendance.filter((a) => a.status === "finished").length,
      notArrived: visibleAttendance.filter((a) => a.status === "not_arrived").length,
      violations: visibleAttendance.reduce((sum, a) => sum + (a.violations || 0), 0),
    };

    const alerts = [];
    const now = Date.now();

    // ---------------- Toilet too long ----------------
    const TOILET_ALERT_MS = 10 * 60 * 1000;
    for (const a of visibleAttendance) {
      if (a.status !== "temp_out") continue;

      const key = String(a.studentId);
      const st = studentFiles[key];

      const leftAt = st?.activeToilet?.leftAt ? new Date(st.activeToilet.leftAt).getTime() : null;
      const startedAt = a.outStartedAt ? new Date(a.outStartedAt).getTime() : null;

      const base = leftAt || startedAt;
      if (!base) continue;

      const elapsedMs = Math.max(0, now - base);
      if (elapsedMs >= TOILET_ALERT_MS) {
        alerts.push({
          type: "TOILET_LONG",
          severity: "medium",
          at: new Date(base).toISOString(),
          roomId: attRoom(a),
          studentId: key,
          studentCode: a.studentNumber || "",
          name: a.name || "",
          classroom: attRoom(a),
          seat: a.seat || "",
          elapsedMs,
        });
      }
    }

    // ---------------- Messages inbox ----------------
    const msgItems = (exam.messages || [])
      .filter((m) => isRecipient(m, user) || String(m.from?.id) === String(user._id))
      .slice(-30);

    const unread = msgItems.filter((m) => !(m.readBy || []).map(String).includes(String(user._id)))
      .length;
    const recentMessages = msgItems.slice(-10).reverse();

    for (const m of msgItems.slice(-20)) {
      const isUnread = !(m.readBy || []).map(String).includes(String(user._id));
      if (!isUnread) continue;
      if (!isRecipient(m, user)) continue;

      if (isSupervisorRole && myRoomId && m.roomId && normalizeRoomId(m.roomId) !== normalizeRoomId(myRoomId))
        continue;

      alerts.push({
        type: "MESSAGE",
        severity: "low",
        at: m.at || new Date().toISOString(),
        from: m.from || {},
        roomId: m.roomId || "",
        text: m.text || "",
      });
    }

    // ---------------- Transfers ----------------
    const allTransfers = await TransferRequest.find({ examId: exam._id })
      .sort({ updatedAt: -1 })
      .limit(80)
      .lean();

    const transfers =
      isSupervisorRole && myRoomId
        ? allTransfers.filter(
            (t) =>
              normalizeRoomId(t.toClassroom) === normalizeRoomId(myRoomId) ||
              normalizeRoomId(t.fromClassroom) === normalizeRoomId(myRoomId)
          )
        : allTransfers;

    const pending = allTransfers.filter((t) => t.status === "pending");

    for (const t of pending) {
      if (isSupervisorRole && myRoomId && normalizeRoomId(t.toClassroom) === normalizeRoomId(myRoomId)) {
        alerts.push({
          type: "TRANSFER_PENDING_TO_YOU",
          severity: "medium",
          at: t.createdAt,
          roomId: t.toClassroom,
          studentId: String(t.studentId),
          studentCode: t.studentCode || "",
          studentName: t.studentName || "",
          fromClassroom: t.fromClassroom,
          toClassroom: t.toClassroom,
          requestId: String(t._id),
        });
      }

      if (isLecturerLike) {
        alerts.push({
          type: "TRANSFER_PENDING_IN_EXAM",
          severity: "low",
          at: t.createdAt,
          roomId: t.toClassroom,
          studentId: String(t.studentId),
          studentCode: t.studentCode || "",
          studentName: t.studentName || "",
          fromClassroom: t.fromClassroom,
          toClassroom: t.toClassroom,
          requestId: String(t._id),
        });
      }
    }

    // ✅ NEW: ROOM FULL alerts (pending stays pending)
    for (const t of pending) {
      if (String(t.lastError || "") !== "ROOM_FULL") continue;

      const at = t.lastErrorAt || t.updatedAt || t.createdAt;

      // notify target supervisor
      if (isSupervisorRole && myRoomId && normalizeRoomId(t.toClassroom) === normalizeRoomId(myRoomId)) {
        alerts.push({
          type: "TRANSFER_ROOM_FULL",
          severity: "medium",
          at,
          roomId: t.toClassroom,
          studentId: String(t.studentId),
          studentCode: t.studentCode || "",
          studentName: t.studentName || "",
          fromClassroom: t.fromClassroom,
          toClassroom: t.toClassroom,
          requestId: String(t._id),
          reason: "ROOM_FULL",
        });
      }

      // notify lecturer/admin globally
      if (isLecturerLike) {
        alerts.push({
          type: "TRANSFER_ROOM_FULL",
          severity: "low",
          at,
          roomId: t.toClassroom,
          studentId: String(t.studentId),
          studentCode: t.studentCode || "",
          studentName: t.studentName || "",
          fromClassroom: t.fromClassroom,
          toClassroom: t.toClassroom,
          requestId: String(t._id),
          reason: "ROOM_FULL",
        });
      }
    }

    const pendingByStudent = new Set(
      pending
        .filter((t) => (isSupervisorRole ? normalizeRoomId(t.fromClassroom) === normalizeRoomId(myRoomId) : true))
        .map((t) => String(t.studentId))
    );

    const attendanceWithTransfers = visibleAttendance.map((a) => {
      const plain = typeof a?.toObject === "function" ? a.toObject() : { ...a };
      if (pendingByStudent.has(String(plain.studentId))) return { ...plain, status: "moving" };
      return plain;
    });

    // ---------------- Events visibility ----------------
    const rawEvents = (exam.events || []).slice(-30).reverse();

    const visibleEvents =
      isSupervisorRole && myRoomId
        ? rawEvents.filter((e) => !e.classroom || normalizeRoomId(e.classroom) === normalizeRoomId(myRoomId))
        : rawEvents;

    const examPayload = {
      id: String(exam._id),
      courseName: exam.courseName,
      examMode: exam.examMode,
      examDate: exam.examDate,
      startAt: exam.startAt,
      endAt: exam.endAt,
      status: exam.status,
      lecturer: exam.lecturer,
      coLecturers: exam.coLecturers || [],
      supervisors: exam.supervisors || [],
      classrooms: exam.classrooms || [],
      reportSummary: exam.report?.summary || {},
    };

    return res.json({
      me: {
        id: String(user._id),
        role: user.role,
        username: user.username,
        fullName: user.fullName,
        assignedRoomId: isSupervisorRole ? myRoomId || null : user.assignedRoomId || null,
      },
      exam: {
        ...examPayload,
        attendance: attendanceWithTransfers,
        reportStudentStats: studentStats,
        reportStudentFiles: studentFiles,
      },
      attendance: attendanceWithTransfers,
      transfers,
      stats,
      alerts,
      inbox: { unread, recent: recentMessages },
      events: visibleEvents,
      reportStudentStats: studentStats,
      reportStudentFiles: studentFiles,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res.status(500).json({ message: "Dashboard error" });
  }
}


export async function getDashboardSnapshotLite(req, res) {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const requestedExamId = req.query?.examId ? String(req.query.examId) : "";

    // ✅ Lean + minimal fields for speed
    const select =
      "courseName examMode examDate startAt endAt status lecturer coLecturers supervisors classrooms attendance events messages report.summary report.studentFiles";
    const exam = await findRunningExamForUser(user, { examId: requestedExamId, lean: true, select });

    if (!exam) {
      return res.json({
        me: {
          id: String(user._id),
          role: user.role,
          username: user.username,
          fullName: user.fullName,
          assignedRoomId: user.assignedRoomId || null,
        },
        exam: null,
        attendance: [],
        transfers: [],
        stats: {},
        alerts: [],
        inbox: { unread: 0, recent: [] },
        events: [],
      });
    }

    const role = String(user.role || "").toLowerCase();
    const isSupervisorRole = role === "supervisor";
    const isLecturerLike = role === "lecturer" || role === "admin";

    const myRoomId = isSupervisorRole ? deriveSupervisorRoomId({ user, exam }) : "";

    const allAttendance = exam.attendance || [];

    const visibleAttendance =
      isSupervisorRole && myRoomId
        ? allAttendance.filter((a) => attRoom(a) === normalizeRoomId(myRoomId))
        : allAttendance;

    // ---- Build a *slim* studentFiles map (only what UI needs) ----
    const reportFilesMap = exam.report?.studentFiles || new Map();
    const studentFilesSlim = {};
    const takeSlim = (v) => {
      if (!v || typeof v !== "object") return {};
      return {
        toiletCount: Number(v.toiletCount || 0) || 0,
        activeToilet: v.activeToilet || null,
      };
    };

    if (reportFilesMap?.forEach) {
      reportFilesMap.forEach((val, key) => {
        studentFilesSlim[String(key)] = takeSlim(val);
      });
    } else if (reportFilesMap && typeof reportFilesMap === "object") {
      for (const [k, v] of Object.entries(reportFilesMap)) {
        studentFilesSlim[String(k)] = takeSlim(v);
      }
    }

    const stats = {
      totalStudents: visibleAttendance.length,
      present: visibleAttendance.filter((a) => a.status === "present").length,
      tempOut: visibleAttendance.filter((a) => a.status === "temp_out").length,
      absent: visibleAttendance.filter((a) => a.status === "absent").length,
      moving: visibleAttendance.filter((a) => a.status === "moving").length,
      finished: visibleAttendance.filter((a) => a.status === "finished").length,
      notArrived: visibleAttendance.filter((a) => a.status === "not_arrived").length,
      violations: visibleAttendance.reduce((sum, a) => sum + (a.violations || 0), 0),
    };

    const alerts = [];
    const now = Date.now();

    const TOILET_ALERT_MS = 10 * 60 * 1000;
    for (const a of visibleAttendance) {
      if (a.status !== "temp_out") continue;

      const key = String(a.studentId);
      const st = studentFilesSlim[key];

      const leftAt = st?.activeToilet?.leftAt ? new Date(st.activeToilet.leftAt).getTime() : null;
      const startedAt = a.outStartedAt ? new Date(a.outStartedAt).getTime() : null;

      const base = leftAt || startedAt;
      if (!base) continue;

      const elapsedMs = Math.max(0, now - base);
      if (elapsedMs >= TOILET_ALERT_MS) {
        alerts.push({
          type: "TOILET_LONG",
          severity: "medium",
          at: new Date(base).toISOString(),
          roomId: attRoom(a),
          studentId: key,
          studentCode: a.studentNumber || "",
          name: a.name || "",
          classroom: attRoom(a),
          seat: a.seat || "",
          elapsedMs,
        });
      }
    }

    // ---- Inbox (lite): only last 10 + unread count ----
    const msgItems = (exam.messages || [])
      .filter((m) => isRecipient(m, user) || String(m.from?.id) === String(user._id))
      .slice(-30);

    const unread = msgItems.filter((m) => !(m.readBy || []).map(String).includes(String(user._id)))
      .length;
    const recentMessages = msgItems.slice(-10).reverse();

    // ---- Transfers (lite): limit to 50 ----
    const allTransfers = await TransferRequest.find({ examId: exam._id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const transfers =
      isSupervisorRole && myRoomId
        ? allTransfers.filter(
            (t) =>
              normalizeRoomId(t.toClassroom) === normalizeRoomId(myRoomId) ||
              normalizeRoomId(t.fromClassroom) === normalizeRoomId(myRoomId)
          )
        : allTransfers;

    const pending = allTransfers.filter((t) => t.status === "pending");

    for (const t of pending) {
      if (isSupervisorRole && myRoomId && normalizeRoomId(t.toClassroom) === normalizeRoomId(myRoomId)) {
        alerts.push({
          type: "TRANSFER_PENDING_TO_YOU",
          severity: "medium",
          at: t.createdAt,
          roomId: t.toClassroom,
          studentId: String(t.studentId),
          studentCode: t.studentCode || "",
          studentName: t.studentName || "",
          fromClassroom: t.fromClassroom,
          toClassroom: t.toClassroom,
          requestId: String(t._id),
        });
      }

      if (isLecturerLike) {
        alerts.push({
          type: "TRANSFER_PENDING_IN_EXAM",
          severity: "low",
          at: t.createdAt,
          roomId: t.toClassroom,
          studentId: String(t.studentId),
          studentCode: t.studentCode || "",
          studentName: t.studentName || "",
          fromClassroom: t.fromClassroom,
          toClassroom: t.toClassroom,
          requestId: String(t._id),
        });
      }
    }

    const pendingByStudent = new Set(
      pending
        .filter((t) => (isSupervisorRole ? normalizeRoomId(t.fromClassroom) === normalizeRoomId(myRoomId) : true))
        .map((t) => String(t.studentId))
    );

    const attendanceWithTransfers = visibleAttendance.map((a) => {
      const plain = typeof a?.toObject === "function" ? a.toObject() : { ...a };
      if (pendingByStudent.has(String(plain.studentId))) return { ...plain, status: "moving" };
      return plain;
    });

    const rawEvents = (exam.events || []).slice(-30).reverse();

    const visibleEvents =
      isSupervisorRole && myRoomId
        ? rawEvents.filter((e) => !e.classroom || normalizeRoomId(e.classroom) === normalizeRoomId(myRoomId))
        : rawEvents;

    const examPayload = {
      id: String(exam._id),
      courseName: exam.courseName,
      examMode: exam.examMode,
      examDate: exam.examDate,
      startAt: exam.startAt,
      endAt: exam.endAt,
      status: exam.status,
      lecturer: exam.lecturer,
      coLecturers: exam.coLecturers || [],
      supervisors: exam.supervisors || [],
      classrooms: exam.classrooms || [],
      reportSummary: exam.report?.summary || {},
      reportStudentFiles: studentFilesSlim,
      attendance: attendanceWithTransfers,
    };

    return res.json({
      me: {
        id: String(user._id),
        role: user.role,
        username: user.username,
        fullName: user.fullName,
        assignedRoomId: isSupervisorRole ? myRoomId || null : user.assignedRoomId || null,
      },
      exam: examPayload,
      attendance: attendanceWithTransfers,
      transfers,
      stats,
      alerts,
      inbox: { unread, recent: recentMessages },
      events: visibleEvents,
    });
  } catch (err) {
    console.error("Dashboard lite error:", err);
    return res.status(500).json({ message: "Dashboard error" });
  }
}


/* =========================
   NEW: Add / Delete Student (Admin/Lecturer)
========================= */

/**
 * POST /api/dashboard/students/add
 * body: { examId?, firstName, lastName, studentId, roomId }
 */
export async function addStudentToRunningExam(req, res) {
  try {
    if (!mustBeAdminOrLecturer(req, res)) return;

    const firstName = String(req.body?.firstName || "").trim();
    const lastName = String(req.body?.lastName || "").trim();
    const studentId = String(req.body?.studentId || "").trim();
    const roomId = normalizeRoomId(req.body?.roomId);

    if (!firstName || !lastName || !studentId || !roomId) {
      return res.status(400).json({
        message: "MISSING_FIELDS",
        need: ["firstName", "lastName", "studentId", "roomId"],
      });
    }

    const actorUser = await User.findById(req.user?._id).lean();
    if (!actorUser) return res.status(404).json({ message: "User not found" });

    // ✅ allow explicit examId (from client) OR fallback to running exam for this user
    const requestedExamId = String(req.body?.examId || "").trim();

    const exam = requestedExamId
      ? await Exam.findById(requestedExamId)
      : await findRunningExamForUser(actorUser);

    if (!exam) {
      return res.status(409).json({
        message: requestedExamId ? "EXAM_NOT_FOUND" : "NO_RUNNING_EXAM",
      });
    }

    // ✅ lecturer must own this exam
    if (!ensureLecturerOwnsExam(req, res, exam)) return;

    const classroom = pickClassroom(exam, roomId);
    if (!classroom) return res.status(404).json({ message: "ROOM_NOT_FOUND", roomId });

    // prevent duplicates by studentId in users OR attendance
    const existingUser = await User.findOne({ role: "student", studentId }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "STUDENT_EXISTS_IN_USERS", studentId });
    }

    const alreadyInAttendance = (exam.attendance || []).some(
      (a) => String(a?.studentNumber || "") === studentId
    );
    if (alreadyInAttendance) {
      return res.status(409).json({ message: "STUDENT_EXISTS_IN_EXAM", studentId });
    }

    // capacity check
    const attendance = exam.attendance || [];
    const attendanceInRoom = attendance.filter((a) => attRoom(a) === normalizeRoomId(roomId));
    const cap = getRoomCapacity(classroom);

    // if cap is unknown (0) -> do not block by count, but seat-map may still block later
    if (cap > 0 && attendanceInRoom.length >= cap) {
      return res.status(409).json({
        message: "ROOM_FULL",
        roomId,
        capacity: cap,
        current: attendanceInRoom.length,
      });
    }

    const fullName = `${firstName} ${lastName}`.trim();

    // generate username/email/password
    const baseUsername = `${firstName}.${lastName}.${studentId.slice(-4)}`;
    const username = await makeUniqueUsername(baseUsername);
    const email = `${username}@demo.local`;
    const password = `Stu${studentId.slice(-4)}!`; // demo-only

    const createdUser = await User.create({
      fullName,
      username,
      email,
      password, // demo-only
      role: "student",
      studentId,
      studentFiles: [],
      assignedRoomId: null,
    });

    const seat = firstFreeSeat({ classroom, attendanceInRoom });

    // ✅ if no free seat (or no seat map) -> treat as ROOM_FULL and rollback created user
    if (!seat) {
      await User.deleteOne({ _id: createdUser._id });
      return res.status(409).json({
        message: "ROOM_FULL",
        roomId,
        note: "No free seats available (seat map missing or full)",
      });
    }

    // ✅ ensure report maps exist
    ensureReportMaps(exam);

    // attendance record
    const att = {
      studentId: createdUser._id,
      studentNumber: studentId, // used in UI sometimes as code
      name: fullName,
      status: "not_arrived",
      classroom: roomId,
      roomId,
      seat,
      violations: 0,
      incidentCount: 0,
      toiletCount: 0,
      totalToiletMs: 0,
      arrivedAt: null,
      finishedAt: null,
      outStartedAt: null,
      createdAt: new Date(),
    };

    exam.attendance = [...(exam.attendance || []), att];

    // init report objects for this student (key = user._id)
    const key = String(createdUser._id);

    exam.report.studentStats.set(key, {
      studentId: key,
      studentNumber: studentId,
      name: fullName,
      roomId,
      seat,
      violations: 0,
      incidents: 0,
      toiletCount: 0,
      totalToiletMs: 0,
      status: "not_arrived",
    });

    exam.report.studentFiles.set(key, {
      studentId: key,
      studentNumber: studentId,
      name: fullName,
      roomId,
      seat,
      activeToilet: null,
      events: [],
      transfers: [],
      notes: [],
    });

    // ✅ unified event schema
    exam.events = exam.events || [];
    exam.events.push({
      type: "STUDENT_ADDED",
      timestamp: new Date(),
      description: `${fullName} (${studentId}) added to ${roomId}`,
      severity: "low",
      classroom: roomId,
      seat,
      studentId: createdUser._id,
      actor: {
        id: req.user?._id,
        name: actorUser.fullName || actorUser.username || "",
        role: String(req.user?.role || "").toLowerCase(),
      },
    });
    exam.events = exam.events.slice(-200);

    // ✅ IMPORTANT: report has Maps + deep mutations
    exam.markModified("attendance");
    exam.markModified("report");
    exam.markModified("events");

    await saveWithRetry(exam);

    return res.json({
      message: "STUDENT_ADDED",
      student: {
        id: String(createdUser._id),
        fullName,
        studentId,
        username,
        email,
        roomId,
        seat,
      },
    });
  } catch (err) {
    console.error("addStudentToRunningExam error:", err);
    return res.status(500).json({ message: "ADD_STUDENT_ERROR" });
  }
}

/**
 * POST/DELETE /api/dashboard/students/delete
 * body: { examId?, studentId }  // studentId = studentNumber
 */
export async function deleteStudentFromRunningExam(req, res) {
  try {
    if (!mustBeAdminOrLecturer(req, res)) return;

    const studentId = String(req.body?.studentId || "").trim();
    if (!studentId) {
      return res.status(400).json({ message: "MISSING_FIELDS", need: ["studentId"] });
    }

    const actorUser = await User.findById(req.user?._id).lean();
    if (!actorUser) return res.status(404).json({ message: "User not found" });

    // ✅ allow explicit examId OR fallback to running exam for this user
    const requestedExamId = String(req.body?.examId || "").trim();

    const exam = requestedExamId
      ? await Exam.findById(requestedExamId)
      : await findRunningExamForUser(actorUser);

    if (!exam) {
      return res.status(409).json({
        message: requestedExamId ? "EXAM_NOT_FOUND" : "NO_RUNNING_EXAM",
      });
    }

    // ✅ lecturer must own this exam
    if (!ensureLecturerOwnsExam(req, res, exam)) return;

    const attendance = exam.attendance || [];
    if (!attendance.length) {
      return res.status(409).json({ message: "CLASS_EMPTY", note: "Exam attendance is empty" });
    }

    const idx = attendance.findIndex((a) => String(a?.studentNumber || "").trim() === studentId);
    if (idx === -1) {
      return res.status(404).json({ message: "STUDENT_NOT_FOUND_IN_EXAM", studentId });
    }

    const removed = attendance[idx];
    const roomId = attRoom(removed);
    const fullName = removed?.name || "";

    exam.attendance = attendance.filter((_, i) => i !== idx);

    // ✅ ensure report maps exist then remove from maps
    ensureReportMaps(exam);

    const key = String(removed?.studentId || "");
    if (exam.report?.studentStats?.delete && key) exam.report.studentStats.delete(key);
    if (exam.report?.studentFiles?.delete && key) exam.report.studentFiles.delete(key);

    // ✅ unified event schema
    exam.events = exam.events || [];
    exam.events.push({
      type: "STUDENT_DELETED",
      timestamp: new Date(),
      description: `${fullName} (${studentId}) deleted from ${roomId}`,
      severity: "low",
      classroom: roomId,
      seat: removed?.seat || "",
      studentId: removed?.studentId || null,
      actor: {
        id: req.user?._id,
        name: actorUser.fullName || actorUser.username || "",
        role: String(req.user?.role || "").toLowerCase(),
      },
    });
    exam.events = exam.events.slice(-200);

    // ✅ IMPORTANT: report has Maps + deep mutations
    exam.markModified("attendance");
    exam.markModified("report");
    exam.markModified("events");

    await saveWithRetry(exam);

    // delete from users collection (system-level)
    // (if you want delete only from exam and not from system, remove this line)
    await User.deleteOne({ role: "student", studentId });

    return res.json({
      message: "STUDENT_DELETED",
      removed: {
        studentId,
        name: fullName,
        roomId,
        seat: removed?.seat || "",
      },
    });
  } catch (err) {
    console.error("deleteStudentFromRunningExam error:", err);
    return res.status(500).json({ message: "DELETE_STUDENT_ERROR" });
  }
}
