// client/src/components/dashboard/RoomTabs.jsx
import { useTranslation } from "react-i18next";
function norm(x) {
  return String(x || "").trim();
}

export default function RoomTabs({ rooms = [], roomId = null, onChangeRoom, attendance = [] }) {
  const { t } = useTranslation();
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
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{t("dashboard.roomTabs.title")}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("dashboard.common.roomsCount", { count: rooms.length })}</div>
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
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40 hover:border-slate-300",
              ].join(" ")}
              title={t("dashboard.roomTabs.switchToRoomTitle", { name: r.name })}
            >
              <span className="opacity-95">{t("dashboard.common.roomLabel")}</span>
              <span className="tracking-wide">{r.name}</span>

              <span
                className={[
                  "ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200",
                ].join(" ")}
                title={t("dashboard.roomTabs.studentsInRoomTitle")}
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