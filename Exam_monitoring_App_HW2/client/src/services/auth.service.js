//
// client/src/services/auth.service.js

// ✅ If VITE_API_BASE is not defined (Render same-domain),
// this falls back to "" → requests go to /api/...
const API_BASE = import.meta.env.VITE_API_BASE || "";

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
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  return handle(res);
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });
  return handle(res);
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return handle(res);
}

export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
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

  const res = await fetch(
    `${API_BASE}/api/auth/check-username?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await handle(res);

  const taken =
    data === true ||
    data?.taken === true ||
    data?.exists === true ||
    data?.isTaken === true;

  return { taken: Boolean(taken), exists: Boolean(taken) };
}

export async function isUsernameTaken(username) {
  const data = await checkUsername(username);
  return Boolean(data.taken || data.exists);
}

export async function isEmailTaken(_email) {
  return false;
}

export async function existsUser({ username, email }) {
  const params = new URLSearchParams();
  if (username) params.set("username", username);
  if (email) params.set("email", email);

  const res = await fetch(
    `${API_BASE}/api/auth/exists?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  const data = await handle(res);

  if (typeof data.exists === "boolean") return data;
  if (typeof data.taken === "boolean") return { exists: data.taken };

  const existsUsername = Boolean(data.existsUsername);
  const existsEmail = Boolean(data.existsEmail);

  return { exists: existsUsername || existsEmail, existsUsername, existsEmail };
}
