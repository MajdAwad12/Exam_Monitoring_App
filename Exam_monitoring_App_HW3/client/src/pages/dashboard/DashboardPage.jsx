// client/src/pages/dashboard/DashboardPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useDashboardLive } from "../../hooks/useDashboardLive";
import { useSimClock } from "../../hooks/useSimClock";
import RocketLoader from "../../components/loading/RocketLoader.jsx";

import RoomTabs from "../../components/dashboard/RoomTabs";
import ExamOverviewCard from "../../components/dashboard/ExamOverviewCard";
import DashboardAddDeleteStudentsCard from "../../components/dashboard/DashboardAddDeleteStudentsCard.jsx";
import EventsFeed from "../../components/dashboard/EventsFeed";
import TransfersPanel from "../../components/dashboard/TransfersPanel";
import ClassroomMap from "../../components/classroom/ClassroomMap";

function normRoom(x) {
  return String(x || "").trim();
}

export default function DashboardPage() {
  const { setChatContext } = useOutletContext();

  // ✅ Only lecturer/admin uses this to switch rooms manually.
  const [roomId, setRoomId] = useState(null);

  const { simNow, simNowMs } = useSimClock();

  // ✅ Turn polling OFF because WS will trigger refetch()
  const {
    me,
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
  } = useDashboardLive({ roomId, pollMs: 0 });

  const meRole = String(me?.role || "").toLowerCase();
  const canLecturerUX = meRole === "lecturer" || meRole === "admin";
  const canManageStudents = canLecturerUX;

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

  // ✅ Side bubble (NOT inside Events panel)
  const [nudge, setNudge] = useState(null);
  const nudgeTimerRef = useRef(null);

  const showNudge = () => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);

    setNudge({
      title: "New event 😊",
      message: "A new update was received. Check Events panel.",
    });

    nudgeTimerRef.current = setTimeout(() => {
      setNudge(null);
      nudgeTimerRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  // ✅ Update global bot context (Dashboard = richest context)
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

      // keep your behavior
      if (msg.type === "EXAM_UPDATED" || msg.type === "EXAM_STARTED" || msg.type === "EXAM_ENDED") {
        scheduleRefetch();
      }

      // also refetch on anything that smells like new activity
      const t = String(msg.type || "");
      if (t.includes("INCIDENT") || t.includes("ALERT") || t.includes("TRANSFER")) {
        scheduleRefetch();
      }
    };

    window.addEventListener("ws:event", onWs);
    return () => {
      window.removeEventListener("ws:event", onWs);
      clearTimeout(debounceTimer);
    };
  }, [refetch]);

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
            onClick={refetch}
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
      {/* ✅ Side floating bubble */}
      {nudge ? (
        <div className="fixed top-5 right-5 z-[9999]">
          <div className="max-w-sm rounded-3xl border border-slate-200 bg-white shadow-lg px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="text-xl">😊</div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-900">{nudge.title}</div>
                <div className="mt-0.5 text-xs text-slate-600">{nudge.message}</div>
              </div>
              <button
                className="ml-2 text-slate-400 hover:text-slate-700 font-extrabold"
                onClick={() => setNudge(null)}
                aria-label="close"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-slate-900 truncate">{title}</h1>
            <p className="text-slate-600 text-sm">Live monitoring • attendance • incidents • transfers</p>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={refetch}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ✅ Only lecturer/admin can switch rooms */}
        {canLecturerUX ? (
          <RoomTabs
            rooms={rooms}
            roomId={selectedRoomId || activeRoomId || ""}
            onChangeRoom={(rid) => setRoomId(String(rid || "").trim() || null)}
          />
        ) : null}

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

            <div className="col-span-12 lg:col-span-6">
              <EventsFeed
                events={eventsForRoom}
                alerts={alertsForRoom}
                activeRoomId={selectedRoomId}
                onNewEvent={() => showNudge()}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
