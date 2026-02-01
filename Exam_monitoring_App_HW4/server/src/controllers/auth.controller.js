// ===================================
// server/src/controllers/auth.controller.js
// ===================================
import crypto from "crypto";
import User from "../models/User.js";
import { sendOtpEmail, sendStaffCredentialsEmail } from "../mailer/mailer.js";

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

function nowMs() {
  return Date.now();
}

function msLeft(lockUntil) {
  const t = lockUntil ? new Date(lockUntil).getTime() : 0;
  return Math.max(0, t - nowMs());
}

function formatLeft(ms) {
  const s = Math.ceil(ms / 1000);
  if (s <= 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m <= 60) return `${m} minutes`;
  const h = Math.ceil(m / 60);
  return `${h} hours`;
}

function hashOtp(code) {
  const salt = String(process.env.SESSION_SECRET || "otp_salt").trim();
  return crypto.createHash("sha256").update(`${code}|${salt}`).digest("hex");
}

function genOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* =========================
   STAFF LOGIN (username+password)
   + lockout policy
========================= */
export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const u = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: u });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // students cannot use staff login
    if (user.role === "student") {
      return res.status(400).json({
        message: "Students must login using Student ID + Email + OTP.",
      });
    }

    // locked?
    if (user.loginLockUntil && msLeft(user.loginLockUntil) > 0) {
      const left = msLeft(user.loginLockUntil);
      return res.status(423).json({
        message: `You are blocked. Try again in ${formatLeft(left)}.`,
      });
    }

    // wrong password
    if (user.password !== String(password)) {
      const fail = (user.loginFailCount || 0) + 1;
      user.loginFailCount = fail;

      // block after 3 wrong tries
      if (fail >= 3) {
        const stage = Math.min(Number(user.loginLockStage || 0), 2);
        const durations = [2 * 60 * 1000, 5 * 60 * 1000, 2 * 60 * 60 * 1000];
        const dur = durations[stage];

        user.loginLockUntil = new Date(nowMs() + dur);
        user.loginFailCount = 0;
        user.loginLockStage = Math.min(stage + 1, 2);

        await user.save();

        return res.status(423).json({
          message: `Too many attempts. You are blocked for ${formatLeft(dur)}.`,
        });
      }

      await user.save();
      return res.status(401).json({
        message: `Invalid credentials. Attempts left: ${Math.max(0, 3 - fail)}.`,
      });
    }

    // ✅ success => clear lockout
    user.loginFailCount = 0;
    user.loginLockUntil = null;
    user.loginLockStage = 0;
    await user.save();

    req.session.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      studentId: user.studentId ?? null,
      assignedRoomId: user.assignedRoomId ?? null,
    };

    req.session.save(() => res.json(safeUser(user)));
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ================= LOGOUT ================= */
export async function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("sid");
    return res.json({ message: "Logged out" });
  });
}

/* ================= ME ================= */
export async function me(req, res) {
  try {
    const uid = req.user?.id || req.user?._id;
    if (!uid) return res.status(401).json({ message: "UNAUTHORIZED" });
    const user = await User.findById(uid).select("fullName username email role studentId assignedRoomId").lean();
    if (!user) return res.status(401).json({ message: "UNAUTHORIZED" });
    return res.json(safeUser(user));
  } catch {
    return res.status(401).json({ message: "UNAUTHORIZED" });
  }
}

/* ================= REGISTER ================= */
export async function register(req, res) {
  try {
    const { fullName, username, email, password, role } = req.body;

    if (!["supervisor", "lecturer"].includes(role)) {
      return res.status(400).json({ message: "Role must be supervisor or lecturer" });
    }

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const u = String(username).trim().toLowerCase();
    const e = String(email).trim().toLowerCase();

    const existingU = await User.findOne({ username: u });
    if (existingU) return res.status(409).json({ message: "Username already taken" });

    const existingE = await User.findOne({ email: e });
    if (existingE) return res.status(409).json({ message: "Email already used" });

    const created = await User.create({
      fullName: String(fullName).trim(),
      username: u,
      email: e,
      password,
      role,
      studentId: null,
      assignedRoomId: null,
    });

    return res.status(201).json({ message: "User created", user: safeUser(created) });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ================= CHECK USERNAME ================= */
export async function checkUsername(req, res) {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();
    if (!username) return res.json({ taken: false, exists: false });

    const exists = await User.exists({ username });
    const taken = Boolean(exists);

    return res.json({ taken, exists: taken });
  } catch (err) {
    console.error("CHECK USERNAME ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ======================================================
   STUDENT: Request OTP (email + studentId)
   POST /api/auth/student/request-otp
====================================================== */
export async function studentRequestOtp(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const studentId = String(req.body?.studentId || "").trim();

    if (!email || !studentId) {
      return res.status(400).json({ message: "Missing email or studentId" });
    }

    const user = await User.findOne({ role: "student", email, studentId });
    if (!user) return res.status(404).json({ message: "Student not found" });

    const code = genOtp6();
    user.otpHash = hashOtp(code);
    user.otpPurpose = "student_login";
    user.otpIssuedAt = new Date();
    user.otpExpiresAt = new Date(nowMs() + 10 * 60 * 1000);
    user.otpFailCount = 0;

    await user.save();

    await sendOtpEmail({
      to: email,
      code,
      purpose: "student_login",
      minutes: 10,
    });

    return res.json({ message: "OTP sent to your email" });
  } catch (err) {
    console.error("STUDENT REQUEST OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ======================================================
   STUDENT: Verify OTP + Login
   POST /api/auth/student/verify-otp
====================================================== */
export async function studentVerifyOtp(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const studentId = String(req.body?.studentId || "").trim();
    const otp = String(req.body?.otp || "").trim();

    if (!email || !studentId || !otp) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ role: "student", email, studentId });
    if (!user) return res.status(404).json({ message: "Student not found" });

    if (!user.otpHash || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP requested. Please request OTP again." });
    }

    if (msLeft(user.otpExpiresAt) <= 0) {
      user.otpHash = "";
      user.otpExpiresAt = null;
      user.otpFailCount = 0;
      await user.save();
      return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
    }

    const ok = hashOtp(otp) === user.otpHash;

    if (!ok) {
      user.otpFailCount = (user.otpFailCount || 0) + 1;
      await user.save();

      if (user.otpFailCount >= 5) {
        user.otpHash = "";
        user.otpExpiresAt = null;
        user.otpFailCount = 0;
        await user.save();
        return res.status(429).json({ message: "Too many wrong OTP attempts. Request a new OTP." });
      }

      return res.status(401).json({ message: "Invalid OTP" });
    }

    // ✅ success => clear otp
    user.otpHash = "";
    user.otpExpiresAt = null;
    user.otpFailCount = 0;
    user.otpPurpose = "";
    await user.save();

    req.session.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      studentId: user.studentId ?? null,
      assignedRoomId: user.assignedRoomId ?? null,
    };

    req.session.save(() => res.json(safeUser(user)));
  } catch (err) {
    console.error("STUDENT VERIFY OTP ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ======================================================
   STAFF: Forgot Password (send username+password)
   POST /api/auth/staff/forgot-password
====================================================== */
export async function staffForgotPassword(req, res) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Missing email" });

    const user = await User.findOne({
      email,
      role: { $in: ["admin", "supervisor", "lecturer"] },
    });

    // same message even if not found
    if (!user) {
      return res.json({ message: "If this email exists, we sent your login details." });
    }

    await sendStaffCredentialsEmail({
      to: email,
      username: user.username,
      password: user.password,
    });

    return res.json({ message: "If this email exists, we sent your login details." });
  } catch (err) {
    console.error("STAFF FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
  