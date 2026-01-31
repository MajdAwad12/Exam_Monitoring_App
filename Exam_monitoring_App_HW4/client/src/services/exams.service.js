// client/src/services/exams.service.js
import { fetchWithCache } from "./_cache";

// ✅ Support Vercel/Render (prod) via VITE_API_BASE, and local via Vite proxy
const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const BASE = API_BASE ? `${API_BASE}/api` : "/api";

async function handle(res) {
  if (res.ok) return res.json();

  let data = null;
  try { data = await res.json(); } catch {}

  const msg = data?.message || `Request failed (${res.status})`;
  const err = new Error(msg);
  err.status = res.status;
  err.data = data;           // ✅ keep conflicts, details, etc.
  throw err;
}

// =========================
// Exams (public)
// =========================

export async function getExams() {
  const res = await fetch(`${BASE}/exams`, {
    method: "GET",
    credentials: "include",
  });
  return handle(res);
}

// ✅ faster navigation (keeps UI responsive)
export function getExamsCached() {
  return fetchWithCache(
    "exams:list",
    () => getExams(),
    { ttlMs: 15000 }
  );
}

export async function createExam(payload) {
  const res = await fetch(`${BASE}/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/**
 * Start exam
 * - Normal: POST /api/exams/:id/start
 * - Force:  POST /api/exams/:id/start?force=1  (also sends body {force:true} for compatibility)
 */
export async function startExam(examId, { force = false } = {}) {
  const qs = force ? "?force=1" : "";
  const res = await fetch(`${BASE}/exams/${examId}/start${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // ✅ so server can read body too
    credentials: "include",
    body: JSON.stringify({ force: Boolean(force) }), // ✅ supports server body.force as well
  });
  return handle(res);
}

/**
 * End exam
 * - Normal: POST /api/exams/:id/end
 * - Force (admin): POST /api/exams/:id/end?force=1 (also body {force:true})
 */
export async function endExam(examId, { force = false } = {}) {
  const qs = force ? "?force=1" : "";
  const res = await fetch(`${BASE}/exams/${examId}/end${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ force: Boolean(force) }),
  });
  return handle(res);
}

// =========================
// Exams (admin list)
// =========================

/**
 * Admin exams list (used in ManageExams)
 * - cached to reduce reload delays between tabs / pages
 */
export function getAdminExams() {
  return fetchWithCache(
    "admin:exams",
    async () => {
      const res = await fetch(`${BASE}/exams/admin`, { credentials: "include" });
      return handle(res);
    },
    { ttlMs: 15000 }
  );
}
