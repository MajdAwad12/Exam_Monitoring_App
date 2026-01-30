// client/src/services/dashboard.ADD.DELETE.Students.service.js
//
// ---------------- helpers ----------------
//
const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const normId = (v) => String(v ?? "").trim().replace(/\s+/g, "");
const normRoom = (v) => String(v ?? "").trim();
const normExam = (v) => String(v ?? "").trim();

async function request(url, { method = "GET", body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  // ✅ don’t crash if server returns empty/non-json
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

//
// ---------------- API ----------------
//

/**
 * Add student to exam (running OR by examId if controller supports it)
 */
export async function addStudentToExam({
  examId,
  firstName,
  lastName,
  studentId,
  roomId,
} = {}) {
  const eid = normExam(examId);
  const fn = norm(firstName);
  const ln = norm(lastName);
  const sid = normId(studentId);
  const rid = normRoom(roomId);

  if (!fn) throw new Error("First name is required");
  if (!ln) throw new Error("Last name is required");
  if (!sid) throw new Error("Student ID is required");
  if (!rid) throw new Error("Room is required");

  const payload = {
    firstName: fn,
    lastName: ln,
    studentId: sid,
    roomId: rid,
  };

  // ✅ only send examId if provided
  if (eid) payload.examId = eid;

  return request("/api/dashboard/students/add", {
    method: "POST",
    body: payload,
  });
}

/**
 * Delete student from exam (running OR by examId if supported)
 * Default uses POST (more compatible). Optionally can use DELETE.
 */
export async function deleteStudentFromExam({
  examId,
  studentId,
  useDelete = false,
} = {}) {
  const eid = normExam(examId);
  const sid = normId(studentId);

  if (!sid) throw new Error("Student ID is required");

  const payload = { studentId: sid };
  if (eid) payload.examId = eid;

  return request("/api/dashboard/students/delete", {
    method: useDelete ? "DELETE" : "POST",
    body: payload,
  });
}

/* Backward compatibility */
export const ADD_STUDENT = addStudentToExam;
export const DELETE_STUDENT = deleteStudentFromExam;
