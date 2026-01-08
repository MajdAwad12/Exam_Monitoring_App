// client/src/services/exams.service.js

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function http(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // ✅ critical
  });

  return handle(res);
}

// =========================
// Exams
// =========================

export function getExams() {
  return http("/api/exams", { method: "GET" });
}

export function createExam(payload) {
  return http("/api/exams", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function startExam(examId, { force = false } = {}) {
  const qs = force ? "?force=1" : "";
  return http(`/api/exams/${examId}/start${qs}`, {
    method: "POST",
    body: JSON.stringify({ force: Boolean(force) }),
  });
}

export function endExam(examId) {
  return http(`/api/exams/${examId}/end`, {
    method: "POST",
  });
}

export function updateExamAdmin(examId, payload) {
  return http(`/api/admin/exams/${examId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteExamAdmin(examId) {
  return http(`/api/admin/exams/${examId}`, {
    method: "DELETE",
  });
}

export function getMyReport(examId) {
  return http(`/api/exams/${examId}/my-report`, {
    method: "GET",
  });
}

// =========================
// Attendance
// =========================

export function updateAttendance({ examId, studentId, patch }) {
  return http(`/api/exams/${examId}/attendance/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function getAdminExams(params = {}) {
  const usp = new URLSearchParams();
  if (params.q) usp.set("q", params.q);
  if (params.status && params.status !== "all") usp.set("status", params.status);
  if (params.mode && params.mode !== "all") usp.set("mode", params.mode);
  if (params.from) usp.set("from", params.from);
  if (params.to) usp.set("to", params.to);

  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return http(`/api/admin/exams${qs}`, { method: "GET" });
}
