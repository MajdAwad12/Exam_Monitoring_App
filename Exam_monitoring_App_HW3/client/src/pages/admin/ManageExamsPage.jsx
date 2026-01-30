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
   Utils (UNCHANGED)
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
function fmtDT(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
}
function fmtShort(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString();
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

  /* =========================
     State (UNCHANGED)
  ========================= */
  const [lecturers, setLecturers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [exams, setExams] = useState([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);

  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editExam, setEditExam] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const msgTimerRef = useRef(null);

  function showMsg(text, ms = 2500) {
    setMsg(text);
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => {
      setMsg(null);
      msgTimerRef.current = null;
    }, ms);
  }

  function openConfirm({ title, text, action }) {
    setConfirmTitle(title);
    setConfirmText(text);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }

  /* =========================
     Form state (UNCHANGED)
  ========================= */
  const [courseName, setCourseName] = useState("Introduction to Web Systems");
  const [examMode, setExamMode] = useState("onsite");
  const [startAt, setStartAt] = useState(
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [endAt, setEndAt] = useState(
    toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [lecturerId, setLecturerId] = useState("");

  const roomUidRef = useRef(0);
  const nextRoomUid = () => ++roomUidRef.current;

  const [rooms, setRooms] = useState([]);

  const [totalStudentsDraft, setTotalStudentsDraft] = useState("");
  const [requestedRoomsDraft, setRequestedRoomsDraft] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null);
  const [draftLecturer, setDraftLecturer] = useState(null);
  const [draftCoLecturers, setDraftCoLecturers] = useState([]);

  /* =========================
     Data loading (UNCHANGED)
  ========================= */
  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setInitialLoading(true);

      try {
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
      } catch (e) {
        setError(e?.message || "Failed to load admin data");
      } finally {
        if (silent) setRefreshing(false);
        else setInitialLoading(false);
      }
    },
    [lecturerId]
  );

  useEffect(() => {
    refresh({ silent: false });
  }, [refresh]);

  if (initialLoading) return <RocketLoader />;

  /* =========================
     RENDER
  ========================= */
  return (
    <>
      {/* ================= Create Modal ================= */}
      <CreateExamModal
        open={createOpen}
        saving={saving}
        draftBusy={draftBusy}
        onClose={() => (!saving ? setCreateOpen(false) : null)}
        onCreate={() =>
          openConfirm({
            title: "Create exam?",
            text: "Do you want to create this exam with the selected rooms and supervisors?",
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

      {/* ================= Edit Modal ================= */}
      <EditExamModal
        open={editOpen}
        saving={saving}
        onClose={() => (!saving ? setEditOpen(false) : null)}
        onSave={() =>
          openConfirm({
            title: "Update exam?",
            text: "Are you sure you want to save these changes?",
            action: () => submitCreateOrEdit({ isEdit: true }),
          })
        }
        onDelete={() => {
          const id = getId(editExam);
          openConfirm({
            title: "Delete exam?",
            text: "This action cannot be undone.",
            action: () => onDeleteExam(id),
          });
        }}
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

      {/* ================= Confirm Modal ================= */}
      <ModalUI
        open={confirmOpen}
        title={confirmTitle}
        onClose={() => setConfirmOpen(false)}
        footer={null}
      >
        <div className="text-sm text-slate-700 whitespace-pre-line">
          {confirmText}
        </div>
      </ModalUI>
    </>
  );
}
