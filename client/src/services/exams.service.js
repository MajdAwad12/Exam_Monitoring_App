// ===== file: client/src/services/exams.service.js =====

// ✅ Always same-origin (Vercel rewrites -> Render)
const API_BASE = "";

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// =========================
// Exams
// =========================

export async function getExams() {
  const res = await fetch(`${API_BASE}/api/exams`, {
    method: "GET",
    credentials: "include",
  });
  return handle(res);
}

export async function createExam(payload) {
  const res = await fetch(`${API_BASE}/api/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/**
 * Start exam
 */
export async function startExam(examId, { force = false } = {}) {
  const qs = force ? "?force=1" : "";
  const res = await fetch(`${API_BASE}/api/exams/${examId}/start${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ force: Boolean(force) }),
  });
  return handle(res);
}

/**
 * End exam
 */
export async function endExam(examId) {
  const res = await fetch(`${API_BASE}/api/exams/${examId}/end`, {
    method: "POST",
    credentials: "include",
  });
  return handle(res);
}

// =========================
// Admin
// =========================

export async function updateExamAdmin(examId, payload) {
  const res = await fetch(`${API_BASE}/api/admin/exams/${examId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function deleteExamAdmin(examId) {
  const res = await fetch(`${API_BASE}/api/admin/exams/${examId}`, {
    method: "DELETE",
    credentials: "include",
  });
  return handle(res);
}

export async function getMyReport(examId) {
  const res = await fetch(`${API_BASE}/api/exams/${examId}/my-report`, {
    method: "GET",
    credentials: "include",
  });
  return handle(res);
}

// =========================
// Attendance
// =========================

export async function updateAttendance({ examId, studentId, patch }) {
  const res = await fetch(`${API_BASE}/api/exams/${examId}/attendance/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  return handle(res);
}

export async function getAdminExams(params = {}) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.status && params.status !== "all") usp.set("status", params.status);
  if (params.mode && params.mode !== "all") usp.set("mode", params.mode);
  if (params.from) usp.set("from", params.from);
  if (params.to) usp.set("to", params.to);

  const qs = usp.toString() ? `?${usp.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/admin/exams${qs}`, {
    method: "GET",
    credentials: "include",
  });
  return handle(res);
}
