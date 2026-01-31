// server/src/routes/dashboard.routes.js
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";

import {
  getClock,
  getDashboardSnapshot,
  addStudentToRunningExam,
  deleteStudentFromRunningExam,
} from "../controllers/dashboard.controller.js";

const router = Router();

/* ---------- base dashboard ---------- */
router.get("/clock", requireAuth, getClock);
router.get("/snapshot", requireAuth, getDashboardSnapshot);

/* ---------- admin actions (students) ---------- */
router.post("/students/add", requireAuth, addStudentToRunningExam);

// נוח ל-Postman/Thunder (כי DELETE עם body לפעמים מציק)
router.post("/students/delete", requireAuth, deleteStudentFromRunningExam);

// אם אתה כן רוצה DELETE אמיתי:
router.delete("/students/delete", requireAuth, deleteStudentFromRunningExam);

export default router;
