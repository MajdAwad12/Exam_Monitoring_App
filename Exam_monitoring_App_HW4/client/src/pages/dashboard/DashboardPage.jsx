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

const ALL_ROOMS = "__ALL__";

export default function DashboardPage() {
  const { me, setChatContext } = useOutletContext();
  const { simNow, simNowMs } = useSimClock();
  const meRole = String(me?.role || "").toLowerCase();

  const isAdmin = meRole === "admin";
  const isLecturer = meRole === "lecturer";
  const isSupervisor = meRole === "supervisor";
  const canPickRooms = isAdmin || isLecturer;

  // Admin: choose which running exam to view
  const [adminExams, setAdminExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");

  // Lecturer/Admin: choose room (or all)
  const [pickedRoomId, setPickedRoomId] = useState(ALL_ROOMS);

  // ---- load admin running exams list ----
  useEffect(() => {
    let alive = true;
    if (!isAdmin) return;

    (async () => {
      try {
        const res = await getAdminExams();
        if (!alive) return;
        const list = Array.isArray(res) ? res : res?.exams || [];
        setAdminExams(list);

        // pick first running exam if none selected
        if (!selectedExamId) {
          const first = list?.[0]?.id || list?.[0]?._id || "";
          if (first) setSelectedExamId(String(first));
        }
      } catch {
        // ignore – dashboard hook will show empty
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAdmin, selectedExamId]);

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
  } = useDashboardLive({
    examId: isAdmin ? selectedExamId : null,
    pollMs: 4500,
    lite: true,
  });

  const liveMe = dashMe || me;
  const liveRole = String(liveMe?.role || meRole).toLowerCase();

  // room list
  const roomList = useMemo(() => {
    const r = (rooms || []).map((x) => (typeof x === "string" ? { id: x, name: x } : x));
    return r.filter((x) => Boolean(normRoom(x?.id || x?.name)));
  }, [rooms]);

  const activeRoomId = useMemo(() => {
    return normRoom(activeRoom?.id || activeRoom?.name || activeRoom);
  }, [activeRoom]);

  // Supervisor: fixed room (no room filter UI)
  const supervisorRoomId = useMemo(() => {
    return normRoom(liveMe?.assignedRoomId) || activeRoomId;
  }, [liveMe?.assignedRoomId, activeRoomId]);

  // For Events/Transfers filtering:
  // - Supervisor -> always their room
  // - Lecturer/Admin -> chosen room (or all)
  const selectedRoomId = useMemo(() => {
    if (liveRole === "supervisor") return supervisorRoomId;
    const v = normRoom(pickedRoomId);
    if (!v) return ALL_ROOMS;
    return v;
  }, [liveRole, supervisorRoomId, pickedRoomId]);

  // For ClassroomMap: needs a concrete room (can't show "All")
  const mapRoomId = useMemo(() => {
    if (liveRole === "supervisor") return supervisorRoomId;
    if (selectedRoomId && selectedRoomId !== ALL_ROOMS) return selectedRoomId;
    return activeRoomId || (roomList[0]?.id || "");
  }, [liveRole, supervisorRoomId, selectedRoomId, activeRoomId, roomList]);

  // keep picked room valid when rooms list changes
  useEffect(() => {
    if (!canPickRooms) return;

    if (pickedRoomId !== ALL_ROOMS) {
      const exists = roomList.some((r) => normRoom(r.id) === normRoom(pickedRoomId));
      if (!exists) setPickedRoomId(ALL_ROOMS);
    }
  }, [canPickRooms, roomList, pickedRoomId]);

  // chat context (so chatbot knows current exam)
  useEffect(() => {
    if (!setChatContext) return;
    setChatContext({
      examId: exam?.id || exam?._id || null,
      roomId: mapRoomId || null,
    });
  }, [setChatContext, exam?.id, exam?._id, mapRoomId]);

  const transfersForRoom = useMemo(() => {
    const rid = normRoom(selectedRoomId);
    if (!rid || rid === ALL_ROOMS) return transfers || [];
    return (transfers || []).filter(
      (t) => normRoom(t?.fromClassroom) === rid || normRoom(t?.toClassroom) === rid
    );
  }, [transfers, selectedRoomId]);

  return (
    <>
      <Toast />
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-10">
            <RocketLoader />
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
            {String(error)}
          </div>
        ) : null}

        {/* Admin exam selector */}
        {isAdmin && adminExams?.length ? (
          <div className="mb-4">
            <ExamTabs
              exams={adminExams}
              selectedExamId={selectedExamId}
              onChangeExam={(id) => {
                setSelectedExamId(String(id || ""));
                setPickedRoomId(ALL_ROOMS);
              }}
            />
          </div>
        ) : null}

        {/* Lecturer/Admin room selector */}
        {canPickRooms && roomList.length ? (
          <div className="mb-4">
            <RoomTabs
              rooms={roomList}
              roomId={selectedRoomId}
              onChangeRoom={(id) => setPickedRoomId(String(id))}
              attendance={attendance}
              allowAll={true}
            />
          </div>
        ) : null}

        {!exam ? (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 text-slate-700">
            <div className="text-lg font-extrabold text-slate-900">No active exam</div>
            <div className="mt-1 text-sm text-slate-600">
              When an exam is running, the dashboard will show classrooms, transfers and events.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 xl:col-span-7 space-y-5">
              <ExamOverviewCard exam={exam} stats={stats} inbox={inbox} nowMs={simNowMs} />

              {/* Admin tools */}
              {isAdmin ? (
                <DashboardAddDeleteStudentsCard exam={exam} onChanged={refetch} />
              ) : null}

              <ClassroomMap
                exam={exam}
                me={liveMe}
                refreshNow={refetch}
                nowMs={simNowMs}
                forcedRoomId={mapRoomId}
                forcedAttendance={attendance}
                forcedTransfers={transfersForRoom}
                allRooms={roomList}
                hideRoomSwitcher={true}
                reportStudentFiles={exam?.reportStudentFiles || exam?.report?.studentFiles || null}
              />
            </div>

            <div className="col-span-12 xl:col-span-5 space-y-5">
              <TransfersPanel me={liveMe} items={transfersForRoom} loading={false} error={""} onChanged={refetch} />

              <div id="events-panel">
                <EventsFeed
                  title="Event Panel"
                  events={events}
                  alerts={alerts}
                  selectedRoomId={selectedRoomId}
                  allowAllRooms={canPickRooms}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
