// client/src/services/dashboard.ADD.DELETE.Students.service.js
//
// ---------------- helpers ----------------
//
const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
const normId = (v) => String(v ?? "").trim().replace(/\s+/g, "");
const normRoom = (v) => String(v ?? "").trim();
const normExam = (v) => String(v ?? "").trim();

function mapServerMessage(err) {
  const msg = String(err?.message || "");
  const data = err?.data || {};
  if (msg === "ROOM_FULL" || data?.message === "ROOM_FULL") {
    return "This class is full. Try another room/class.";
  }
  if (msg === "INVALID_ROOM" || data?.message === "INVALID_ROOM") {
    return "Invalid room. Please choose a room from the list.";
  }
  if (msg === "STUDENT_ALREADY_IN_CLASS" || data?.message === "STUDENT_ALREADY_IN_CLASS") {
    const where = data?.where;
    const place = where?.roomId ? ` (${where.roomId}${where.seat ? " " + where.seat : ""})` : "";
    return "Student is already in the class" + place;
  }
  if (msg === "STUDENT_NOT_IN_CLASS" || data?.message === "STUDENT_NOT_IN_CLASS") {
    return "Student is not in this class";
  }
  return "";
}

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
    const msg = data?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    const mapped = mapServerMessage({ message: msg, data });
    if (mapped) err.message = mapped;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

//
// ---------------- API ----------------
//

/**
 * Add student to system (creates a student user).
 */
export async function addStudentToExam({
  examId,
  firstName,
  lastName,
  studentId,
  email,
  roomId,
} = {}) {
  const eid = normExam(examId);
  const fn = norm(firstName);
  const ln = norm(lastName);
  const sid = normId(studentId);
  const em = norm(email);
  const rid = normRoom(roomId);

  if (!fn) throw new Error("First name is required");
  if (!ln) throw new Error("Last name is required");
  if (!sid) throw new Error("Student ID is required");
  
  const payload = {
    firstName: fn,
    lastName: ln,
    studentId: sid,
  };

  if (rid) payload.roomId = rid;

  if (em) payload.email = em;

  // ✅ only send examId if provided
  if (eid) payload.examId = eid;

  return request("/api/dashboard/students/add", {
    method: "POST",
    body: payload,
  });
}

/**
 * Delete student from system (running OR by examId if supported)
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
