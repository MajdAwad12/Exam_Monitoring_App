// server/src/models/User.js
import mongoose from "mongoose";

/* =========================
   Student Exam File (per exam)
========================= */
const studentEventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    type: { type: String, default: "" }, // e.g. "toilet_exit", "cheating_suspected", "transfer"
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    roomId: { type: String, default: "" },
    seat: { type: String, default: "" },
    by: {
      name: { type: String, default: "" }, // supervisor / system
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

    status: { type: String, default: "" }, // present/finished/etc.

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

/* =========================
   Auth helpers: Lockout + OTP
========================= */
const authLockSchema = new mongoose.Schema(
  {
    // how many failed attempts since last successful login/reset
    failCount: { type: Number, default: 0 },

    // 0 => first lock stage (2m), 1 => second (5m), 2+ => long stage (2h repeating)
    stage: { type: Number, default: 0 },

    // if now < lockUntil => user is blocked no matter what credentials are
    lockUntil: { type: Date, default: null },

    lastFailedAt: { type: Date, default: null },
  },
  { _id: false }
);

const otpSchema = new mongoose.Schema(
  {
    // store hashed code later in controller (recommended). for now just a string field.
    codeHash: { type: String, default: "" },

    purpose: {
      type: String,
      enum: ["student_login", "reset_password"],
      default: "student_login",
    },

    expiresAt: { type: Date, default: null },

    // optional: limit OTP brute force
    attempts: { type: Number, default: 0 },

    // optional: for UI/debug messages
    requestedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    /* ---------- Basic Identity ---------- */
    fullName: { type: String, required: true, trim: true },

    // ✅ Staff only (students do NOT have username)
    username: {
      type: String,
      required: function () {
        return this.role !== "student";
      },
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // ✅ Everyone has email (used for OTP)
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    /* ---------- Auth ---------- */
    // ✅ Staff only (students do NOT have password)
    // ⚠️ Plain password – DEMO / COURSE ONLY
    password: {
      type: String,
      required: function () {
        return this.role !== "student";
      },
      default: "",
    },

    /* ---------- Role & Permissions ---------- */
    role: { type: String, required: true, enum: ["admin", "supervisor", "lecturer", "student"] },

    /* ---------- Student-only ---------- */
    studentId: {
      type: String,
      required: function () {
        return this.role === "student";
      },
      default: null,
      index: true,
      trim: true,
    },

    // Student personal file across exams (read-only page)
    studentFiles: { type: [studentExamFileSchema], default: [] },

    /* ---------- Supervisor-only ---------- */
    assignedRoomId: { type: String, default: null },

    /* ---------- NEW: Lockout state ---------- */
    authLock: { type: authLockSchema, default: () => ({}) },

    /* ---------- NEW: OTP state ---------- */
    otp: { type: otpSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "users" }
);

export default mongoose.model("User", userSchema);
