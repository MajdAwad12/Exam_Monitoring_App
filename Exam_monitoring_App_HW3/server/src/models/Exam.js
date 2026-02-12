// server/src/models/Exam.js
import mongoose from "mongoose";

/* =========================
   Attendance (per student)
   ✅ FIX: Keep _id (so we can update safely by attendance._id)
========================= */
const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, default: "" },
    studentNumber: { type: String, default: "" },

    // ✅ IMPORTANT: keep BOTH fields (you use them in UI)
    classroom: { type: String, default: "" }, // e.g. "A101"
    roomId: { type: String, default: "" }, // ✅ used by autoAssign
    seat: { type: String, default: "" }, // e.g. "R1-C3"

    status: {
      type: String,
      enum: ["not_arrived", "present", "temp_out", "absent", "moving", "finished"],
      default: "not_arrived",
    },

    arrivedAt: { type: Date, default: null },
    outStartedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    lastStatusAt: { type: Date, default: null },

    violations: { type: Number, default: 0 },

    // ✅ Extra time for this student (minutes). Used to activate exam extension logic.
    extraMinutes: { type: Number, default: 0 },
  },
  {
    // ❌ was: { _id: false }
    // ✅ keep _id so we can reference / update a specific attendance row safely
    _id: true,
  }
);

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
    description: { type: String, default: "" },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    classroom: { type: String, default: "" },
    seat: { type: String, default: "" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },
    eventId: { type: String, default: "" },

    // Lecturer acknowledgement for CALL_LECTURER
    seenByLecturer: { type: Boolean, default: false },
    seenAt: { type: Date, default: null },
    seenText: { type: String, default: "" },

    // Optional: limit who can see this event (e.g., CALL_LECTURER)
    visibilityRoles: { type: [String], default: null },
  },
  { _id: false }
);

const reportTimelineSchema = new mongoose.Schema(
  {
    kind: { type: String, default: "" },
    at: { type: Date, default: Date.now },

    roomId: { type: String, default: "" },

    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    student: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      code: { type: String, default: "" },
      seat: { type: String, default: "" },
      classroom: { type: String, default: "" },
    },

    details: { type: Object, default: {} },
  },
  { _id: false }
);

const studentStatSchema = new mongoose.Schema(
  {
    toiletCount: { type: Number, default: 0 },
    totalToiletMs: { type: Number, default: 0 },

    activeToilet: {
      leftAt: { type: Date, default: null },
      bySupervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reason: { type: String, default: "toilet" },
    },

    incidentCount: { type: Number, default: 0 },
    lastIncidentAt: { type: Date, default: null },
  },
  { _id: false }
);

const studentFileTimelineSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    kind: { type: String, default: "" },
    note: { type: String, default: "" },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    classroom: { type: String, default: "" },
    seat: { type: String, default: "" },
    meta: { type: Object, default: {} },
  },
  { _id: false }
);

const studentFileSchema = new mongoose.Schema(
  {
    arrivedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },

    toiletCount: { type: Number, default: 0 },
    totalToiletMs: { type: Number, default: 0 },
    activeToilet: {
      leftAt: { type: Date, default: null },
      bySupervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },

    incidentCount: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },


    notes: { type: [String], default: [] },
    timeline: { type: [studentFileTimelineSchema], default: [] },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },

    from: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },

    toUserIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    toRoles: { type: [String], default: [] },

    roomId: { type: String, default: "" },
    text: { type: String, default: "" },

    readBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  { _id: false }
);

const classroomSchema = new mongoose.Schema(
  {
    id: { type: String, default: "" },
    name: { type: String, default: "" },

    rows: { type: Number, default: 5 },
    cols: { type: Number, default: 5 },

    assignedSupervisorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedSupervisorName: { type: String, default: "" },
  },
  { _id: false }
);

/* =========================
   Lecturer assignment per rooms
========================= */
const lecturerAssignmentSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, default: "" },
    roomIds: { type: [String], default: [] }, // e.g. ["A101","B202","C303"]
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    // NEW: stable course identifier (required by requirements & reporting)
    // Keep courseName for display; courseId is for filtering & integrations.
    courseId: { type: String, required: true, index: true, default: "" },
    courseName: { type: String, required: true },
    examMode: { type: String, enum: ["onsite", "online"], default: "onsite" },

    examDate: { type: Date, required: true },

    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },

    // ✅ Exam-wide extension mode (activated when any student gets extraMinutes > 0)
    extraTimeActive: { type: Boolean, default: false },
    // Rule: every exam hour adds 15 minutes when extension is active
    extraTimeMinutesPerHour: { type: Number, default: 15 },

    status: { type: String, enum: ["scheduled", "running", "ended"], default: "scheduled" },

    lecturer: { type: lecturerAssignmentSchema, required: true },
    coLecturers: { type: [lecturerAssignmentSchema], default: [] },

    supervisors: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, default: "" },
        roomId: { type: String, default: "" },
      },
    ],

    classrooms: { type: [classroomSchema], default: [] },

    attendance: { type: [attendanceSchema], default: [] },
    events: { type: [eventSchema], default: [] },
    messages: { type: [messageSchema], default: [] },

    note: { type: String, default: "" },

    report: {
      generatedAt: { type: Date, default: null },
      notes: { type: String, default: "" },

      summary: {
        totalStudents: { type: Number, default: 0 },
        present: { type: Number, default: 0 },
        absent: { type: Number, default: 0 },
        temp_out: { type: Number, default: 0 },
        not_arrived: { type: Number, default: 0 },
        finished: { type: Number, default: 0 },
        violations: { type: Number, default: 0 },

        incidents: { type: Number, default: 0 },
        transfers: { type: Number, default: 0 },
      },

      timeline: { type: [reportTimelineSchema], default: [] },

      studentStats: { type: Map, of: studentStatSchema, default: {} },
      studentFiles: { type: Map, of: studentFileSchema, default: {} },
    },
  },
  {
    timestamps: true,
    collection: "moodle", // ✅ keep as requested
  }
);

examSchema.index({ status: 1, startAt: 1 });
examSchema.index({ "lecturer.id": 1, status: 1 });
examSchema.index({ "coLecturers.id": 1, status: 1 });
examSchema.index({ "supervisors.id" : 1, status: 1 });
  
export default mongoose.model("Exam", examSchema);