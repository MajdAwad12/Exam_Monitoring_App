import { fetchWithCache } from "./_cache.js";
// client/src/services/reports.service.js


async function handle(res) {
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function getReportsList({ page = 1, limit = 100, force = false } = {}) {
  const usp = new URLSearchParams();
  if (page) usp.set("page", String(page));
  if (limit) usp.set("limit", String(limit));
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  const key = `reports:list:${qs}`;
  return fetchWithCache(
    key,
    async () => {
      const res = await fetch(`/api/reports${qs}`, {
        method: "GET",
        credentials: "include",
      });
      return handle(res);
    },
    { ttlMs: 60_000, force }
  );
}


export async function getReportsAnalytics({ force = false } = {}) {
  return fetchWithCache(
    "reports:analytics",
    async () => {
      const res = await fetch(`/api/reports/analytics`, {
        method: "GET",
        credentials: "include",
      });
      return handle(res);
    },
    { ttlMs: 60_000, force }
  );
}


export async function getReportDetails(examId) {
  const res = await fetch(`/api/reports/${examId}`, {
    method: "GET",
    credentials: "include",
  });
  return handle(res);
}

// ---------------- download helpers ----------------

export async function downloadReportPdf(examId, filename = "report.pdf") {
  const res = await fetch(`/api/reports/${examId}/pdf`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadReportCsv(examId, filename = "report.csv") {
  const res = await fetch(`/api/reports/${examId}/csv`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
