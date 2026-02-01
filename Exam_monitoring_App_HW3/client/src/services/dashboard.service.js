// ===== file: client/src/services/dashboard.service.js =====
import { http } from "./http.js";

/**
 * Full snapshot (heavier).
 * Use lite for dashboard to keep UI fast.
 */
export function getDashboardSnapshot({ examId } = {}) {
  const usp = new URLSearchParams();
  if (examId) usp.set("examId", String(examId));
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return http(`/api/dashboard/snapshot${qs}`, { method: "GET" });
}

/**
 * Lite snapshot (recommended).
 * Returns: exam (minimal), attendance, transfers (limited), events, alerts, stats, inbox.
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
