// client/src/services/http.js
// Shared HTTP helper: timeout + JSON handling + consistent errors.
// Use across services to avoid "infinite loading" when server/db are slow.

async function parseResponse(res) {
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
        ? String(data.message)
        : typeof data === "string" && data.trim()
        ? data
        : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function http(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
      body:
        options.body && typeof options.body === "object" && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body,
    });
    return await parseResponse(res);
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("Request timeout. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}
