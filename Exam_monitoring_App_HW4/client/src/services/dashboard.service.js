// ===== file: client/src/services/dashboard.service.js =====

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

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  return handle(res);
}

/**
 * Dashboard snapshot
 * - Server decides visibility by role/permissions
 * - Admin can optionally choose a specific running exam via ?examId=
 */
export function getDashboardSnapshot({ examId } = {}) {
  const usp = new URLSearchParams();
  if (examId) usp.set("examId", String(examId));
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return http(`/api/dashboard/snapshot${qs}`, { method: "GET" });
}


/**
 * Dashboard snapshot (lite)
 * - Faster payload for the Dashboard UI
 * - Excludes heavy report maps and large fields
 */
export function getDashboardSnapshotLite({ examId } = {}) {
  const usp = new URLSearchParams();
  if (examId) usp.set("examId", String(examId));
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return http(`/api/dashboard/snapshot-lite${qs}`, { method: "GET" });
}

export function getClock() {
  return http(`/api/dashboard/clock`, { method: "GET" });
}
