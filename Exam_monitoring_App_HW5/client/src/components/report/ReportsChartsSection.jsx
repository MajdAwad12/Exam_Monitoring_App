import React from "react";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h4 className="text-lg font-bold mb-1">{title}</h4>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{subtitle}</p> : null}
        </div>
        {right ? <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function ReportsChartsSection({
  t,
  Charts,
  points,
  cheatingSeriesCount,
  toiletSeriesCount,
  teacherSeriesCount,
  attendanceChartData,
  attendanceOptions,
  cheatingChartData,
  cheatingOptions,
  toiletChartData,
  toiletOptions,
  teacherChartData,
  teacherOptions,
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card
        title={t("reportsPage.charts.attendance.title")}
        subtitle={t("reportsPage.charts.attendance.subtitle")}
        right={t("reportsPage.charts.points", { count: points })}
      >
        <div className="h-72">{Charts?.Line ? <Charts.Line data={attendanceChartData} options={attendanceOptions} /> : null}</div>
      </Card>

      <Card
        title={t("reportsPage.charts.cheating.title")}
        subtitle={t("reportsPage.charts.cheating.subtitle")}
        right={t("reportsPage.charts.shownTop", { count: cheatingSeriesCount })}
      >
        <div className="h-72">{Charts?.Bar ? <Charts.Bar data={cheatingChartData} options={cheatingOptions} /> : null}</div>
      </Card>

      <Card
        title={t("reportsPage.charts.toilet.title")}
        subtitle={t("reportsPage.charts.toilet.subtitle")}
        right={t("reportsPage.charts.rooms", { count: toiletSeriesCount })}
      >
        <div className="h-72">{Charts?.Bar ? <Charts.Bar data={toiletChartData} options={toiletOptions} /> : null}</div>
      </Card>

      <Card
        title={t("reportsPage.charts.teacherCalls.title")}
        subtitle={t("reportsPage.charts.teacherCalls.subtitle")}
        right={t("reportsPage.charts.rooms", { count: teacherSeriesCount })}
      >
        <div className="h-72">{Charts?.Bar ? <Charts.Bar data={teacherChartData} options={teacherOptions} /> : null}</div>
      </Card>
    </section>
  );
}
