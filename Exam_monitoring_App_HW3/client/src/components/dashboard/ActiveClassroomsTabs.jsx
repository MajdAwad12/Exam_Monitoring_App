// client/src/components/dashboard/ActiveClassroomsTabs.jsx
// Simple tabs for active classrooms (missing file fix).
// Keeps UI lightweight and avoids heavy logic.

function norm(x) {
  return String(x || "").trim();
}

export default function ActiveClassroomsTabs({ classrooms = [], activeId = null, onChange }) {
  const list = Array.isArray(classrooms) ? classrooms : [];
  if (!list.length) return null;

  const current = norm(activeId || list[0]?.id || list[0]?._id || list[0]?.roomId);

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {list.map((c, idx) => {
          const id = norm(c?.id || c?._id || c?.roomId || idx);
          const name = String(c?.name || c?.title || c?.label || c?.roomId || id);
          const isActive = id === current;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange?.(id)}
              className={[
                "px-3 py-2 rounded-xl text-sm font-bold border transition",
                isActive
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300",
              ].join(" ")}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
