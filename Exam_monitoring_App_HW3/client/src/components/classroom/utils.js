// ===== file: client/src/components/classroom/utils.js =====

export function msToMMSS(ms = 0) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

// client/src/components/classroom/utils.js
export function parseSeat(seat) {
  const s = String(seat || "").trim().toUpperCase();
  if (!s) return null;

  if (s === "AUTO") return null; // AUTO means server will assign later

  // ✅ Support: R1-C1 or R1C1
  let m = s.match(/^R(\d+)\s*[- ]?\s*C(\d+)$/);
  if (m) return { r: Number(m[1]), c: Number(m[2]) };

  // ✅ Support: 1-1 or 1,1
  m = s.match(/^(\d+)\s*[-,]\s*(\d+)$/);
  if (m) return { r: Number(m[1]), c: Number(m[2]) };

  return null;
}



export function seatLabelFromRC(r, c) {
  return `R${r}-C${c}`;
}

export function normalizeStatus(s) {
  const x = String(s || "").trim().toLowerCase();

  // server raw statuses
  if (x === "temp_out") return "out";
  if (x === "moving") return "waiting_transfer";

  if (x === "present") return "present";
  if (x === "out") return "out";
  if (x === "finished") return "finished";
  if (x === "absent") return "absent";
  if (x === "not_arrived") return "not_arrived";
  if (x === "waiting_transfer") return "waiting_transfer";

  // unknown => default
  return "not_arrived";
}

export function statusMeta(status) {
  const s = normalizeStatus(status);

  if (s === "present") {
    return {
      label: "Present",
      text: "✅ Present",
      pill: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/35 dark:border-emerald-900/60 dark:text-emerald-100",
      card: "bg-emerald-50/60 border-emerald-200 text-emerald-900 dark:bg-emerald-950/25 dark:border-emerald-900/60 dark:text-emerald-100",
      seat: "bg-emerald-500",
    };
  }

  if (s === "finished") {
    return {
      label: "Finished",
      text: "🟥 Finished",
      pill: "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/35 dark:border-rose-900/60 dark:text-rose-100",
      card: "bg-rose-50/60 border-rose-200 text-rose-900 dark:bg-rose-950/25 dark:border-rose-900/60 dark:text-rose-100",
      seat: "bg-rose-500",
    };
  }

  if (s === "out") {
    return {
      label: "Out of room",
      text: "🚻 Out",
      pill: "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/35 dark:border-amber-900/60 dark:text-amber-100",
      card: "bg-amber-50/60 border-amber-200 text-amber-900 dark:bg-amber-950/25 dark:border-amber-900/60 dark:text-amber-100",
      seat: "bg-amber-500",
    };
  }

  if (s === "waiting_transfer") {
    return {
      label: "Waiting transfer",
      text: "🟣 Transfer",
      pill: "bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-950/35 dark:border-purple-900/60 dark:text-purple-100",
      card: "bg-purple-50/60 border-purple-200 text-purple-900 dark:bg-purple-950/25 dark:border-purple-900/60 dark:text-purple-100",
      seat: "bg-purple-500",
    };
  }

  if (s === "absent") {
    return {
      label: "Absent",
      text: "❌ Absent",
      pill: "bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100",
      card: "bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100",
      seat: "bg-slate-500",
    };
  }

  return {
    label: "Not arrived",
    text: "⏳ Not arrived",
    pill: "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/30 dark:border-slate-700 dark:text-slate-100",
    card: "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/25 dark:border-slate-700 dark:text-slate-100",
    seat: "bg-slate-300",
  };
}

export function safeId(a) {
  return a?.studentNumber || a?.studentIdNumber || a?.studentCode || a?.studentIdText || "";
}

export function safeName(a) {
  return a?.name || a?.fullName || "";
}

/** One stable key for server calls */
export function safeStudentKey(a) {
  if (a?.studentId) return String(a.studentId);
  const id = safeId(a);
  if (id) return String(id);
  return "";
}
