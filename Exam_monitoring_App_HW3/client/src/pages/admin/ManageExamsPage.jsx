// ===============================
// file: client/src/pages/admin/ManageExamsPage.jsx
// ===============================
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";

import {
  createExam,
  getAdminExams,
  startExam,
  endExam,
} from "../../services/exams.service.js";
import {
  listUsers,
  updateExamAdmin,
  deleteExamAdmin,
  autoAssignDraft,
} from "../../services/admin.service.js";

import RocketLoader from "../../components/loading/RocketLoader.jsx";
import CreateExamModal from "../../components/admin/CreateExamModal.jsx";
import EditExamModal from "../../components/admin/EditExamModal.jsx";
import ModalUI from "../../components/admin/Modal.UI.jsx";

/* =========================
   Utils
========================= */
function toNonNegInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
function safeArr(x, fallback = []) {
  return Array.isArray(x) ? x : fallback;
}
function unwrapUsers(res) {
  if (Array.isArray(res)) return res;
  if (res?.users && Array.isArray(res.users)) return res.users;
  if (res?.data?.users && Array.isArray(res.data.users)) return res.data.users;
  return [];
}
function unwrapExams(res) {
  if (Array.isArray(res)) return res;
  if (res?.exams && Array.isArray(res.exams)) return res.exams;
  if (res?.data?.exams && Array.isArray(res.data.exams)) return res.data.exams;
  return [];
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toLocalInputValue(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(
    d.getMonth() + 1
  )}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}
function getId(x) {
  return x?._id || x?.id;
}
function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const k = String(x || "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

/* =========================
   Page
========================= */
export default function ManageExamsPage() {
  const { me } = useOutletContext();

  /* ===== lists ===== */
  const [lecturers, setLecturers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [exams, setExams] = useState([]);

  /* ===== ui ===== */
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editExam, setEditExam] = useState(null);

  /* ===== confirm modal ===== */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirmSuccess, setConfirmSuccess] = useState(null);

  function openConfirm({ title, text, action }) {
    setConfirmTitle(title);
    setConfirmText(text);
    setConfirmError(null);
    setConfirmSuccess(null);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }

  /* ===== form (shared) ===== */
  const [courseName, setCourseName] = useState("Introduction to Web Systems");
  const [examMode, setExamMode] = useState("onsite");
  const [startAt, setStartAt] = useState(
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [endAt, setEndAt] = useState(
    toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [lecturerId, setLecturerId] = useState("");

  /* ===== rooms ===== */
  const roomUidRef = useRef(0);
  const nextRoomUid = () => ++roomUidRef.current;
  const [rooms, setRooms] = useState([]);

  /* ===== auto assign ===== */
  const [totalStudentsDraft, setTotalStudentsDraft] = useState("");
  const [requestedRoomsDraft, setRequestedRoomsDraft] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null);
  const [draftLecturer, setDraftLecturer] = useState(null);
  const [draftCoLecturers, setDraftCoLecturers] = useState([]);

  /* =========================
     Data load
  ========================= */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const [lsRes, ssRes, exRes] = await Promise.all([
        listUsers("lecturer"),
        listUsers("supervisor"),
        getAdminExams(),
      ]);

      const ls = unwrapUsers(lsRes);
      const ss = unwrapUsers(ssRes);
      const list = unwrapExams(exRes);

      setLecturers(ls);
      setSupervisors(ss);
      setExams(list);

      if (!lecturerId && ls.length) setLecturerId(String(getId(ls[0])));
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [lecturerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (initialLoading) return <RocketLoader />;

  /* =========================
     Helpers
  ========================= */
  function addRoom() {
    const uid = nextRoomUid();
    setRooms((prev) => [
      ...prev,
      {
        _uid: uid,
        id: `Room-${uid}`,
        name: `Room-${uid}`,
        rows: 5,
        cols: 5,
        assignedSupervisorId: "",
      },
    ]);
  }

  function removeRoom(idx) {
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  }

  function setRoomField(idx, key, value) {
    setRooms((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  }

  function onSelectSupervisorForRoom(idx, supId) {
    setRooms((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], assignedSupervisorId: supId };
      return copy;
    });
  }

  /* =========================
     Actions
  ========================= */
  async function onAutoAssignDraft() {
    setDraftBusy(true);
    try {
      const res = await autoAssignDraft({
        startAt,
        endAt,
        totalStudents: toNonNegInt(totalStudentsDraft),
        requestedRooms: toNonNegInt(requestedRoomsDraft),
      });

      const draft = res?.draft || res?.data?.draft;
      const cls = safeArr(draft?.classrooms).map((r) => ({
        _uid: nextRoomUid(),
        id: r.id,
        name: r.name,
        rows: r.rows,
        cols: r.cols,
        assignedSupervisorId: r.assignedSupervisorId || "",
      }));

      setRooms(cls);
      setDraftMeta(draft?.meta || null);
      setDraftLecturer(draft?.lecturer || null);
      setDraftCoLecturers(safeArr(draft?.coLecturers));
    } finally {
      setDraftBusy(false);
    }
  }

  async function submitCreateOrEdit({ isEdit }) {
    setSaving(true);
    try {
      const payload = {
        courseName,
        examMode,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        lecturerId,
        supervisorIds: uniq(rooms.map((r) => r.assignedSupervisorId)),
        classrooms: rooms.map(({ _uid, ...r }) => r),
      };

      if (!isEdit) {
        await createExam(payload);
        setCreateOpen(false);
      } else {
        await updateExamAdmin(getId(editExam), payload);
        setEditOpen(false);
      }

      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteExam(id) {
    await deleteExamAdmin(id);
    setEditOpen(false);
    await refresh();
  }

  /* =========================
     Render
  ========================= */
  return (
    <>
      <CreateExamModal
        open={createOpen}
        saving={saving}
        draftBusy={draftBusy}
        onClose={() => setCreateOpen(false)}
        onCreate={() =>
          openConfirm({
            title: "Create exam?",
            text: "Create this exam?",
            action: () => submitCreateOrEdit({ isEdit: false }),
          })
        }
        onAutoAssign={onAutoAssignDraft}
        {...{
          courseName,
          setCourseName,
          examMode,
          setExamMode,
          startAt,
          setStartAt,
          endAt,
          setEndAt,
          lecturerId,
          setLecturerId,
          lecturers,
          totalStudentsDraft,
          setTotalStudentsDraft,
          requestedRoomsDraft,
          setRequestedRoomsDraft,
          draftMeta,
          draftLecturer,
          draftCoLecturers,
          rooms,
          supervisors,
        }}
        addRoom={addRoom}
        removeRoom={removeRoom}
        setRoomField={setRoomField}
        onSelectSupervisorForRoom={onSelectSupervisorForRoom}
      />

      <EditExamModal
        open={editOpen}
        saving={saving}
        onClose={() => setEditOpen(false)}
        onSave={() =>
          openConfirm({
            title: "Update exam?",
            text: "Save changes?",
            action: () => submitCreateOrEdit({ isEdit: true }),
          })
        }
        onDelete={() =>
          openConfirm({
            title: "Delete exam?",
            text: "This cannot be undone.",
            action: () => onDeleteExam(getId(editExam)),
          })
        }
        {...{
          courseName,
          setCourseName,
          examMode,
          setExamMode,
          startAt,
          setStartAt,
          endAt,
          setEndAt,
          lecturerId,
          setLecturerId,
          lecturers,
          rooms,
          supervisors,
        }}
        addRoom={addRoom}
        removeRoom={removeRoom}
        setRoomField={setRoomField}
        onSelectSupervisorForRoom={onSelectSupervisorForRoom}
      />

      <ModalUI
        open={confirmOpen}
        title={confirmTitle}
        subtitle={null}
        onClose={() => setConfirmOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="border px-4 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  setSaving(true);
                  await confirmAction();
                  setConfirmSuccess("Action completed successfully.");
                  setTimeout(() => setConfirmOpen(false), 1200);
                } catch (e) {
                  setConfirmError(e?.message || "Action failed.");
                } finally {
                  setSaving(false);
                }
              }}
              className="bg-sky-600 text-white px-5 py-2 rounded-xl"
            >
              Yes
            </button>
          </div>
        }
      >
        {confirmError && (
          <div className="mb-3 bg-rose-50 border border-rose-200 p-3 rounded-xl">
            {confirmError}
          </div>
        )}
        {confirmSuccess && (
          <div className="mb-3 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
            {confirmSuccess}
          </div>
        )}
        <div className="text-sm whitespace-pre-line">{confirmText}</div>
      </ModalUI>
    </>
  );
}
