// client/src/services/auth.service.js

async function handle(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function loginUser({ username, password }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  return handle(res);
}

export async function requestStudentOtp({ email, studentId }) {
  const res = await fetch("/api/auth/student/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, studentId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function verifyStudentOtp({ email, studentId, otp }) {
  const res = await fetch("/api/auth/student/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, studentId, otp }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}


export async function staffForgotPassword(email) {
  const res = await fetch("/api/auth/staff/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });
  return handle(res);
}

export async function getMe() {
  const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
  return handle(res);
}

export async function logout() {
  const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  return handle(res);
}

export async function registerUser(payload) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function checkUsername(username) {
  const u = String(username || "").trim();
  if (!u) return { taken: false, exists: false };

  const params = new URLSearchParams();
  params.set("username", u);

  const res = await fetch(`/api/auth/check-username?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await handle(res);

  const taken =
    data === true ||
    data?.taken === true ||
    data?.exists === true ||
    data?.isTaken === true;

  return { taken: Boolean(taken), exists: Boolean(taken) };
}
