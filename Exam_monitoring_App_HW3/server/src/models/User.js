// server/src/models/User.js
import mongoose from "mongoose";

/* =========================
   Student Exam File (per exam)
========================= */
const studentEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, default: "" },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    roomId: { type: String, default: "" },
    seat: { type: String, default: "" },
    by: {
      name: { type: String, default: "" },
      role: { type: String, default: "" },
    },
    meta: { type: Object, default: {} },
  },
  { _id: false }
);

const studentTransferSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    fromRoomId: { type: String, default: "" },
    toRoomId: { type: String, default: "" },
    reason: { type: String, default: "" },
    approvedBy: { type: String, default: "" },
  },
  { _id: false }
);

const studentExamFileSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    courseName: { type: String, default: "" },
    examDate: { type: Date, default: null },
    roomId: { type: String, default: "" },
    seat: { type: String, default: "" },
    lecturerName: { type: String, default: "" },
    supervisorName: { type: String, default: "" },
    status: { type: String, default: "" },
    arrivedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    toiletCount: { type: Number, default: 0 },
    totalToiletMs: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },
    incidentCount: { type: Number, default: 0 },
    score: { type: Number, default: null },
    notes: { type: [String], default: [] },
    transfers: { type: [studentTransferSchema], default: [] },
    events: { type: [studentEventSchema], default: [] },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    /* ---------- Basic Identity ---------- */
    fullName: { type: String, required: true, trim: true },

    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    /* ---------- Auth ---------- */
    // ⚠️ Plain password – COURSE ONLY
    password: { type: String, required: true },

    /* ---------- Role ---------- */
    role: { type: String, required: true, enum: ["admin", "supervisor", "lecturer", "student"] },

    /* ---------- Student-only ---------- */
    studentId: { type: String, default: null, index: true },
    studentFiles: { type: [studentExamFileSchema], default: [] },

    /* ---------- Supervisor-only ---------- */
    assignedRoomId: { type: String, default: null },

    /* =========================
       Staff login lockout
       - after 3 wrong tries: 2 min
       - next time: 5 min
       - next time: 2 hours
       - after that: always 2 hours until success
    ========================= */
    loginFailCount: { type: Number, default: 0 }, // counts wrong attempts (resets when blocked)
    loginLockUntil: { type: Date, default: null },
    loginLockStage: { type: Number, default: 0 }, // 0->2m, 1->5m, 2->2h (cap)

    /* =========================
       Student OTP (email + studentId)
    ========================= */
    otpHash: { type: String, default: "" },
    otpExpiresAt: { type: Date, default: null },
    otpPurpose: { type: String, default: "" },
    otpFailCount: { type: Number, default: 0 },
    otpIssuedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" }
);

export default mongoose.model("User", userSchema);
