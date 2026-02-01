// server/src/controllers/incidents.controller.js
import mongoose from "mongoose";
import Exam from "../models/Exam.js";

/* =========================
   Save helper: retry on VersionError
========================= */
async function saveWithRetry(doc, retries = 5) {
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

function actorFromReq(req) {
  const u = req.user || req.session?.user || {};
  return {
    id: u.id || u._id,
    name: u.fullName || u.username || "",
    role: u.role || "",
  };
}

/* =========================
   Ensure report maps exist AND are Maps
========================= */
function ensureMaps(exam) {
  if (!exam.report) exam.report = {};
  if (!Array.isArray(exam.report.timeline)) exam.report.timeline = [];

  // studentFiles: Map
  const sf = exam.report.studentFiles;
  const sfIsMap = sf && typeof sf.get === "function" && typeof sf.set === "function";
  if (!sfIsMap) {
    exam.report.studentFiles = new Map(Object.entries(sf || {}));
  }

  // studentStats: Map
  const ss = exam.report.studentStats;
  const ssIsMap = ss && typeof ss.get === "function" && typeof ss.set === "function";
  if (!ssIsMap) {
    exam.report.studentStats = new Map(Object.entries(ss || {}));
  }

  if (!Array.isArray(exam.events)) exam.events = [];
}

function ensureStudentFile(exam, studentId) {
  ensureMaps(exam);
  const key = String(studentId);
  const existing = exam.report.studentFiles.get(key);
  if (existing) return existing;

  const file = {
    arrivedAt: null,
    finishedAt: null,
    toiletCount: 0,
    totalToiletMs: 0,
    activeToilet: { leftAt: null, bySupervisorId: null },
    incidentCount: 0,
    violations: 0,
    notes: [],
    timeline: [],
  };

  exam.report.studentFiles.set(key, file);
  return file;
}

function ensureStudentStat(exam, studentId) {
  ensureMaps(exam);
  const key = String(studentId);
  const existing = exam.report.studentStats.get(key);
  if (existing) return existing;

  const stat = {
    toiletCount: 0,
    totalToiletMs: 0,
    activeToilet: { leftAt: null, bySupervisorId: null, reason: "toilet" },
    incidentCount: 0,
    lastIncidentAt: null,
  };

  exam.report.studentStats.set(key, stat);
  return stat;
}

function isGlobalKind(kind) {
  const k = String(kind || "").toUpperCase();
  return k === "CALL_LECTURER" || k === "CALL_LECTURER_SEEN";
}

export async function logIncident(req, res) {
  try {
    const { examId } = req.params;
    const body = req.body || {};

    const studentId = body.studentId ?? null;
    const kind = body.kind;
    const kindUpper = String(kind || "").toUpperCase();
    const severity = body.severity || "low";
    const note = body.note || body.description || "";
    const meta = body.meta || {};

    if (!kind) return res.status(400).json({ message: "kind is required" });

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    ensureMaps(exam);

    const actor = actorFromReq(req);

    // Visibility: CALL_LECTURER should be visible to lecturer+admin only
    const visibilityRoles = kindUpper === "CALL_LECTURER" ? ["admin", "lecturer", "supervisor"] : null;


    // ✅ Lecturer acknowledges a CALL_LECTURER event ("Seen" button)
    if (kindUpper === "CALL_LECTURER_SEEN") {
      if (String(actor?.role || "").toLowerCase() !== "lecturer") {
        return res.status(403).json({ message: "Lecturer only" });
      }

      const targetEventId = String(meta?.targetEventId || meta?.eventId || "").trim();
      if (!targetEventId) return res.status(400).json({ message: "meta.targetEventId is required" });

      const ev = (exam.events || []).find((e) => String(e?.eventId || "") === targetEventId);
      if (!ev) {
        // Fail-safe: do not break the UI if an old event has no eventId or was trimmed
        return res.json({ ok: true, missing: true, updated: { eventId: targetEventId, seenByLecturer: true } });
      }

      // mark acknowledged for everyone
      ev.seenByLecturer = true;
      ev.seenAt = new Date();
      ev.seenText = "המרצה ראה את הקריאה , הוא יבוא בזמן הקרוב לכיתה";

      // make it visually prominent for all users
      ev.severity = "high";

      await saveWithRetry(exam);

      return res.json({ ok: true, updated: { eventId: targetEventId, seenByLecturer: true, seenAt: ev.seenAt } });
    }

    // If this is not a global kind, require studentId
    if (!isGlobalKind(kind) && !studentId) {
      return res.status(400).json({ message: "studentId is required for this incident kind" });
    }

    const a =
      studentId != null
        ? (exam.attendance || []).find((x) => String(x.studentId) === String(studentId))
        : null;

    const roomId = meta.roomId || meta.room || meta.classroom || a?.roomId || a?.classroom || "";
    const seat = meta.seat || a?.seat || "";

    // ✅ caps (avoid huge docs)
    const MAX_EVENTS = 200;
    const MAX_TIMELINE = 300;
    const MAX_STUDENT_TIMELINE = 200;

    // 1) events
    exam.events.push({
      eventId: new mongoose.Types.ObjectId().toString(),
      seenByLecturer: false,
      seenAt: null,
      seenText: "",

      type: String(kind),
      timestamp: new Date(),
      description: String(note || ""),
      severity: String(severity),
      classroom: String(roomId),
      seat: String(seat),
      studentId: studentId || null,
      actor,
      visibilityRoles,
    });
    exam.events = exam.events.slice(-MAX_EVENTS);

    // 2) report timeline
    if (!exam.report.summary) exam.report.summary = {};

    exam.report.timeline.push({
      kind: "INCIDENT",
      at: new Date(),
      roomId: String(roomId),
      actor,
      student: studentId
        ? { id: String(studentId), name: a?.name || "", code: a?.studentNumber || "", seat, classroom: roomId }
        : null,
      details: { kind, severity, note, meta },
    });
    exam.report.timeline = exam.report.timeline.slice(-MAX_TIMELINE);

    // 3) student file/stats
    if (studentId) {
      const file = ensureStudentFile(exam, studentId);
      const stat = ensureStudentStat(exam, studentId);

      file.notes = file.notes || [];
      file.timeline = file.timeline || [];

      file.notes.push(`${kind}: ${note}`.trim());
      file.incidentCount = Number(file.incidentCount || 0) + 1;
      file.violations = Number(file.violations || 0) + 1;

      file.timeline.push({
        at: new Date(),
        kind: "INCIDENT",
        note: `${kind}: ${note}`.trim(),
        severity,
        classroom: roomId,
        seat,
        meta,
      });
      file.timeline = file.timeline.slice(-MAX_STUDENT_TIMELINE);

      stat.incidentCount = Number(stat.incidentCount || 0) + 1;
      stat.lastIncidentAt = new Date();

      if (a) {
        a.violations = Number(a.violations || 0) + 1;
        exam.markModified("attendance"); // ✅ important
      }

      exam.report.summary.incidents = Number(exam.report.summary.incidents || 0) + 1;
      exam.report.summary.violations = Number(exam.report.summary.violations || 0) + 1;
    } else {
      exam.report.summary.incidents = Number(exam.report.summary.incidents || 0) + 1;
    }

    // ✅ IMPORTANT: report has Maps + deep mutations
    exam.markModified("report");
    exam.markModified("report.studentFiles");
    exam.markModified("report.studentStats");
    exam.markModified("events");


    await saveWithRetry(exam);

    const out = exam.toObject({ getters: true });
    return res.json({ ok: true, exam: { ...out, id: String(out._id) } });
  } catch (err) {
    console.error("logIncident error:", err);
    return res.status(500).json({ message: err?.message || "Failed to log incident" });
  }
}