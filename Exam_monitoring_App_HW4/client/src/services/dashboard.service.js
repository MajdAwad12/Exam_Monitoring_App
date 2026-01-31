// ===== file: client/src/services/dashboard.service.js =====
import { fetchWithCache } from "./_cache";

// ✅ Support Vercel (prod) via VITE_API_BASE
const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const BASE = API_BASE ? `${API_BASE}/api` : "/api";

async function handle(res) {
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let data;
  try {
    data = isJson ? await res.json() : await res.text();
  } catch {
    data = isJson ? {} : "";
  }

  if (!res.ok) {
    const msg =
      isJson && data && typeof data === "object" && data.message
        ? data.message
        : typeof data === "string" && data.trim()
        ? data
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

async function http(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), options.timeoutMs || 12000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    return await handle(res);
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timeout (server may be waking up)");
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

// =========================
// Dashboard
// =========================

export function getDashboardSnapshot(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return http(`${BASE}/dashboard/snapshot${qs ? `?${qs}` : ""}`, {
    method: "GET",
    timeoutMs: 12000,
  });
}

export function getDashboardSnapshotLite({ roomId } = {}) {
  const qs = new URLSearchParams({ lite: "1", ...(roomId ? { roomId } : {}) }).toString();
  return http(`${BASE}/dashboard/snapshot-lite?${qs}`, {
    method: "GET",
    timeoutMs: 12000,
  });
}

// ✅ Small TTL cache to avoid heavy reload when switching screens quickly
export function getDashboardSnapshotLiteCached({ roomId } = {}, { ttlMs = 4000 } = {}) {
  const key = `dash:lite:${roomId || "all"}`;
  return fetchWithCache(key, () => getDashboardSnapshotLite({ roomId }), { ttlMs });
}
