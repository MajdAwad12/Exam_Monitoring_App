// client/src/components/dashboard/ActiveClassroomsTabs.jsx
import { useMemo } from "react";

function norm(v) {
  return String(v || "").trim();
}

function makeKey(examId, roomId) {
  return `${norm(examId)}::${norm(roomId)}`;
}

/**
 * Admin helper: quick navigation across ALL active classrooms across ALL running exams.
 * - runningExams: array of exams (each should include classrooms + courseName)
 * - selectedExamId / selectedRoomId: current selection
 * - onPick(examId, roomId): callback when user selects a classroom
 */
export default function ActiveClassroomsTabs({
  runningExams = [],
  selectedExamId = "",
  selectedRoomId = "",
  onPick,
}) {
  const items = useMemo(() => {
    const out = [];
    for (const ex of runningExams || []) {
      const eid = ex?._id || ex?.id;
      const courseName = ex?.courseName || "Exam";

      const rooms = Array.isArray(ex?.classrooms) ? ex.classrooms : [];
      for (const r of rooms) {
        const rid = r?.id || r?.name;
        const roomId = norm(rid);
        if (!roomId || !eid) continue;
        out.push({
          key: makeKey(eid, roomId),
          examId: String(eid),
          roomId,
          label: roomId,
          sub: courseName,
        });
      }
    }

    // unique + stable ordering
    const seen = new Set();
    const unique = [];
    for (const it of out) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      unique.push(it);
    }

    unique.sort((a, b) => {
      if (a.sub !== b.sub) return a.sub.localeCompare(b.sub);
      return a.label.localeCompare(b.label);
    });

    return unique;
  }, [runningExams]);

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900">Active Classrooms</div>
        <div className="text-[11px] font-semibold text-slate-500">
          Quick switch across all running exams
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((it) => {
          const isActive =
            String(selectedExamId || "") === String(it.examId) &&
            norm(selectedRoomId) === norm(it.roomId);

          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onPick?.(it.examId, it.roomId)}
              className={[
                "group rounded-2xl border px-3 py-2 text-left shadow-sm transition",
                isActive
                  ? "border-indigo-300 bg-white ring-2 ring-indigo-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    isActive ? "bg-indigo-500" : "bg-slate-300 group-hover:bg-slate-400",
                  ].join(" ")}
                />
                <div className="text-sm font-extrabold text-slate-900">{it.label}</div>
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500 line-clamp-1">
                {it.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
