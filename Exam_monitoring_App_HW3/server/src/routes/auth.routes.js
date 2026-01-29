// ===============================
// server/src/routes/auth.routes.js
// ===============================
import { Router } from "express";
import {
  login,
  me,
  logout,
  register,
  checkUsername,
  studentRequestOtp,
  studentVerifyOtp,
  staffForgotPassword,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

router.post("/register", register);
router.get("/check-username", checkUsername);

// ✅ Student OTP login
router.post("/student/request-otp", studentRequestOtp);
router.post("/student/verify-otp", studentVerifyOtp);

// ✅ Staff forgot password
router.post("/staff/forgot-password", staffForgotPassword);

export default router;
