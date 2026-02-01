// ============================
// client/src/services/auth.service.js
// ============================
// Uses shared http helper to avoid infinite loading (timeout + consistent errors)
import { http } from "./http.js";

export function loginUser({ username, password }) {
  return http("/api/auth/login", {
    method: "POST",
    body: { username, password },
    timeoutMs: 12000,
  });
}

export function requestStudentOtp({ email, studentId }) {
  return http("/api/auth/student/request-otp", {
    method: "POST",
    body: { email, studentId },
    timeoutMs: 12000,
  });
}

export function verifyStudentOtp({ email, studentId, otp }) {
  return http("/api/auth/student/verify-otp", {
    method: "POST",
    body: { email, studentId, otp },
    timeoutMs: 12000,
  });
}

export function staffForgotPassword(email) {
  return http("/api/auth/staff/forgot-password", {
    method: "POST",
    body: { email },
    timeoutMs: 12000,
  });
}

export function getMe() {
  return http("/api/auth/me", { method: "GET", timeoutMs: 12000 });
}

export function logout() {
  return http("/api/auth/logout", { method: "POST", timeoutMs: 12000 });
}

export function registerUser(payload) {
  return http("/api/auth/register", { method: "POST", body: payload, timeoutMs: 15000 });
}

/* =========================
   Username availability check
   GET /api/auth/check-username?username=...
========================= */
export async function checkUsername(username) {
  const u = String(username || "").trim();
  if (!u) return { taken: false, exists: false };

  const params = new URLSearchParams();
  params.set("username", u);

  const data = await http(`/api/auth/check-username?${params.toString()}`, {
    method: "GET",
    timeoutMs: 12000,
  });

  const taken =
    data === true ||
    data?.taken === true ||
    data?.exists === true ||
    data?.isTaken === true;

  return { taken: Boolean(taken), exists: Boolean(taken) };
}

// ✅ The function RegisterPage expects:
export async function isUsernameTaken(username) {
  const r = await checkUsername(username);
  return Boolean(r?.taken);
}
