import React from "react";

function Kpi({ title, value, hint, tone = "slate" }) {
  const tones = {
    slate: "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800",
    sky: "bg-sky-50 border-sky-100 text-sky-900",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-900",
    amber: "bg-amber-50 border-amber-100 text-amber-900",
    rose: "bg-rose-50 border-rose-100 text-rose-900",
    violet: "bg-violet-50 border-violet-100 text-violet-900",
  };

  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${tones[tone]}`}>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold">{title}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}

export default function ReportsKpisSection({ t, kpiAgg }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Kpi title={t("reportsPage.kpis.endedExams.title")} value={kpiAgg.endedExams} tone="sky" hint={t("reportsPage.kpis.endedExams.hint")} />
      <Kpi title={t("reportsPage.kpis.avgAttendance.title")} value={`${kpiAgg.avgAttendanceRate}%`} tone="emerald" hint={t("reportsPage.kpis.avgAttendance.hint")} />
      <Kpi title={t("reportsPage.kpis.cheating.title")} value={kpiAgg.totalCheating} tone="rose" hint={t("reportsPage.kpis.cheating.hint")} />
      <Kpi title={t("reportsPage.kpis.toilet.title")} value={kpiAgg.totalToilet} tone="amber" hint={t("reportsPage.kpis.toilet.hint")} />
      <Kpi title={t("reportsPage.kpis.teacherCalls.title")} value={kpiAgg.totalTeacherCalls} tone="violet" hint={t("reportsPage.kpis.teacherCalls.hint")} />
    </section>
  );
}
