// client/src/services/admin.service.js
import { fetchWithCache, cacheDel } from "./_cache.js";

async function handle(res) {
  if (res.ok) return res.json();

  let data = null;
  try { data = await res.json(); } catch {}

  const msg = data?.message || `Request failed (${res.status})`;
  const err = new Error(msg);
  err.status = res.status;
  err.data = data;
  throw err;
}

// =========================
// Admin: Users
// =========================
export async function listUsers(role = "", { force = false } = {}) {
  const r = String(role || "").trim();
  const qs = r ? `?role=${encodeURIComponent(r)}` : "";
  const key = `admin:users:${r || "all"}`;

  return fetchWithCache(
    key,
    async () => {
      const res = await fetch(`/api/admin/users${qs}`, {
        method: "GET",
        credentials: "include",
      });
      return handle(res);
    },
    { ttlMs: 120_000, force }
  );
}

// =========================
// Admin: Exams
// =========================
export async function updateExamAdmin(examId, payload) {
  const res = await fetch(`/api/admin/exams/${examId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload || {}),
  });
  const data = await handle(res);
  cacheDel("admin:exams:");
  cacheDel("exams:list");
  return data;
}

export async function deleteExamAdmin(examId) {
  const res = await fetch(`/api/admin/exams/${examId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await handle(res);
  cacheDel("admin:exams:");
  cacheDel("exams:list");
  return data;
}

export async function autoAssignDraft(payload) {
  const res = await fetch(`/api/admin/exams/auto-assign-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload || {}),
  });
  return handle(res);
}

export async function autoAssignExam(examId, payload) {
  const res = await fetch(`/api/admin/exams/${examId}/auto-assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload || {}),
  });
  const data = await handle(res);
  cacheDel("admin:exams:");
  cacheDel("exams:list");
  return data;
}
