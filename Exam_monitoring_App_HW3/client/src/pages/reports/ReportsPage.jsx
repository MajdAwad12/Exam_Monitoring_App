// client/src/pages/reports/ReportsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import RocketLoader from "../../components/loading/RocketLoader.jsx";
import {
  getReportsList,
  getReportsAnalytics,
  getReportDetails,
  downloadReportCsv,
} from "../../services/reports.service.js";

import ReportsHeaderSection from "../../components/report/ReportsHeaderSection.jsx";
import ReportsErrorBanner from "../../components/report/ReportsErrorBanner.jsx";
import ReportsKpisSection from "../../components/report/ReportsKpisSection.jsx";
import ReportsChartsSection from "../../components/report/ReportsChartsSection.jsx";
import ReportsControlsSection from "../../components/report/ReportsControlsSection.jsx";
import ReportsDetailsSection from "../../components/report/ReportsDetailsSection.jsx";

import ExamReportPDF from "../../components/report/ExamReportPDF.jsx";
import { downloadExamReportXlsx } from "../../components/report/ExamReportEXCEL.js";


/**
 * Lazy-load chart libraries to speed up navigation.
 * (Vite will split these into separate chunks.)
 */
function useLazyCharts() {
  const [Charts, setCharts] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // IMPORTANT (prod stability):
        // Import chart.js first (auto registers), then import react-chartjs-2.
        // Using Promise.all + manual register can trigger TDZ errors after minification.
        await import("chart.js/auto");
        const { Line, Bar } = await import("react-chartjs-2");

        if (alive) setCharts({ Line, Bar });
      } catch (e) {
        console.error("Failed to load charts", e);
        if (alive) setCharts({ error: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return Charts;
}

/* =========================
   Small helpers
========================= */
function toNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function fmtDateShort(d) {
  const s = String(d || "");
  if (!s) return "-";
  return s.includes("T") ? s.split("T")[0] : s;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}



export default function ReportsPage() {
  const { t } = useTranslation();
  const Charts = useLazyCharts();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        // ✅ Fast screen open:
        // 1) Load the reports list first (small + fast)
        const listData = await getReportsList();
        if (!alive) return;

        const exams = Array.isArray(listData?.exams) ? listData.exams : [];

        // keep consistent order for UI lists
        const sorted = [...exams].sort((a, b) => {
          const da = new Date(a?.date || 0).getTime();
          const db = new Date(b?.date || 0).getTime();
          return da - db;
        });

        setAll(sorted);
        setLoading(false);

        // 2) Load analytics in the background (do NOT block navigation)
        try {
          const analyticsData = await getReportsAnalytics();
          if (!alive) return;
          setAnalytics(analyticsData || null);
        } catch (e) {
          // analytics is optional; keep the page usable
          console.warn(t("reportsPage.errors.analyticsFailed"), e);
          if (!alive) return;
          setAnalytics(null);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load reports");
        setAll([]);
        setAnalytics(null);
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) => {
      return (
        String(e.courseName || "").toLowerCase().includes(q) ||
        String(e.date || "").toLowerCase().includes(q) ||
        String((e.rooms || []).join(",")).toLowerCase().includes(q)
      );
    });
  }, [all, search]);

  const selected = useMemo(() => {
    return filtered.find((x) => String(x.examId) === String(selectedExamId)) || null;
  }, [filtered, selectedExamId]);

  async function loadDetails(examId) {
    try {
      setDetailsLoading(true);
      setDetails(null);
      setErr("");
      const d = await getReportDetails(examId);
      setDetails(d);
    } catch (e) {
      setErr(e?.message || "Failed to load report details");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedExamId) {
      setDetails(null);
      return;
    }
    loadDetails(selectedExamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  /* =========================
     KPI Aggregates (from analytics + list)
  ========================= */
  const kpiAgg = useMemo(() => {
    const n = filtered.length || 1;
    const totalStudents = filtered.reduce((acc, x) => acc + toNum(x.totalStudents, 0), 0);
    const avgAttendanceRateFromList = filtered.reduce((acc, x) => acc + toNum(x.attendanceRate, 0), 0) / n;

    const a = analytics?.kpis || {};
    return {
      endedExams: toNum(a.endedExams, filtered.length),
      avgAttendanceRate: Number.isFinite(a.avgAttendanceRate) ? a.avgAttendanceRate : Math.round(avgAttendanceRateFromList * 10) / 10,
      totalCheating: toNum(a.totalCheatingIncidents, 0),
      totalToilet: toNum(a.totalToiletExits, 0),
      totalTeacherCalls: toNum(a.totalTeacherCalls, 0),
      totalStudents,
    };
  }, [analytics, filtered]);

  const examIdSet = useMemo(() => new Set(filtered.map((x) => String(x.examId))), [filtered]);

  /* =========================
     Chart 1: Attendance per exam (X: exams, Y: attended count)
     Using analytics.charts.attendanceSeries but filtered by search
  ========================= */
  const attendanceSeries = useMemo(() => {
    const raw = analytics?.charts?.attendanceSeries || [];
    const safe = raw.filter((x) => examIdSet.has(String(x.examId)));
    return safe;
  }, [analytics, examIdSet]);

  const attendanceChartData = useMemo(() => {
    const labels = attendanceSeries.map((x) => {
      const lab = String(x.label || "Exam");
      return lab.length > 22 ? `${lab.slice(0, 22)}…` : lab;
    });
    const attended = attendanceSeries.map((x) => toNum(x.attended, 0));
    const totals = attendanceSeries.map((x) => toNum(x.total, 0));

    return {
      labels,
      datasets: [
        {
          label: "Attended (count)",
          data: attended,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          fill: true,
        },
        {
          label: "Total students",
          data: totals,
          tension: 0.25,
          borderWidth: 2,
          pointRadius: 0,
          borderColor: "rgba(15, 23, 42, 0.35)",
          backgroundColor: "rgba(15, 23, 42, 0.06)",
          fill: false,
        },
      ],
    };
  }, [attendanceSeries]);

  const attendanceOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { boxWidth: 10 } },
        tooltip: {
          intersect: false,
          mode: "index",
          callbacks: {
            label(ctx) {
              const v = ctx.parsed?.y;
              return `${ctx.dataset?.label}: ${v}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: "rgba(15, 23, 42, 0.08)" },
        },
        x: {
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          grid: { display: false },
        },
      },
    };
  }, []);

  /* =========================
     Chart 2: Cheating incidents per supervisor (Bar)
  ========================= */
  const cheatingSeries = useMemo(() => {
    const raw = analytics?.charts?.cheatingSeries || [];
    return raw.slice(0, 12); // top 12 so it stays clean
  }, [analytics]);

  const cheatingChartData = useMemo(() => {
    const labels = cheatingSeries.map((x) => {
      const n = String(x.name || "Supervisor");
      return n.length > 16 ? `${n.slice(0, 16)}…` : n;
    });
    const data = cheatingSeries.map((x) => toNum(x.count, 0));

    return {
      labels,
      datasets: [
        {
          label: "Cheating / Copy incidents",
          data,
          borderRadius: 10,
          backgroundColor: "rgba(225, 29, 72, 0.20)",
          borderColor: "#e11d48",
          borderWidth: 2,
        },
      ],
    };
  }, [cheatingSeries]);

  const cheatingOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `Incidents: ${ctx.parsed?.y ?? 0}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: "rgba(15, 23, 42, 0.08)" },
        },
        x: {
          grid: { display: false },
        },
      },
    };
  }, []);

  /* =========================
     Chart 3: Toilet exits per room (Bar)
  ========================= */
  const toiletSeries = useMemo(() => analytics?.charts?.toiletSeries || [], [analytics]);
  const toiletChartData = useMemo(() => {
    const labels = toiletSeries.map((x) => String(x.roomId || "UNKNOWN"));
    const data = toiletSeries.map((x) => toNum(x.count, 0));
    return {
      labels,
      datasets: [
        {
          label: "Toilet exits",
          data,
          borderRadius: 10,
          backgroundColor: "rgba(245, 158, 11, 0.22)",
          borderColor: "#f59e0b",
          borderWidth: 2,
        },
      ],
    };
  }, [toiletSeries]);

  const toiletOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: "rgba(15, 23, 42, 0.08)" },
        },
        x: { grid: { display: false } },
      },
    };
  }, []);

  /* =========================
     Chart 4: Teacher calls per room (Bar)
  ========================= */
  const teacherSeries = useMemo(() => analytics?.charts?.teacherSeries || [], [analytics]);
  const teacherChartData = useMemo(() => {
    const labels = teacherSeries.map((x) => String(x.roomId || "UNKNOWN"));
    const data = teacherSeries.map((x) => toNum(x.count, 0));
    return {
      labels,
      datasets: [
        {
          label: "Teacher calls",
          data,
          borderRadius: 10,
          backgroundColor: "rgba(16, 185, 129, 0.20)",
          borderColor: "#10b981",
          borderWidth: 2,
        },
      ],
    };
  }, [teacherSeries]);

  const teacherOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: "rgba(15, 23, 42, 0.08)" },
        },
        x: { grid: { display: false } },
      },
    };
  }, []);

  async function onDownloadPdf() {
    if (!selected) return;
    try {
      setDownloadBusy(true);
      setErr("");
      const safe = String(selected.courseName || "Exam").replace(/[^\w]+/g, "_");
      const filename = `Report_${safe}_${fmtDateShort(selected.date)}.pdf`;

      // Ensure details exist (PDF uses full details)
      let report = details;
      if (!report || report?.examId !== selected.examId) {
        report = await getReportDetails(selected.examId);
      }

      // Lazy-load react-pdf runtime for faster navigation
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<ExamReportPDF report={report} examMeta={selected} />).toBlob();
      downloadBlob(blob, filename);
    } catch (e) {
      // fallback to server PDF if available (keeps older behavior)
      try {
        const { downloadReportPdf } = await import("../../services/reports.service.js");
        const safe = String(selected.courseName || "Exam").replace(/[^\w]+/g, "_");
        await downloadReportPdf(selected.examId, `Report_${safe}_${fmtDateShort(selected.date)}.pdf`);
      } catch {}
      setErr(e?.message || "PDF download failed");
    } finally {
      setDownloadBusy(false);
    }
  }

  async function onDownloadExcel() {
    if (!selected) return;
    try {
      setDownloadBusy(true);
      setErr("");
      const safe = String(selected.courseName || "Exam").replace(/[^\w]+/g, "_");
      const filename = `Report_${safe}_${fmtDateShort(selected.date)}.xlsx`;

      let report = details;
      if (!report || report?.examId !== selected.examId) {
        report = await getReportDetails(selected.examId);
      }

      await downloadExamReportXlsx({ report, examMeta: selected, filename });
    } catch (e) {
      setErr(e?.message || "Excel download failed");
    } finally {
      setDownloadBusy(false);
    }
  }

  async function onDownloadCsv() {
    if (!selected) return;
    try {
      setDownloadBusy(true);
      setErr("");
      const safe = String(selected.courseName || "Exam").replace(/[^\w]+/g, "_");
      await downloadReportCsv(selected.examId, `Report_${safe}_${fmtDateShort(selected.date)}.csv`);
    } catch (e) {
      setErr(e?.message || "CSV download failed");
    } finally {
      setDownloadBusy(false);
    }
  }

 if (loading) {
  return <RocketLoader />;
}

  const points = clamp(filtered.length, 0, 500);

  return (
    <section className="p-4 sm:p-6 lg:p-10 space-y-8 bg-slate-50 dark:bg-slate-900/40 min-h-full">
      <ReportsHeaderSection
        title={t("reportsPage.title")}
        subtitle={t("reportsPage.subtitle")}
      />

      <ReportsErrorBanner
        err={err}
        title={t("reportsPage.errorTitle")}
      />

      <ReportsKpisSection t={t} kpiAgg={kpiAgg} />

      <ReportsChartsSection
        t={t}
        Charts={Charts}
        points={points}
        cheatingSeriesCount={cheatingSeries.length}
        toiletSeriesCount={toiletSeries.length}
        teacherSeriesCount={teacherSeries.length}
        attendanceChartData={attendanceChartData}
        attendanceOptions={attendanceOptions}
        cheatingChartData={cheatingChartData}
        cheatingOptions={cheatingOptions}
        toiletChartData={toiletChartData}
        toiletOptions={toiletOptions}
        teacherChartData={teacherChartData}
        teacherOptions={teacherOptions}
      />

      <ReportsControlsSection
        t={t}
        search={search}
        setSearch={setSearch}
        selectedExamId={selectedExamId}
        setSelectedExamId={setSelectedExamId}
        filtered={filtered}
        selected={selected}
        fmtDateShort={fmtDateShort}
        downloadBusy={downloadBusy}
        onDownloadPdf={onDownloadPdf}
        onDownloadExcel={onDownloadExcel}
        onDownloadCsv={onDownloadCsv}
      />

      <ReportsDetailsSection
        t={t}
        selectedExamId={selectedExamId}
        details={details}
        detailsLoading={detailsLoading}
        fmtDateShort={fmtDateShort}
        toNum={toNum}
      />
    </section>
  );
}

  