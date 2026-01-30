// client/src/services/incidents.service.js


async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function logIncident(examId, studentId, payload) {
  const res = await fetch(`/api/incidents/${examId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ studentId, ...(payload || {}) }),
  });
  return handle(res);
}
