// client/src/components/dashboard/ExamOverviewCard.jsx
import { useTranslation } from "react-i18next";
import SmartExamClock from "./SmartExamClock";

function fmtDateTime(d) {
  if (!d) return "--";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);
}

function msToHHMMSS(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(
    2,
    "0"
  )}`;
}

export default function ExamOverviewCard({ me, exam, stats, simNow, loading }) {
  const { t } = useTranslation();
  const role = me?.role || "";

  const nowMs = simNow ? simNow.getTime() : null;

  const status = exam?.status || "scheduled";
  const live = status === "running";

  // NOTE: "extra time summary" is shown ONLY in the clock (SmartExamClock).
  // Here we only show base exam details.
  const showEndsIn = false; // keep disabled here to avoid duplicating time/remaining UI

  return (
    <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {t("dashboard.overview.currentExam")}
            </h4>

            {live ? (
              <span className="flex items-center text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                {t("dashboard.overview.liveRunningNow")}
              </span>
            ) : (
              <span className="text-[11px] px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-800">
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {t("dashboard.overview.simTime")}
          </div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {simNow ? fmtDateTime(simNow) : "--"}
          </div>

          {showEndsIn ? (
            <div className="mt-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {t("dashboard.overview.endsIn")}{" "}
              </span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100">
                {msToHHMMSS(0)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
        {loading ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {t("dashboard.overview.loadingExam")}
          </div>
        ) : !exam ? (
          <div className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            {t("dashboard.overview.noRunningExam")}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT */}
            <div className="space-y-3">
              <div>
                {/* Big course title */}
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {exam.courseName}
                </div>

                {/* Course label row */}
                <div className="mt-2 text-base font-extrabold text-slate-700 dark:text-slate-200">
                  {t("dashboard.overview.courseLabel")}:{" "}
                  <span className="text-slate-900 dark:text-slate-100">{exam.courseName}</span>
                </div>
              </div>

              <div className="space-y-3 text-base sm:text-lg text-slate-900 dark:text-slate-100">

              <p className="font-extrabold">
                <span className="text-slate-600 dark:text-slate-400 font-bold">
                  {t("dashboard.overview.startLabel")}:
                </span>{" "}
                <span className="font-black">
                  {fmtDateTime(exam.startAt)}
                </span>
              </p>

              <p className="font-extrabold">
                <span className="text-slate-600 dark:text-slate-400 font-bold">
                  {t("dashboard.overview.endLabel")}:
                </span>{" "}
                <span className="font-black">
                  {fmtDateTime(exam.endAt)}
                </span>
              </p>

              <p className="font-extrabold">
                <span className="text-slate-600 dark:text-slate-400 font-bold">
                  {t("dashboard.overview.lecturerLabel")}:
                </span>{" "}
                <span className="font-black">
                  {exam.lecturer?.name || "--"}
                </span>
              </p>

              <p className="font-extrabold">
                <span className="text-slate-600 dark:text-slate-400 font-bold">
                  {t("dashboard.overview.supervisorsLabel")}:
                </span>{" "}
                <span className="font-black">
                  {(exam.supervisors || [])
                    .map((s) => s?.name)
                    .filter(Boolean)
                    .join(", ") || "--"}
                </span>
              </p>

            </div>

            </div>

            {/* RIGHT */}
            <div className="space-y-3">
              <SmartExamClock exam={exam} nowMs={nowMs || Date.now()} />

              <div className="grid grid-cols-3 gap-2 text-sm">
                <Kpi label={t("dashboard.kpi.notArrived")} value={stats?.notArrived ?? 0} />
                <Kpi label={t("dashboard.kpi.present")} value={stats?.present ?? 0} />
                <Kpi label={t("dashboard.kpi.tempOut")} value={stats?.tempOut ?? 0} />
                <Kpi label={t("dashboard.kpi.moving")} value={stats?.moving ?? 0} />
                <Kpi label={t("dashboard.kpi.finished")} value={stats?.finished ?? 0} />
                <Kpi label={t("dashboard.kpi.violations")} value={stats?.violations ?? 0} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-3 py-2">
      <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
