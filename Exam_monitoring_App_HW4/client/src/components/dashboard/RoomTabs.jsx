// client/src/components/dashboard/RoomTabs.jsx
function norm(x) {
  return String(x || "").trim();
}

export default function RoomTabs({ rooms = [], roomId = null, onChangeRoom, attendance = [] }) {
  if (!rooms?.length) return null;

  const active = norm(roomId || rooms[0]?.id);

  const countInRoom = (rid) => {
    const id = norm(rid);
    if (!id) return 0;
    return (attendance || []).filter((a) => norm(a?.classroom || a?.roomId) === id).length;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900">Classrooms</div>
        <div className="text-xs text-slate-500">{rooms.length} rooms</div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {rooms.map((r) => {
          const rid = norm(r.id);
          const isActive = rid === active;
          const n = countInRoom(rid);

          return (
            <button
              key={rid}
              onClick={() => onChangeRoom?.(rid)}
              className={[
                "group relative inline-flex items-center gap-2 rounded-full border px-3 py-2",
                "text-[12px] font-extrabold transition-all",
                isActive
                  ? "border-sky-600 bg-sky-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
              ].join(" ")}
              title={`Switch to room ${r.name}`}
            >
              <span className="opacity-95">Room</span>
              <span className="tracking-wide">{r.name}</span>

              <span
                className={[
                  "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700",
                ].join(" ")}
                title="Students in this room"
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
