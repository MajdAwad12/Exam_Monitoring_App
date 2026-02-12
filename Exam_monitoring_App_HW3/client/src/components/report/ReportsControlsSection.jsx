import React from "react";

export default function ReportsControlsSection({
  t,
  search,
  setSearch,
  selectedExamId,
  setSelectedExamId,
  filtered,
  selected,
  fmtDateShort,
  downloadBusy,
  onDownloadPdf,
  onDownloadExcel,
  onDownloadCsv,
}) {
  const excelLabelRaw = t("reportsPage.controls.downloadExcel");
  const excelLabel = excelLabelRaw === "reportsPage.controls.downloadExcel" ? "Download Excel" : excelLabelRaw;

  return (
    <section className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("reportsPage.controls.searchLabel")}</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("reportsPage.controls.searchPlaceholder")}
            className="mt-2 w-full rounded-xl px-4 py-2 text-sm
              border border-slate-200 dark:border-slate-800
              bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("reportsPage.controls.selectExamLabel")}</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="mt-2 w-full rounded-xl px-3 py-2 text-sm
              border border-slate-200 dark:border-slate-800
              bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30"
          >
            <option value="">{t("reportsPage.controls.chooseExam")}</option>
            {filtered.map((r) => (
              <option key={r.examId} value={r.examId}>
                {fmtDateShort(r.date)} • {r.courseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onDownloadPdf}
            disabled={!selected || downloadBusy}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {t("reportsPage.controls.downloadPdf")}
          </button>

          <button
            onClick={onDownloadExcel}
            disabled={!selected || downloadBusy}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {excelLabel}
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {selected ? (
            <span>
              {t("reportsPage.controls.selectedPrefix")}{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">{selected.courseName}</span> •{" "}
              {fmtDateShort(selected.date)}
            </span>
          ) : (
            <span>{t("reportsPage.controls.selectExamHint")}</span>
          )}
        </div>
      </div>
    </section>
  );
}
