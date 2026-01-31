// client/src/components/dashboard/RoomTabs.jsx
function norm(x) {
  return String(x || "").trim();
}

/**
 * RoomTabs
 * - Supervisor: typically no tabs (only one room) -> caller should hide
 * - Lecturer/Admin: can switch rooms, optionally "All rooms"
 */
export default function RoomTabs({
  rooms = [],
  roomId = null,
  onChangeRoom,
  attendance = [],
  allowAll = false,
}) {
  const list = (rooms || [])
    .map((r) => (typeof r === "string" ? { id: r, name: r } : r))
    .map((r) => ({ id: norm(r?.id || r?.name || r), name: norm(r?.name || r?.id || r) }))
    .filter((r) => Boolean(r.id));

  if (!list.length) return null;

  const ALL = "__ALL__";
  const active = norm(roomId || (allowAll ? ALL : list[0].id)) || (allowAll ? ALL : list[0].id);

  const countInRoom = (rid) => {
    const id = norm(rid);
    if (!id) return 0;
    return (attendance || []).filter((a) => norm(a?.roomId || a?.classroom || a?.room) === id).length;
  };

  const total = (attendance || []).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowAll && (
        <button
          type="button"
          onClick={() => onChangeRoom?.(ALL)}
          className={[
            "px-3 py-2 rounded-2xl text-sm font-extrabold border transition",
            active === ALL
              ? "bg-sky-600 text-white border-sky-600"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
          ].join(" ")}
          title="Show events for all rooms"
        >
          All rooms
          <span className="ml-2 text-[11px] font-black opacity-80">{total}</span>
        </button>
      )}

      {list.map((r) => {
        const isActive = active === r.id;
        const n = countInRoom(r.id);
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChangeRoom?.(r.id)}
            className={[
              "px-3 py-2 rounded-2xl text-sm font-extrabold border transition",
              isActive
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {r.name || r.id}
            <span className="ml-2 text-[11px] font-black opacity-80">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
