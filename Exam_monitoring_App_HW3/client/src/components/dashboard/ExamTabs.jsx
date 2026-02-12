// client/src/components/dashboard/ExamTabs.jsx
import { useTranslation } from "react-i18next";
function fmtTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function safeStr(x) {
  return String(x || "").trim();
}

export default function ExamTabs({ exams = [], selectedExamId = null, onSelect }) {
  const { t } = useTranslation();
  if (!exams?.length) return null;

  const activeId = safeStr(selectedExamId || exams?.[0]?._id || exams?.[0]?.id);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t("dashboard.examTabs.title")}
            </div>
            <div className="text-base font-semibold text-red-600 mt-1">
            {t("dashboard.examTabs.subtitle")} 
            </div>

        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("dashboard.examTabs.runningCount", { count: exams.length })}</div>
      </div>

      <div className="mt-2 -mx-1 overflow-x-auto">
        <div className="flex gap-2 px-1 pb-1 min-w-max">
          {exams.map((ex) => {
            const id = safeStr(ex?._id || ex?.id);
            const isActive = id === activeId;

            const rooms = Array.isArray(ex?.classrooms) ? ex.classrooms : [];
            const roomCount = rooms.length || 0;

            const start = ex?.startAt ? fmtTime(ex.startAt) : "";
            const end = ex?.endAt ? fmtTime(ex.endAt) : "";

            return (
              <button
                key={id}
                onClick={() => onSelect?.(id)}
                className={[
                  "relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                  "min-w-[240px] md:min-w-[280px]",
                  isActive
                    ? "border-sky-600 bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40 hover:border-slate-300 text-slate-800 dark:text-slate-100",
                ].join(" ")}
                title={t("dashboard.examTabs.switchToTitle", { name: ex?.courseName || t("dashboard.common.examFallback") })}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-black leading-none line-clamp-1">
                      {ex?.courseName || t("dashboard.common.untitledExam")}
                    </div>
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black",
                        isActive ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                      ].join(" ")}
                    >
                      {t("dashboard.common.running")}
                    </span>
                  </div>

                  <div className={["mt-1 text-[11px]", isActive ? "text-white/85" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"].join(" ")}>
                    {start && end ? `${start} → ${end}` : start ? t("dashboard.common.startedAt", { time: start }) : t("dashboard.common.live")}
                    {" • "}
                    {t("dashboard.common.roomsCount", { count: roomCount })}
                  </div>

                  <div className={["mt-1 text-[11px] line-clamp-1", isActive ? "text-white/85" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"].join(" ")}>
                    {t("dashboard.common.modeLabel")}: {safeStr(ex?.examMode || "onsite")} • {t("dashboard.common.dateLabel")}:{" "}
                    {ex?.examDate ? new Date(ex.examDate).toLocaleDateString() : t("dashboard.common.na")}
                  </div>
                </div>

                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black",
                    isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-900",
                  ].join(" ")}
                >
                  {roomCount}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}