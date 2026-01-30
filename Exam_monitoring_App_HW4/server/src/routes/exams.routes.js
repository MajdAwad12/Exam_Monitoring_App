// ===== file: server/src/routes/exams.routes.js =====
import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";

import {
  getExams,
  getExamById,
  createExam,
  updateAttendance,
  addStudentToExam,
  deleteStudentFromExam,
  startExam,
  endExam,
} from "../controllers/exams.controller.js";

const router = Router();

/* =========================
   Exams
========================= */

// list exams (filtered by role inside controller)
router.get("/", requireAuth, getExams);

// get single exam
router.get("/:examId", requireAuth, getExamById);

// create exam (admin only inside controller)
router.post("/", requireAuth, createExam);

/* =========================
   Attendance updates
========================= */
router.patch("/:examId/attendance/:studentId", requireAuth, updateAttendance);

/* =========================
   Add / Delete students
========================= */
router.post("/:examId/students", requireAuth, addStudentToExam);
router.delete("/:examId/students/:studentId", requireAuth, deleteStudentFromExam);

/* =========================
   Start / End exam
========================= */
router.post("/:examId/start", requireAuth, startExam);
router.post("/:examId/end", requireAuth, endExam);

export default router;
