import * as XLSX from "xlsx";

/**
 * Create a clean, user-friendly XLSX (real Excel file):
 * - Summary sheet (headline metrics)
 * - Rooms sheet (room breakdown table)
 * - Incidents sheet (chronological)
 */
function safeSheetName(name) {
  const s = String(name || "Sheet").trim();
  const cleaned = s.replace(/[\[\]\*\?\/\\:]/g, " ").slice(0, 31);
  return cleaned || "Sheet";
}

function autoWidthFromRows(rows, min = 10, max = 60) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const cols = Object.keys(rows[0] || {});
  return cols.map((k) => {
    let w = k.length;
    for (const r of rows) w = Math.max(w, String(r?.[k] ?? "").length);
    return { wch: Math.max(min, Math.min(max, w + 2)) };
  });
}

export async function downloadExamReportXlsx({ report, examMeta, filename }) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    {
      Field: "Course",
      Value: examMeta?.courseName || report?.courseName || "-",
    },
    {
      Field: "Date",
      Value: String(examMeta?.date || report?.date || "-").split("T")[0],
    },
    {
      Field: "Exam ID",
      Value: examMeta?.examId || report?.examId || "-",
    },
  ];

  // Add some useful aggregates if present
  const rooms = Array.isArray(report?.roomStats) ? report.roomStats : [];
  if (rooms.length) {
    const total = rooms.reduce((a, r) => a + (Number(r.total) || 0), 0);
    const present = rooms.reduce((a, r) => a + (Number(r.present) || 0), 0);
    const incidents = rooms.reduce((a, r) => a + (Number(r.incidents) || 0), 0);
    const violations = rooms.reduce((a, r) => a + (Number(r.violations) || 0), 0);
    const rate = total ? Math.round((present / total) * 100) : 0;

    summaryRows.push(
      { Field: "Total Students", Value: total },
      { Field: "Present", Value: present },
      { Field: "Attendance Rate", Value: `${rate}%` },
      { Field: "Incidents", Value: incidents },
      { Field: "Violations", Value: violations },
    );
  }

  if (report?.notes) {
    summaryRows.push({ Field: "Notes", Value: report.notes });
  }

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows, { header: ["Field", "Value"] });
  wsSummary["!cols"] = autoWidthFromRows(summaryRows, 14, 70);
  XLSX.utils.book_append_sheet(wb, wsSummary, safeSheetName("Summary"));

  const roomRows = rooms.map((r) => ({
    Room: r.roomId ?? "",
    Total: r.total ?? 0,
    Present: r.present ?? 0,
    "Not arrived": r.not_arrived ?? 0,
    "Temp out": r.temp_out ?? 0,
    Absent: r.absent ?? 0,
    Finished: r.finished ?? 0,
    Incidents: r.incidents ?? 0,
    Violations: r.violations ?? 0,
    "Attendance rate": `${r.attendanceRate ?? 0}%`,
  }));
  const wsRooms = XLSX.utils.json_to_sheet(roomRows);
  wsRooms["!cols"] = autoWidthFromRows(roomRows, 10, 40);
  XLSX.utils.book_append_sheet(wb, wsRooms, safeSheetName("Rooms"));

  const incidents = Array.isArray(report?.incidents) ? report.incidents : [];
  const incidentRows = incidents.map((x) => ({
    At: x.at ? new Date(x.at).toISOString().replace("T", " ").slice(0, 16) : "",
    Room: x.roomId ?? "",
    Seat: x.seat ?? "",
    Type: x.type ?? "",
    Severity: x.severity ?? "",
    Description: x.description ?? "",
  }));
  const wsInc = XLSX.utils.json_to_sheet(incidentRows);
  wsInc["!cols"] = autoWidthFromRows(incidentRows, 10, 80);
  XLSX.utils.book_append_sheet(wb, wsInc, safeSheetName("Incidents"));

  XLSX.writeFile(wb, filename || "Exam_Report.xlsx", { compression: true });
}
