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

import Toast from "../../components/dashboard/Toast.jsx";

function normRoom(x) {
  return String(x || "").trim();
}

function titleOf(item) {
  const t = String(item?.type || item?.kind || "").toUpperCase();

  if (t === "EXAM_30_MIN_LEFT") return "⏰ 30 Minutes Left";
  if (t === "EXAM_15_MIN_LEFT") return "⏰ 15 Minutes Left";
  if (t === "EXAM_5_MIN_LEFT") return "⏰ 5 Minutes Left";

  if (t === "CALL_LECTURER") return "🗣️ Lecturer Called";
  if (t === "CHEAT_NOTE") return "🧾 Cheat / Incident Note";
  if (t === "TRANSFER_REQUEST") return "🟣 Transfer Requested";
  if (t === "TRANSFER_APPROVED") return "✅ Transfer Approved";
  if (t === "TRANSFER_REJECTED") return "❌ Transfer Rejected";

  return t.replaceAll("_", " ");
}

function msgOf(item) {
  // try common fields without breaking anything
  const note = String(item?.note || item?.message || item?.text || "").trim();
  if (note) return note;

  const who = String(item?.by || item?.createdByName || item?.meta?.by || "").trim();
  const room = String(item?.roomId || item?.classroom || item?.meta?.room || "").trim();
  if (who && room) return `${who} • Room ${room}`;
  if (room) return `Room ${room}`;
  return "New update";
}

function keyOf(item) {
  // stable unique key for "seen"
  const id = String(item?.id || item?._id || "").trim();
  if (id) return id;

  const ts = String(item?.ts || item?.createdAt || item?.at || "").trim();
  const kind = String(item?.type || item?.kind || "").trim();
  const room = String(item?.roomId || item?.classroom || item?.room || "").trim();
  const note = String(item?.note || item?.message || "").trim();
  return `${kind}__${room}__${ts}__${note}`.slice(0, 220);
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
      (t) =>
        normRoom(t?.fromClassroom) === rid ||
        normRoom(t?.toClassroom) === rid
    );
  }, [transfers, selectedRoomId]);

  const eventsForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return events || [];
    return (events || []).filter(
      (e) => normRoom(e?.classroom || e?.roomId || e?.room) === rid
    );
  }, [events, selectedRoomId]);

  const alertsForRoom = useMemo(() => {
    const rid = selectedRoomId;
    if (!rid) return alerts || [];
    return (alerts || []).filter(
      (a) => normRoom(a?.roomId || a?.classroom || a?.room) === rid
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

  // ✅ Toast floating notification
  const [toast, setToast] = useState(null);

  // keep track of seen items so toast triggers only on NEW ones
  const seenRef = useRef(new Set());

  const pushToast = (item, type = "info") => {
    setToast({
      type,
      title: titleOf(item),
      message: msgOf(item),
      durationMs: 2600,
    });
  };

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
      if (String(msg.type || "").includes("INCIDENT") || String(msg.type || "").includes("ALERT") || String(msg.type || "").includes("TRANSFER")) {
        scheduleRefetch();
      }
    };

    window.addEventListener("ws:event", onWs);
    return () => {
      window.removeEventListener("ws:event", onWs);
      clearTimeout(debounceTimer);
    };
  }, [refetch]);

  // ✅ Trigger toast when NEW alert/event appears (after refetch updates arrays)
  useEffect(() => {
    const listA = Array.isArray(alertsForRoom) ? alertsForRoom : [];
    const listE = Array.isArray(eventsForRoom) ? eventsForRoom : [];

    // mark initial snapshot as seen (prevents toast spam on first load)
    if (seenRef.current.size === 0) {
      for (const a of listA) seenRef.current.add(keyOf(a));
      for (const e of listE) seenRef.current.add(keyOf(e));
      return;
    }

    // find newest unseen (prefer alerts)
    for (const a of listA) {
      const k = keyOf(a);
      if (!seenRef.current.has(k)) {
        seenRef.current.add(k);
        pushToast(a, "warning");
        return;
      }
    }

    for (const e of listE) {
      const k = keyOf(e);
      if (!seenRef.current.has(k)) {
        seenRef.current.add(k);
        pushToast(e, "info");
        return;
      }
    }
  }, [alertsForRoom, eventsForRoom]);

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
      {/* ✅ Floating toast cloud */}
      <Toast toast={toast} onClose={() => setToast(null)} />

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
                simNowMs={simNowMs}
                activeRoomId={selectedRoomId}
                maxItems={14}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
