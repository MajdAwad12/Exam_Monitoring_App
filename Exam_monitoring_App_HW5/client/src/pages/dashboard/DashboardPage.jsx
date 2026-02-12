// client/src/pages/dashboard/DashboardPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOutletContext } from "react-router-dom";
import { useDashboardLive } from "../../hooks/useDashboardLive";
import { useSimClock } from "../../hooks/useSimClock";
import RocketLoader from "../../components/loading/RocketLoader.jsx";

import ExamTabs from "../../components/dashboard/ExamTabs.jsx";
import RoomTabs from "../../components/dashboard/RoomTabs.jsx";
import ExamOverviewCard from "../../components/dashboard/ExamOverviewCard.jsx";
import DashboardAddDeleteStudentsCard from "../../components/dashboard/DashboardAddDeleteStudentsCard.jsx";
import EventsFeed from "../../components/dashboard/EventsFeed.jsx";
import TransfersPanel from "../../components/dashboard/TransfersPanel.jsx";
import ClassroomMap from "../../components/classroom/ClassroomMap.jsx";
import Toast from "../../components/dashboard/Toast.jsx";

import { getAdminExams } from "../../services/exams.service.js";

function normRoom(x) {
  return String(x || "").trim();
}

export default function DashboardPage() {
  const { me, setChatContext } = useOutletContext();
  const { t } = useTranslation();

  const { simNow, simNowMs } = useSimClock();

  // ✅ Only lecturer/admin uses this to switch rooms manually.
  const [roomId, setRoomId] = useState(null);

  // ✅ Admin: choose which RUNNING exam is currently shown in the dashboard
  const [runningExams, setRunningExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examsLoading, setExamsLoading] = useState(false);

  const meRole = useMemo(() => String(me?.role || "").toLowerCase(), [me]);
  const isAdmin = meRole === "admin";
  const canLecturerUX = meRole === "lecturer" || isAdmin;
  const canManageStudents = isAdmin || meRole === "lecturer" || meRole === "supervisor";

  const loadRunningExams = useCallback(async () => {
    if (!isAdmin) return;
    setExamsLoading(true);
    try {
      const res = await getAdminExams({ status: "running" });
      const exams = Array.isArray(res?.exams) ? res.exams : Array.isArray(res) ? res : [];
      setRunningExams(exams);

      // Keep current selection if still exists, otherwise auto-pick first
      setSelectedExamId((prev) => {
        const prevStr = String(prev || "");
        const stillThere = exams.some((e) => String(e?._id || e?.id) === prevStr);
        if (stillThere) return prev;
        const firstId = exams?.[0]?._id || exams?.[0]?.id || null;
        return firstId ? String(firstId) : null;
      });
    } catch {
      // ignore list errors (dashboard snapshot will still show "first running exam")
    } finally {
      setExamsLoading(false);
    }
  }, [isAdmin]);

  // When role becomes admin, load running exams
  useEffect(() => {
    if (isAdmin) loadRunningExams();
  }, [isAdmin, loadRunningExams]);

  // ✅ Dashboard data (actual exam snapshot)
  const {
    me: dashMe,
    exam,
    rooms,
    activeRoom,
    attendance,
    events,
    stats,
    loading,
    error,
    refetch,
    transfers,
    alerts,
    inbox,
  } = useDashboardLive({ examId: isAdmin ? selectedExamId : null, roomId, pollMs: 10000, lite: true });

  const activeRoomId = useMemo(() => {
    return String(activeRoom?.id || activeRoom?.name || "").trim();
  }, [activeRoom]);

  const selectedRoomId = useMemo(() => {
    return String(roomId || activeRoomId || "").trim();
  }, [roomId, activeRoomId]);

  const transfersForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return transfers || [];
    return (transfers || []).filter(
      (t) => normRoom(t?.fromClassroom) === rid || normRoom(t?.toClassroom) === rid
    );
  }, [transfers, selectedRoomId]);

  const eventsForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return events || [];
    return (events || []).filter((e) => normRoom(e?.classroom || e?.roomId || e?.room) === rid);
  }, [events, selectedRoomId]);

  const alertsForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return alerts || [];
    return (alerts || []).filter((a) => normRoom(a?.roomId || a?.classroom || a?.room) === rid);
  }, [alerts, selectedRoomId]);

  const examId = useMemo(() => {
    return exam?.id || exam?._id || null;
  }, [exam]);

  const title = useMemo(() => {
    if (!exam) return "Dashboard";
    const r = selectedRoomId || activeRoomId;
    return r ? `Dashboard • ${exam.courseName} • ${r}` : `Dashboard • ${exam.courseName}`;
  }, [exam, selectedRoomId, activeRoomId]);

  // ✅ Toast (only when we decide it's important)
  const [toast, setToast] = useState(null);

  const toastFromFeed = useCallback(
    (it) => {
      if (!it) return;

      const sev = String(it?.severity || "low").toLowerCase();
      const type =
        sev === "critical" || sev === "high"
          ? "danger"
          : sev === "medium"
          ? "warning"
          : "info";

      const rawType = String(it?.raw?.type || it?.raw?.kind || it?.raw?.eventType || "EVENT").toUpperCase();

      // Try to reuse existing event title translations (fallback to raw type)
      let title = rawType.replaceAll("_", " ");
      if (rawType === "EXAM_30_MIN_LEFT") title = t("dashboard.events.titles.EXAM_30_MIN_LEFT");
      if (rawType === "EXAM_15_MIN_LEFT") title = t("dashboard.events.titles.EXAM_15_MIN_LEFT");
      if (rawType === "EXAM_5_MIN_LEFT") title = t("dashboard.events.titles.EXAM_5_MIN_LEFT");
      if (rawType.includes("TOILET_LONG")) title = t("dashboard.events.titles.TOILET_TOO_LONG");
      if (rawType.includes("TOO_MANY_TOILET") || rawType.includes("TOILET_LIMIT")) title = t("dashboard.events.titles.TOILET_LIMIT_REACHED");
      if (rawType.includes("CALL_LECTURER")) title = t("dashboard.events.titles.CALL_LECTURER");
      if (rawType.includes("VIOLATION")) title = t("dashboard.events.titles.VIOLATION");
      if (rawType.includes("CHEAT")) title = t("dashboard.events.titles.CHEATING_NOTE");
      if (rawType.includes("TRANSFER")) title = t("dashboard.events.titles.TRANSFER");
      if (rawType.includes("ALERT")) title = t("dashboard.events.titles.ALERT");
      if (rawType.includes("INCIDENT")) title = t("dashboard.events.titles.INCIDENT");

      const parts = [];
      if (it?.roomId) parts.push(String(it.roomId));
      if (it?.seat) parts.push(String(it.seat));
      if (it?.name) parts.push(String(it.name));
      if (it?.studentCode) parts.push(String(it.studentCode));
      const head = parts.filter(Boolean).join(" · ");

      const text = String(it?.text || "").trim();
      const message = head && text ? `${head} — ${text}` : head || text;

      setToast({
        type,
        title,
        message,
        duration: 4500,
      });
    },
    [t]
  );


  function showToastFromItem(item) {
    if (!item) return;

    const sev = String(item.severity || "info").toLowerCase();
    const type = String(item.type || item.raw?.type || "").toUpperCase();

    const studentName = item.name || "Student";
    const studentId = item.studentCode || item.studentNumber || "";
    const room = item.roomId ? `Room ${item.roomId}` : "";

    let tTitle = "New update";
    let message = item.text || item.description || "A new event was recorded.";
    let icon = "✅";

    if (type.includes("STUDENT_ADDED") || type.includes("ADD_STUDENT")) {
      tTitle = "Student Added";
      icon = "➕";
      message = `Student added to ${room} — ${studentName} • ${studentId}`;
    } else if (type.includes("STUDENT_REMOVED") || type.includes("DELETE_STUDENT")) {
      tTitle = "Student Removed";
      icon = "🗑️";
      message = `Student removed from the exam — ${studentName} • ${studentId}`;
    } else if (type.includes("TOO_MANY_TOILET") || type.includes("TOILET_LIMIT")) {
      tTitle = "Toilet Limit Reached";
      icon = "🚻";
      message = `${studentName} • ${studentId} exceeded the toilet exit limit (3+)`;
    } else if (type.includes("INCIDENT")) {
      tTitle = "Incident Reported";
      icon = "⚠️";
      message = item.text || "An incident was reported.";
    } else if (type.includes("ALERT")) {
      tTitle = "New Alert";
      icon = "🔔";
      message = item.text || "A new alert was triggered.";
    } else if (type.includes("TRANSFER")) {
      tTitle = "Transfer Update";
      icon = "🔁";
      message = item.text || "A transfer request was updated.";
    }

    setToast({
      title: tTitle,
      message,
      severity: sev,
      icon,
    });
  }

  // ✅ Send context to chat widget
  useEffect(() => {
    const alertsCount = Array.isArray(alertsForRoom) ? alertsForRoom.length : 0;
    const transfersCount = Array.isArray(transfersForRoom) ? transfersForRoom.length : 0;

    setChatContext((prev) => ({
      ...prev,
      screen: "dashboard",
      examId,
      roomId: selectedRoomId || null,
      stats: stats || null,
      alertsCount,
      transfersCount,
    }));
  }, [setChatContext, examId, selectedRoomId, stats, alertsForRoom, transfersForRoom]);

  // ✅ When admin switches exam => reset room selection (so we pick the best active room automatically)
  useEffect(() => {
    if (isAdmin) setRoomId(null);
  }, [isAdmin, selectedExamId]);

  if (loading) return <RocketLoader />;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="font-extrabold text-red-700">{t("dashboard.page.errorTitle")}</div>
          <div className="text-red-700/90 text-sm mt-1">{error}</div>
          <button
            onClick={refetch}
            className="mt-3 px-4 py-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-extrabold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm">
          <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t("dashboard.page.noRunningExamTitle")}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("dashboard.page.noRunningExamHint")}</div>
          <button
            onClick={() => {
              refetch();
              if (isAdmin) loadRunningExams();
            }}
            className="mt-4 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40 font-extrabold text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast
        show={Boolean(toast)}
        type={toast?.type || "info"}
        title={toast?.title}
        message={toast?.message}
        duration={toast?.duration || 4500}
        onClose={() => setToast(null)}
      />

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{title}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t("dashboard.page.liveMonitoringLine", { mode: exam.examMode || "onsite", rooms: rooms?.length || 0 })}
              </div>
            </div>
          </div>

          {/* ✅ Admin: exam selector tabs */}
          {isAdmin ? (
            <div className="mt-5">
              <ExamTabs
                exams={runningExams?.length ? runningExams : [exam]}
                selectedExamId={selectedExamId || examId}
                onSelect={(id) => {
                  setSelectedExamId(String(id));
                  setRoomId(null);
                }}
              />
            </div>
          ) : null}
          {/* ✅ Lecturer/Admin: room selector */}
          {canLecturerUX ? (
            <div className="mt-5">
              <RoomTabs
                rooms={rooms}
                roomId={selectedRoomId || activeRoomId || ""}
                attendance={attendance}
                onChangeRoom={(rid) => setRoomId(String(rid || "").trim() || null)}
              />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-12 gap-5">
  {/* 1) Overview (full width) */}
  <div className="col-span-12">
    <ExamOverviewCard
      me={dashMe || me}
      exam={exam}
      stats={stats}
      inbox={inbox}
      simNow={simNow}
      loading={false}
    />
  </div>

  {/* 2) Add/Delete (full width, its own row) */}
  {canManageStudents ? (
    <div className="col-span-12">
      <DashboardAddDeleteStudentsCard
        examId={examId}
        currentRoomId={selectedRoomId || activeRoomId || ""}
        rooms={rooms}
        meRole={meRole}
        onChanged={refetch}
      />
    </div>
  ) : null}

  {/* 3) Map (full width) */}
  <div className="col-span-12">
    <ClassroomMap
      exam={exam}
      me={dashMe || me}
      refreshNow={refetch}
      nowMs={simNowMs || Date.now()}
      forcedRoomId={selectedRoomId}
      forcedAttendance={attendance}
      forcedTransfers={transfersForRoom}
      allRooms={rooms}
      hideRoomSwitcher={true}
    />
  </div>

  {/* 4) Transfers + Events (unchanged order) */}
  <div className="col-span-12 grid grid-cols-12 gap-5">
    <div className="col-span-12 lg:col-span-6">
      <TransfersPanel
        me={dashMe || me}
        exam={exam}
        items={transfersForRoom}
        loading={false}
        error={""}
        onChanged={refetch}
      />
    </div>

    <div id="events-panel" className="col-span-12 lg:col-span-6">
      <EventsFeed
        examId={exam?.id || exam?._id || selectedExamId}
        meRole={meRole}
        events={eventsForRoom}
        alerts={alertsForRoom}
        activeRoomId={selectedRoomId}
        canFilterRoom={canLecturerUX}
        onNewEvent={toastFromFeed}
      />
    </div>
  </div>
</div>


      </div>
    </>
  );
}