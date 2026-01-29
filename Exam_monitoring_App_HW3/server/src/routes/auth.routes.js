import { Router } from "express";
import {
  login,
  me,
  logout,
  register,
  checkUsername,
  studentRequestOtp,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

router.post("/register", register);

// Username availability (used by Register page)
router.get("/check-username", checkUsername);

// ✅ Student OTP (Step 1.3)
router.post("/student/request-otp", studentRequestOtp);

export default router;
