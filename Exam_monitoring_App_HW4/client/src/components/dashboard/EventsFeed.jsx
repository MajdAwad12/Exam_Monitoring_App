// client/src/components/dashboard/EventsFeed.jsx
import { useMemo } from "react";

function fmtTime(d) {
  const dt = new Date(d || Date.now());
  if (Number.isNaN(dt.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(dt);
}

function sevMeta(sev) {
  const s = String(sev || "low").toLowerCase();
  if (s === "critical") return { dot: "bg-rose-600", pill: "bg-rose-50 text-rose-800 border-rose-200" };
  if (s === "high") return { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-800 border-rose-200" };
  if (s === "medium") return { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-800 border-amber-200" };
  return { dot: "bg-slate-400", pill: "bg-slate-50 text-slate-700 border-slate-200" };
}

function normRoom(x) {
  return String(x || "").trim();
}

function normalizeEventItem(x) {
  if (!x) return null;

  // event item (from exam.events)
  if (x.timestamp || x.type) {
    return {
      kind: "event",
      type: String(x.type || ""),
      at: x.timestamp || x.at || x.time || new Date().toISOString(),
      severity: x.severity || "low",
      description: x.description || "",
      roomId: normRoom(x.classroom || x.roomId || x.room),
      classroom: normRoom(x.classroom || x.roomId || x.room),
      seat: String(x.seat || ""),
      studentId: x.studentId ? String(x.studentId) : "",
      studentName: x.studentName || "",
      studentNumber: x.studentNumber || "",
    };
  }

  // alert item (computed)
  if (x.type && (x.at || x.elapsedMs != null)) {
    return {
      kind: "alert",
      type: String(x.type || ""),
      at: x.at || new Date().toISOString(),
      severity: x.severity || "low",
      description: x.description || "",
      roomId: normRoom(x.roomId || x.classroom || x.room),
      classroom: normRoom(x.roomId || x.classroom || x.room),
      seat: String(x.seat || ""),
      studentId: x.studentId ? String(x.studentId) : "",
      studentName: x.name || "",
      studentNumber: x.studentCode || "",
      elapsedMs: x.elapsedMs,
    };
  }

  return null;
}

export default function EventsFeed({
  events = [],
  alerts = [],
  selectedRoomId = "__ALL__",
  allowAllRooms = false,
  title = "Events",
}) {
  const ALL = "__ALL__";
  const rid = normRoom(selectedRoomId);

  const items = useMemo(() => {
    const ev = (events || []).map(normalizeEventItem).filter(Boolean);
    const al = (alerts || []).map(normalizeEventItem).filter(Boolean);

    const merged = [...ev, ...al];

    // filter by room if needed
    const filtered =
      allowAllRooms && (rid === "" || rid === ALL)
        ? merged
        : merged.filter((x) => {
            const r = normRoom(x.roomId || x.classroom);
            return r && r === rid;
          });

    // newest first
    filtered.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    // keep reasonable size
    return filtered.slice(0, 120);
  }, [events, alerts, rid, allowAllRooms]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900">
          {title}
          {allowAllRooms ? (
            <span className="ml-2 text-xs text-slate-500 font-bold">
              {rid === ALL || rid === "" ? "• All rooms" : `• Room ${rid}`}
            </span>
          ) : rid ? (
            <span className="ml-2 text-xs text-slate-500 font-bold">• Room {rid}</span>
          ) : null}
        </div>
        <div className="text-xs text-slate-500 font-bold">{items.length}</div>
      </div>

      <div className="p-4 space-y-2 max-h-[420px] overflow-auto">
        {items.length === 0 ? (
          <div className="text-sm text-slate-600">No events yet.</div>
        ) : (
          items.map((it, idx) => {
            const meta = sevMeta(it.severity);
            const label = String(it.type || "").replaceAll("_", " ");
            const who =
              it.studentName || it.studentNumber
                ? `${it.studentName || "Student"}${it.studentNumber ? ` (${it.studentNumber})` : ""}`
                : "";
            const room = it.roomId ? `Room ${it.roomId}` : "";
            const where = [room, it.seat ? `Seat ${it.seat}` : ""].filter(Boolean).join(" • ");

            return (
              <div key={`${it.kind}-${it.type}-${it.at}-${idx}`} className="flex items-start gap-3">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-xl border text-[11px] font-extrabold ${meta.pill}`}>
                        {it.kind === "alert" ? "ALERT" : "EVENT"}
                      </span>
                      <span className="ml-2 text-sm font-extrabold text-slate-900">{label || "Event"}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-bold">{fmtTime(it.at)}</div>
                  </div>

                  {who ? <div className="text-xs text-slate-600 font-semibold mt-0.5">{who}</div> : null}
                  {where ? <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{where}</div> : null}

                  {it.description ? (
                    <div className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{it.description}</div>
                  ) : null}

                  {typeof it.elapsedMs === "number" ? (
                    <div className="text-[11px] text-slate-500 font-bold mt-1">
                      Elapsed: {Math.floor(it.elapsedMs / 60000)}m {Math.floor((it.elapsedMs % 60000) / 1000)}s
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
