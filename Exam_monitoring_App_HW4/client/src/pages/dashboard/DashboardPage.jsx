// client/src/pages/dashboard/DashboardPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
  const { setChatContext } = useOutletContext();

  const { simNow, simNowMs } = useSimClock();

  // ✅ Only lecturer/admin uses this to switch rooms manually.
  const [roomId, setRoomId] = useState(null);

  // ✅ Admin: choose which RUNNING exam is currently shown in the dashboard
  const [runningExams, setRunningExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examsLoading, setExamsLoading] = useState(false);

  // Load initial snapshot (no examId until we know the role)
  const { me } = useDashboardLive({ pollMs: 0 });

  const meRole = useMemo(() => String(me?.role || "").toLowerCase(), [me]);
  const isAdmin = meRole === "admin";
  const canLecturerUX = meRole === "lecturer" || isAdmin;
  const canManageStudents = canLecturerUX;

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
  } = useDashboardLive({ examId: isAdmin ? selectedExamId : null, roomId, pollMs: 0 });

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

  // ✅ Listen to global WS events from AppLayout and refresh dashboard data
  useEffect(() => {
    let debounceTimer = null;

    const scheduleRefetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refetch();
      }, 150);
    };

    const onWs = (ev) => {
      const msg = ev?.detail;
      if (!msg || typeof msg !== "object") return;

      // If WS payload has an examId, and admin selected another exam => ignore
      const msgExamId = msg?.examId || msg?.payload?.examId || msg?.data?.examId;
      if (isAdmin && selectedExamId && msgExamId && String(msgExamId) !== String(selectedExamId)) {
        // but still update the running exams list on exam start/end
        if (msg.type === "EXAM_STARTED" || msg.type === "EXAM_ENDED") loadRunningExams();
        return;
      }

      if (msg.type === "EXAM_UPDATED" || msg.type === "EXAM_STARTED" || msg.type === "EXAM_ENDED") {
        scheduleRefetch();
        if (isAdmin && (msg.type === "EXAM_STARTED" || msg.type === "EXAM_ENDED")) loadRunningExams();
      }

      const t = String(msg.type || "");

      if (t.includes("TOO_MANY_TOILET") || t.includes("TOILET_LIMIT")) {
        scheduleRefetch();
        showToastFromItem({
          type: "TOO_MANY_TOILET",
          severity: "medium",
          title: "Toilet limit reached (3+)",
          description: "A student exceeded toilet exits.",
        });
        return;
      }

      if (t.includes("INCIDENT") || t.includes("ALERT") || t.includes("TRANSFER")) {
        scheduleRefetch();
      }
    };

    window.addEventListener("ws:event", onWs);
    return () => {
      window.removeEventListener("ws:event", onWs);
      clearTimeout(debounceTimer);
    };
  }, [refetch, isAdmin, selectedExamId, loadRunningExams]);

  // ✅ When admin switches exam => reset room selection (so we pick the best active room automatically)
  useEffect(() => {
    if (isAdmin) setRoomId(null);
  }, [isAdmin, selectedExamId]);

  if (loading) return <RocketLoader />;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="font-extrabold text-red-700">Dashboard Error</div>
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xl font-extrabold text-slate-900">No running exam</div>
          <div className="mt-1 text-sm text-slate-600">Start an exam to see live monitoring.</div>
          <button
            onClick={() => {
              refetch();
              if (isAdmin) loadRunningExams();
            }}
            className="mt-4 px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-2xl font-black text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-600">
                Live monitoring • {exam.examMode || "onsite"} • {rooms?.length || 0} rooms
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
          <div className="col-span-12">
            <ExamOverviewCard me={me} exam={exam} stats={stats} inbox={inbox} simNow={simNow} loading={false} />
          </div>

          {/* ✅ Admin + Lecturer: Add/Delete Students */}
          {canManageStudents ? (
            <div className="col-span-12">
              <DashboardAddDeleteStudentsCard
                examId={examId}
                currentRoomId={selectedRoomId || activeRoomId || ""}
                rooms={rooms}
                onChanged={refetch}
              />
            </div>
          ) : null}

          <div className="col-span-12">
            <ClassroomMap
              exam={exam}
              me={me}
              refreshNow={refetch}
              nowMs={simNowMs || Date.now()}
              forcedRoomId={selectedRoomId}
              forcedAttendance={attendance}
              forcedTransfers={transfersForRoom}
              allRooms={rooms}
              hideRoomSwitcher={true}
            />
          </div>

          <div className="col-span-12 grid grid-cols-12 gap-5">
            <div className="col-span-12 lg:col-span-6">
              <TransfersPanel me={me} items={transfersForRoom} loading={false} error={""} onChanged={refetch} />
            </div>

            <div id="events-panel" className="col-span-12 lg:col-span-6">
              <EventsFeed me={me} items={eventsForRoom} alerts={alertsForRoom} loading={false} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
