import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    color: "#0f172a",
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#475569",
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpi: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 8,
  },
  kpiLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: 800,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  trHead: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  th: {
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    color: "#334155",
  },
  td: {
    padding: 6,
    fontSize: 9,
  },
  muted: { color: "#64748b" },
  badge: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    fontSize: 8,
    color: "#334155",
  },
  noteBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 8,
    color: "#0f172a",
  },
});

function fmtDate(d) {
  const s = String(d || "");
  return s.includes("T") ? s.split("T")[0] : s || "-";
}

function rowSum(rooms, key) {
  return (rooms || []).reduce((a, r) => a + (Number(r?.[key]) || 0), 0);
}

export default function ExamReportPDF({ report, examMeta }) {
  const rooms = Array.isArray(report?.roomStats) ? report.roomStats : [];
  const incidents = Array.isArray(report?.incidents) ? report.incidents : [];

  const total = rowSum(rooms, "total");
  const present = rowSum(rooms, "present");
  const rate = total ? Math.round((present / total) * 100) : 0;
  const violations = rowSum(rooms, "violations");
  const incCount = incidents.length;

  const courseName = examMeta?.courseName || report?.courseName || "Exam Report";
  const date = fmtDate(examMeta?.date || report?.date);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{courseName}</Text>
          <Text style={styles.subtitle}>
            Date: {date}   •   Exam ID: {examMeta?.examId || report?.examId || "-"}
          </Text>
        </View>

        <View style={[styles.section, { marginTop: 0 }]}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Total students</Text>
              <Text style={styles.kpiValue}>{total}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Present</Text>
              <Text style={styles.kpiValue}>{present}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Attendance rate</Text>
              <Text style={styles.kpiValue}>{rate}%</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Incidents</Text>
              <Text style={styles.kpiValue}>{incCount}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Violations</Text>
              <Text style={styles.kpiValue}>{violations}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room breakdown</Text>

          <View style={styles.table}>
            <View style={styles.trHead}>
              <Text style={[styles.th, { width: "14%" }]}>Room</Text>
              <Text style={[styles.th, { width: "10%" }]}>Total</Text>
              <Text style={[styles.th, { width: "10%" }]}>Present</Text>
              <Text style={[styles.th, { width: "12%" }]}>Not arrived</Text>
              <Text style={[styles.th, { width: "10%" }]}>Temp out</Text>
              <Text style={[styles.th, { width: "10%" }]}>Absent</Text>
              <Text style={[styles.th, { width: "10%" }]}>Finished</Text>
              <Text style={[styles.th, { width: "12%" }]}>Rate</Text>
              <Text style={[styles.th, { width: "12%" }]}>Violations</Text>
            </View>

            {rooms.length === 0 ? (
              <View style={styles.tr}>
                <Text style={[styles.td, styles.muted]}>No room data.</Text>
              </View>
            ) : (
              rooms.map((r, idx) => (
                <View style={styles.tr} key={idx}>
                  <Text style={[styles.td, { width: "14%" }]}>{r.roomId}</Text>
                  <Text style={[styles.td, { width: "10%" }]}>{r.total}</Text>
                  <Text style={[styles.td, { width: "10%" }]}>{r.present}</Text>
                  <Text style={[styles.td, { width: "12%" }]}>{r.not_arrived}</Text>
                  <Text style={[styles.td, { width: "10%" }]}>{r.temp_out}</Text>
                  <Text style={[styles.td, { width: "10%" }]}>{r.absent}</Text>
                  <Text style={[styles.td, { width: "10%" }]}>{r.finished}</Text>
                  <Text style={[styles.td, { width: "12%" }]}>{r.attendanceRate}%</Text>
                  <Text style={[styles.td, { width: "12%" }]}>{r.violations}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incidents</Text>
          {incidents.length === 0 ? (
            <Text style={styles.muted}>No incidents recorded.</Text>
          ) : (
            incidents.slice(0, 20).map((x, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={styles.badge}>{x.at ? new Date(x.at).toISOString().replace("T", " ").slice(0, 16) : "-"}</Text>
                  <Text style={styles.badge}>
                    {(x.roomId || "-") + (x.seat ? ` • ${x.seat}` : "")}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: 700 }}>{x.type}</Text>
                <Text style={{ fontSize: 9 }}>{x.description}</Text>
                <Text style={[styles.muted, { marginTop: 2 }]}>Severity: {x.severity}</Text>
              </View>
            ))
          )}
          {incidents.length > 20 ? (
            <Text style={[styles.muted, { marginTop: 6 }]}>Showing first 20 incidents (export Excel for full list).</Text>
          ) : null}
        </View>

        {report?.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.noteBox}>
              <Text>{String(report.notes)}</Text>
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
