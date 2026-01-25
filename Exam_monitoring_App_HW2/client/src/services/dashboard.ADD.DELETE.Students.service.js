// client/src/services/dashboard.ADD.DELETE.Students.service.js
// Service layer for Admin Add/Delete Student (short, clean).
// Depends on: client/src/api/dashboardStudents.api.js

import { addStudent, deleteStudent } from "../api/dashboardStudents.api.js";

const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ");

const normId = (v) =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, ""); // keep as-is except spaces (IDs often have no spaces)

const normRoom = (v) => String(v ?? "").trim();

/** Admin fills: firstName, lastName, studentId, optional roomId */
export async function ADD_STUDENT({ firstName, lastName, studentId, roomId } = {}) {
  const fn = norm(firstName);
  const ln = norm(lastName);
  const sid = normId(studentId);
  const rid = normRoom(roomId);

  if (!fn) throw new Error("First name is required");
  if (!ln) throw new Error("Last name is required");
  if (!sid) throw new Error("Student ID is required");

  return addStudent({
    firstName: fn,
    lastName: ln,
    studentId: sid,
    roomId: rid || undefined,
  });
}

/** Admin fills: studentId, optional roomId */
export async function DELETE_STUDENT({ studentId, roomId } = {}) {
  const sid = normId(studentId);
  const rid = normRoom(roomId);

  if (!sid) throw new Error("Student ID is required");

  return deleteStudent({
    studentId: sid,
    roomId: rid || undefined,
  });
}
