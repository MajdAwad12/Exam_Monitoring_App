import React from "react";

export default function ReportsDetailsSection({ t, selectedExamId, details, detailsLoading, toNum }) {
  return (
    <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-bold">{t("reportsPage.details.title")}</h4>
        {detailsLoading ? (
          <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("reportsPage.details.loading")}</span>
        ) : null}
      </div>

      {!selectedExamId ? (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t("reportsPage.details.pickExam")}</p>
      ) : !details ? (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{t("reportsPage.details.noDetails")}</p>
      ) : (
        <div className="mt-4 space-y-6">
          <div>
            <div className="flex items-end justify-between">
              <h5 className="font-bold text-slate-900 dark:text-slate-100">{t("reportsPage.details.roomBreakdownTitle")}</h5>
              <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("reportsPage.details.roomBreakdownHint")}</div>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.room")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.total")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.present")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.notArrived")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.tempOut")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.absent")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.finished")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.incidents")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.violations")}</th>
                    <th className="px-3 py-2 text-left">{t("reportsPage.table.rate")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(details.roomStats || []).map((r) => (
                    <tr key={r.roomId}>
                      <td className="px-3 py-2 font-bold">{r.roomId}</td>
                      <td className="px-3 py-2">{r.total}</td>
                      <td className="px-3 py-2">{r.present}</td>
                      <td className="px-3 py-2">{r.not_arrived}</td>
                      <td className="px-3 py-2">{r.temp_out}</td>
                      <td className="px-3 py-2">{r.absent}</td>
                      <td className="px-3 py-2">{r.finished}</td>
                      <td className="px-3 py-2">{r.incidents}</td>
                      <td className="px-3 py-2">{r.violations}</td>
                      <td className="px-3 py-2 font-bold">{r.attendanceRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-slate-900 dark:text-slate-100">{t("reportsPage.incidents.title")}</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">{t("reportsPage.incidents.subtitle")}</p>

            <div className="mt-3 space-y-2">
              {(details.incidents || []).length === 0 ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">{t("reportsPage.incidents.empty")}</div>
              ) : (
                (details.incidents || []).map((x, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {x.at ? new Date(x.at).toISOString().replace("T", " ").slice(0, 16) : "-"}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {x.roomId || "-"} {x.seat ? `• ${x.seat}` : ""}
                      </div>
                    </div>
                    <div className="mt-1 font-bold text-sm text-slate-900 dark:text-slate-100">{x.type}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-200 mt-1">{x.description}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2">
                      {t("reportsPage.incidents.severity", { severity: toNum(x.severity, 0) })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {details.notes ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("reportsPage.notes.title")}</div>
              <div className="text-sm text-slate-800 dark:text-slate-100 mt-2 whitespace-pre-wrap">{details.notes}</div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
