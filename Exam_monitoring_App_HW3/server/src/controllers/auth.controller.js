// server/src/controllers/auth.controller.js
import crypto from "crypto";
import User from "../models/User.js";
import { sendOtpEmail } from "../mailer/mailer.js";

function safeUser(u) {
  return {
    id: u._id.toString(),
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    role: u.role,
    studentId: u.studentId ?? null,
    assignedRoomId: u.assignedRoomId ?? null,
  };
}

/* =========================
   OTP helpers (Step 1.3)
========================= */
function generateOtp6() {
  // 6 digits, leading zeros allowed
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

function hashOtp(code) {
  // Use server secret if exists (Render env var recommended)
  const secret = process.env.OTP_SECRET || "DEV_OTP_SECRET_CHANGE_ME";
  return crypto.createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/* =========================
   STUDENT: Request OTP
   POST /api/auth/student/request-otp
   body: { email, studentId }
========================= */
export async function studentRequestOtp(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const studentId = String(req.body?.studentId || "").trim();

    if (!email || !studentId) {
      return res.status(400).json({ message: "Missing email or studentId" });
    }

    // Find the student by BOTH email + studentId (as you requested)
    const user = await User.findOne({
      role: "student",
      email,
      studentId,
    });

    // Return a generic error to avoid leaking which field is wrong
    if (!user) {
      return res.status(404).json({ message: "Student not found" });
    }

    const now = new Date();
    const otp = generateOtp6();
    const codeHash = hashOtp(otp);
    const minutes = 10;

    user.otp = {
      codeHash,
      purpose: "student_login",
      expiresAt: addMinutes(now, minutes),
      attempts: 0,
      requestedAt: now,
    };

    await user.save();

    // Send OTP via your mailer path
    await sendOtpEmail({
      to: user.email,
      code: otp,
      purpose: "student_login",
      minutes,
    });

    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("STUDENT REQUEST OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ================= LOGIN =================
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const u = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: u });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ store session (include studentId / assignedRoomId for UI + scoping)
    req.session.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      role: user.role,
      username: user.username,
      fullName: user.fullName,

      // ✅ NEW
      studentId: user.studentId ?? null,
      assignedRoomId: user.assignedRoomId ?? null,
    };

    // ✅ IMPORTANT: save session before responding
    req.session.save(() => {
      return res.json(safeUser(user));
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ================= LOGOUT =================
export async function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("sid");
    return res.json({ message: "Logged out" });
  });
}

// ================= ME =================
export async function me(req, res) {
  const user = await User.findById(req.user.id);
  return res.json(safeUser(user));
}

// ================= REGISTER =================
export async function register(req, res) {
  try {
    const { fullName, username, email, password, role } = req.body;

    if (!["supervisor", "lecturer"].includes(role)) {
      return res.status(400).json({ message: "Role must be supervisor or lecturer" });
    }

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Normalize
    const u = String(username).trim().toLowerCase();
    const e = String(email).trim().toLowerCase();

    const existingU = await User.findOne({ username: u });
    if (existingU) {
      return res.status(409).json({ message: "Username already taken" });
    }

    const existingE = await User.findOne({ email: e });
    if (existingE) {
      return res.status(409).json({ message: "Email already used" });
    }

    const created = await User.create({
      fullName: String(fullName).trim(),
      username: u,
      email: e,
      password, // ✅ plain password
      role,
      studentId: null,
      assignedRoomId: null,
    });

    return res.status(201).json({
      message: "User created",
      user: safeUser(created),
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ================= CHECK USERNAME =================
// GET /api/auth/check-username?username=majd1
export async function checkUsername(req, res) {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();
    if (!username) {
      // Return consistent shape
      return res.json({ taken: false, exists: false });
    }

    const exists = await User.exists({ username });
    const taken = Boolean(exists);

    return res.json({ taken, exists: taken });
  } catch (err) {
    console.error("CHECK USERNAME ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
