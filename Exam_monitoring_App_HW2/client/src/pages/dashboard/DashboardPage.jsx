// client/src/pages/dashboard/DashboardPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useDashboardLive } from "../../hooks/useDashboardLive";
import { useSimClock } from "../../hooks/useSimClock";
import RocketLoader from "../../components/loading/RocketLoader.jsx";

import RoomTabs from "../../components/dashboard/RoomTabs";
import ExamOverviewCard from "../../components/dashboard/ExamOverviewCard";
import EventsFeed from "../../components/dashboard/EventsFeed";
import TransfersPanel from "../../components/dashboard/TransfersPanel";
import ClassroomMap from "../../components/classroom/ClassroomMap";

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
  const isLecturer = meRole === "lecturer" || meRole === "admin";

  // ✅ MUST be declared before selectedRoomId (avoid TDZ crash in prod build)
  const activeRoomId = useMemo(() => {
    return String(activeRoom?.id || activeRoom?.name || "").trim();
  }, [activeRoom]);

  // ✅ "selected" room = manual selection (roomId) OR current activeRoomId
  const selectedRoomId = useMemo(() => {
    return String(roomId || activeRoomId || "").trim();
  }, [roomId, activeRoomId]);

  // ✅ Filter transfers/events/alerts by selected room (for lecturer/admin UX)
  const transfersForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return transfers || [];
    return (transfers || []).filter(
      (t) =>
        String(t?.fromClassroom || "").trim() === rid ||
        String(t?.toClassroom || "").trim() === rid
    );
  }, [transfers, selectedRoomId]);

  const eventsForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return events || [];
    return (events || []).filter(
      (e) => String(e?.classroom || e?.roomId || "").trim() === rid
    );
  }, [events, selectedRoomId]);

  const alertsForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return alerts || [];
    return (alerts || []).filter(
      (a) => String(a?.roomId || a?.classroom || "").trim() === rid
    );
  }, [alerts, selectedRoomId]);

  const examId = useMemo(() => {
    return exam?.id || exam?._id || null;
  }, [exam]);

  const title = useMemo(() => {
    if (!exam) return "Dashboard";
    const r = selectedRoomId || activeRoomId;
    return r ? `Dashboard • ${exam.courseName} • ${r}` : `Dashboard • ${exam.courseName}`;
  }, [exam, selectedRoomId, activeRoomId]);

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
      }, 150); // debounce small bursts
    };

    const onWs = (ev) => {
      const msg = ev?.detail;
      if (!msg || typeof msg !== "object") return;

      // If you want to filter only your current exam:
      // if (examId && msg.examId && String(msg.examId) !== String(examId)) return;

      if (msg.type === "EXAM_UPDATED") {
        scheduleRefetch();
        return;
      }

      if (msg.type === "EXAM_STARTED" || msg.type === "EXAM_ENDED") {
        scheduleRefetch();
        return;
      }
    };

    window.addEventListener("ws:event", onWs);
    return () => {
      window.removeEventListener("ws:event", onWs);
      clearTimeout(debounceTimer);
    };
  }, [refetch /*, examId */]);

  if (loading) {
    return <RocketLoader />;
  }

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
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 truncate">{title}</h1>
          <p className="text-slate-600 text-sm">
            Live monitoring • attendance • incidents • transfers
          </p>
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
      {isLecturer ? (
        <RoomTabs
          rooms={rooms}
          roomId={selectedRoomId || activeRoomId || ""}
          onChangeRoom={(rid) => setRoomId(String(rid || "").trim() || null)}
        />
      ) : null}

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <ExamOverviewCard
            me={me}
            exam={exam}
            stats={stats}
            inbox={inbox}
            simNow={simNow}
            loading={false}
          />
        </div>

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
            <TransfersPanel
              me={me}
              items={transfersForRoom}
              loading={false}
              error={""}
              onChanged={refetch}
            />
          </div>

          <div className="col-span-12 lg:col-span-6">
            <EventsFeed
              events={eventsForRoom}
              alerts={alertsForRoom}
              simNowMs={simNowMs}
              activeRoomId={selectedRoomId}
              maxItems={14}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
