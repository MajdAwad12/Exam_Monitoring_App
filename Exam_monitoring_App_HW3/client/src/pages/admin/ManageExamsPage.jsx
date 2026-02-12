// ===============================
// file: client/src/pages/admin/ManageExamsPage.jsx
// ===============================
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { createExam, getAdminExams, startExam, endExam } from "../../services/exams.service.js";
import { listUsers, updateExamAdmin, deleteExamAdmin, autoAssignDraft } from "../../services/admin.service.js";

import RocketLoader from "../../components/loading/RocketLoader.jsx";
import CreateExamModal from "../../components/admin/CreateExamModal.jsx";
import EditExamModal from "../../components/admin/EditExamModal.jsx";
import ModalUI from "../../components/admin/Modal.UI.jsx";

/* =========================
   Utils
========================= */
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toLocalInputValue(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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

function statusBadge(status) {
  const s = String(status || "scheduled").toLowerCase();
  if (s === "running") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "ended") return "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800";
  if (s === "scheduled") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function modeBadge(mode) {
  const m = String(mode || "onsite").toLowerCase();
  return m === "online"
    ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-indigo-50 text-indigo-700 border-indigo-200";
}

function normalizeIntInput(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  if (!/^\d+$/.test(s)) return NaN;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.max(0, Math.floor(n));
}

/* =========================
   Time window helpers (CLIENT)
========================= */
function examTimes(exam) {
  const startMs = new Date(exam?.startAt || exam?.examDate || 0).getTime();
  const endMs = new Date(exam?.endAt || 0).getTime();
  return { startMs, endMs };
}

function windowState(exam) {
  const { startMs, endMs } = examTimes(exam);
  const nowMs = Date.now();

  const valid =
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    startMs > 0 &&
    endMs > 0 &&
    endMs > startMs;

  if (!valid) return { valid: false, active: false, future: false, past: false, nowMs };

  const active = nowMs >= startMs && nowMs <= endMs;
  const future = nowMs < startMs;
  const past = nowMs > endMs;
  return { valid: true, active, future, past, nowMs };
}

/* =========================
   Room draft helper
========================= */
function buildRoomDraft(uid, id) {
  const cleanId = String(id || "").trim() || `Room-${uid}`;
  return {
    _uid: uid,
    id: cleanId,
    name: cleanId,
    rows: 5,
    cols: 5,
    assignedSupervisorId: "",
    assignedSupervisorName: "",
  };
}

/* =========================
   Small UI primitives
========================= */
function Card({ children, className = "" }) {
  return <div className={`bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}>{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{hint}</span> : null}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Btn({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

/* =========================
   Page
========================= */
export default function ManageExamsPage() {
  const { me } = useOutletContext();
  const { t } = useTranslation();

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
  const [confirmError, setConfirmError] = useState(null);
  const [confirmSuccess, setConfirmSuccess] = useState(null);

  const msgTimerRef = useRef(null);

  function showMsg(text, ms = 2500) {
    setMsg(text);
    if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
    msgTimerRef.current = window.setTimeout(() => {
      setMsg(null);
      msgTimerRef.current = null;
    }, ms);
  }

  useEffect(() => {
    return () => {
      if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
    };
  }, []);

  function openConfirm({ title, text, action }) {
    setConfirmTitle(title);
    setConfirmText(text);
    setConfirmError(null);
    setConfirmSuccess(null);
    setConfirmAction(() => action);
    setConfirmOpen(true);
  }

  /* =========================
     Form state (shared create/edit)
  ========================= */
  const defaultCourseName = t("admin.manageExams.defaults.courseName");
  const [courseName, setCourseName] = useState(defaultCourseName);
  const [examMode, setExamMode] = useState("onsite");
  const [startAt, setStartAt] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endAt, setEndAt] = useState(toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [lecturerId, setLecturerId] = useState("");

  // rooms (stable keys)
  const roomUidRef = useRef(0);
  const nextRoomUid = () => {
    roomUidRef.current += 1;
    return roomUidRef.current;
  };
  const [rooms, setRooms] = useState(() => []);

  // create-only draft
  const [totalStudentsDraft, setTotalStudentsDraft] = useState("");
  const [requestedRoomsDraft, setRequestedRoomsDraft] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null);
  const [draftLecturer, setDraftLecturer] = useState(null);
  const [draftCoLecturers, setDraftCoLecturers] = useState([]);

  /* =========================
     Filters
  ========================= */
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);

  /* =========================
     Data load
  ========================= */
  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setInitialLoading(true);

      setError(null);

      try {
        // ✅ Open the page fast: load the exams list first
        const exRes = await getAdminExams();
        const list = unwrapExams(exRes);
        setExams(list);

        // Stop the full-screen loader as soon as exams are ready
        if (!silent) setInitialLoading(false);

        // Load lecturers/supervisors in the background (do not block UI)
        const [lsRes, ssRes] = await Promise.all([listUsers("lecturer"), listUsers("supervisor")]);

        const ls = unwrapUsers(lsRes);
        const ss = unwrapUsers(ssRes);

        setLecturers(ls);
        setSupervisors(ss);

        if (!lecturerId && ls.length) setLecturerId(String(getId(ls[0])));
      } catch (e) {
        setError(e?.message || t("admin.manageExams.errors.loadAdminData"));
      } finally {
        if (silent) setRefreshing(false);
        else setInitialLoading(false);
      }
    },
    [lecturerId, t]
  );

  useEffect(() => {
    refresh({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     Local optimistic helpers
  ========================= */
  function upsertExamLocal(examLike) {
    const id = getId(examLike);
    if (!id) return;
    setExams((prev) => {
      const copy = [...safeArr(prev, [])];
      const idx = copy.findIndex((x) => String(getId(x)) === String(id));
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], ...examLike };
        return copy;
      }
      return [examLike, ...copy];
    });
  }

  function removeExamLocal(examId) {
    setExams((prev) => safeArr(prev, []).filter((x) => String(getId(x)) !== String(examId)));
  }

  /* =========================
     Open/Reset
  ========================= */
  function resetFormToDefaults() {
    setCourseName(t("admin.manageExams.defaults.courseName"));
    setExamMode("onsite");
    setStartAt(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    setEndAt(toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));

    setTotalStudentsDraft("");
    setRequestedRoomsDraft("");

    setDraftMeta(null);
    setDraftLecturer(null);
    setDraftCoLecturers([]);

    setRooms([]);
    roomUidRef.current = 0;
  }

  function openCreate() {
    setMsg(null);
    setError(null);
    resetFormToDefaults();
    if (!lecturerId && lecturers.length) setLecturerId(String(getId(lecturers[0])));
    setCreateOpen(true);
  }

  function openEdit(exam) {
    setMsg(null);
    setError(null);

    roomUidRef.current = 0;
    setDraftMeta(null);
    setDraftLecturer(null);
    setDraftCoLecturers([]);

    setEditExam(exam);

    setCourseName(exam?.courseName || "");
    setExamMode(exam?.examMode || "onsite");
    setStartAt(toLocalInputValue(exam?.startAt || exam?.examDate || Date.now()));
    setEndAt(toLocalInputValue(exam?.endAt || Date.now() + 60 * 60 * 1000));

    const lec = exam?.lecturer?.id || exam?.lecturer?._id || exam?.lecturerId || "";
    setLecturerId(String(lec || ""));

    const cls = safeArr(exam?.classrooms, []).map((r) => ({
      _uid: nextRoomUid(),
      id: String(r?.id || r?.name || "").trim(),
      name: String(r?.name || r?.id || "").trim(),
      rows: Number(r?.rows || 5),
      cols: Number(r?.cols || 5),
      assignedSupervisorId: r?.assignedSupervisorId ? String(r.assignedSupervisorId) : "",
      assignedSupervisorName: String(r?.assignedSupervisorName || ""),
    }));

    const supByRoom = new Map(
      safeArr(exam?.supervisors, [])
        .map((s) => [String(s?.roomId || "").trim(), { id: String(s?.id || ""), name: String(s?.name || "") }])
        .filter(([k]) => !!k)
    );

    const merged = cls.map((r) => {
      const hit = supByRoom.get(String(r.id || "").trim());
      if (hit?.id && !r.assignedSupervisorId) {
        return { ...r, assignedSupervisorId: hit.id, assignedSupervisorName: hit.name || r.assignedSupervisorName };
      }
      return r;
    });

    setRooms(merged.length ? merged : cls);
    setEditOpen(true);
  }

  /* =========================
     Rooms handlers
  ========================= */
  function setRoomField(idx, key, value) {
    setRooms((prev) => {
      const copy = [...prev];
      const r = { ...(copy[idx] || {}) };
      r[key] = value;

      if (key === "id") r.name = String(value || "");
      if (key === "name") r.id = String(value || "");

      copy[idx] = r;
      return copy;
    });
  }

  function removeRoom(idx) {
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  }

  function addRoom() {
    setRooms((prev) => {
      const uid = nextRoomUid();
      const n = prev.length + 1;
      const id = `Room-${n}`;
      return [...prev, buildRoomDraft(uid, id)];
    });
  }

  function onSelectSupervisorForRoom(idx, supId) {
    const sup = supervisors.find((s) => String(getId(s)) === String(supId));
    setRooms((prev) => {
      const copy = [...prev];
      const r = { ...(copy[idx] || {}) };
      r.assignedSupervisorId = supId || "";
      r.assignedSupervisorName = sup?.fullName || "";
      copy[idx] = r;
      return copy;
    });
  }

  function roomsToSupervisorIds(cleanRooms) {
    const ids = cleanRooms.map((r) => String(r.assignedSupervisorId || "")).filter(Boolean);
    return uniq(ids);
  }

  /* =========================
     Validation / Payload
  ========================= */
  function validateCommon() {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error(t("admin.manageExams.errors.invalidStartEnd"));
    }
    if (end.getTime() <= start.getTime()) {
      throw new Error(t("admin.manageExams.errors.endAfterStart"));
    }
    if (!courseName.trim()) {
      throw new Error(t("admin.manageExams.errors.courseRequired"));
    }
    if (!lecturerId) {
      throw new Error(t("admin.manageExams.errors.chooseLecturer"));
    }

    const cleanRooms = safeArr(rooms, [])
      .map((r) => ({
        _uid: r?._uid,
        id: String(r?.id || r?.name || "").trim(),
        name: String(r?.name || r?.id || "").trim(),
        rows: Number(r?.rows || 5),
        cols: Number(r?.cols || 5),
        assignedSupervisorId: r?.assignedSupervisorId ? String(r.assignedSupervisorId) : null,
        assignedSupervisorName: String(r?.assignedSupervisorName || ""),
      }))
      .filter((r) => r.id && r.name);

    if (!cleanRooms.length) throw new Error(t("admin.manageExams.errors.addAtLeastOneRoom"));

    const missing = cleanRooms.filter((r) => !r.assignedSupervisorId);
    if (missing.length) {
      throw new Error(t("admin.manageExams.errors.assignSupervisorEachRoom"));
    }

    return { start, end, cleanRooms };
  }

  /* =========================
     Create / Edit submit
  ========================= */
  async function submitCreateOrEdit({ isEdit }) {
    setSaving(true);
    setMsg(null);
    setError(null);

    try {
      const { start, end, cleanRooms } = validateCommon();

      const payload = {
        courseName: courseName.trim(),
        examMode,
        examDate: start.toISOString(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        lecturerId,
        supervisorIds: roomsToSupervisorIds(cleanRooms),
        classrooms: cleanRooms.map((r) => {
          const { _uid, ...rest } = r;
          return rest;
        }),
      };

      if (!isEdit && draftLecturer) {
        payload.lecturer = draftLecturer;
        payload.coLecturers = safeArr(draftCoLecturers, []);
      }

      if (!isEdit) {
        const res = await createExam(payload);
        const created = res?.exam || res?.data?.exam;
        if (created) upsertExamLocal(created);

        showMsg(t("admin.manageExams.messages.examCreated"), 2500);
        setCreateOpen(false);
        setEditExam(null);
      } else {
        const examId = getId(editExam);
        if (!examId) throw new Error(t("admin.manageExams.errors.missingExamId"));

        const res = await updateExamAdmin(examId, payload);
        const updated = res?.exam || res?.data?.exam;
        if (updated) upsertExamLocal(updated);

        showMsg(t("admin.manageExams.messages.examUpdated"), 2500);
        setEditOpen(false);
        setEditExam(null);
      }

      await refresh({ silent: true });
    } catch (e) {
      // ✅ show detailed schedule conflict info from server
      if (e?.status === 409 && Array.isArray(e?.data?.conflicts) && e.data.conflicts.length) {
        const lines = e.data.conflicts.map((c) => {
          const roomsTxt = (c.sharedRooms || []).join(", ");
          const time = `${fmtDT(c.startAt)} → ${fmtDT(c.endAt)}`;
          return `• ${c.courseName || t("admin.manageExams.conflicts.otherExam")} (${time}) | ${t("admin.manageExams.conflicts.sharedRooms")}: ${roomsTxt}`;
        });

        setError(`${t("admin.manageExams.conflicts.title")}\n\n${lines.join("\n")}`);
      } else {
        setError(e?.message || t("admin.manageExams.errors.saveExam"));
      }

      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteExam(exam) {
    const examId = getId(exam);
    if (!examId) return;

    const isRunning = String(exam?.status || "").toLowerCase() === "running";

    setSaving(true);
    setMsg(null);
    setError(null);

    try {
      await deleteExamAdmin(examId, { force: isRunning });
      removeExamLocal(examId);

      showMsg(isRunning ? t("admin.manageExams.messages.examDeletedForced") : t("admin.manageExams.messages.examDeleted"), 2500);
      setEditOpen(false);
      setEditExam(null);

      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || t("admin.manageExams.errors.deleteExam"));
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function onStartExam(exam) {
    const id = getId(exam);
    if (!id) return;

    const ws = windowState(exam);
    if (!ws.active) {
      const msg2 = ws.future
        ? t("admin.manageExams.errors.cannotStartYet")
        : t("admin.manageExams.errors.cannotStartWindowEnded");
      setError(msg2);
      throw new Error(msg2);
    }

    setWorkingId(id);
    setMsg(null);
    setError(null);

    try {
      await startExam(id);
      upsertExamLocal({ ...exam, status: "running" });

      showMsg(t("admin.manageExams.messages.examStarted"), 2500);
      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || t("admin.manageExams.errors.startExam"));
      throw e;
    } finally {
      setWorkingId(null);
    }
  }

  async function onEndExam(exam) {
    const id = getId(exam);
    if (!id) return;

    const ws = windowState(exam);

    setWorkingId(id);
    setMsg(null);
    setError(null);

    try {
      // ✅ Allow admin to end even if the real-time window already passed
      // (server enforces admin-only for force endings)
      await endExam(id, { force: !ws.active });

      upsertExamLocal({ ...exam, status: "ended" });

      showMsg(ws.active ? t("admin.manageExams.messages.examEnded") : t("admin.manageExams.messages.examEndedForced"), 2500);
      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || t("admin.manageExams.errors.endExam"));
      throw e;
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================
     Auto-Assign (Create modal only)
  ========================= */
  async function onAutoAssignDraft() {
    setDraftBusy(true);
    setMsg(null);
    setError(null);

    try {
      const start = new Date(startAt);
      const end = new Date(endAt);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error(t("admin.manageExams.errors.invalidStartEnd"));
      }
      if (end.getTime() <= start.getTime()) {
        throw new Error(t("admin.manageExams.errors.endAfterStart"));
      }

      const totalStudents = normalizeIntInput(totalStudentsDraft);
      if (!Number.isFinite(totalStudents)) {
        throw new Error(t("admin.manageExams.errors.totalStudentsDigits"));
      }
      if (totalStudents <= 0) {
        throw new Error(t("admin.manageExams.errors.totalStudentsGreaterThanZero"));
      }

      const requestedRooms = normalizeIntInput(requestedRoomsDraft);
      if (!Number.isFinite(requestedRooms)) {
        throw new Error(t("admin.manageExams.errors.requestedRoomsDigits"));
      }

      const res = await autoAssignDraft({
        examDate: start.toISOString(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        totalStudents,
        requestedRooms,
      });

      const draft = res?.draft || res?.data?.draft;
      if (!draft) throw new Error(t("admin.manageExams.errors.autoAssignNoDraft"));

      const cls = safeArr(draft?.classrooms, []).map((r) => ({
        _uid: nextRoomUid(),
        id: String(r?.id || r?.name || "").trim(),
        name: String(r?.name || r?.id || "").trim(),
        rows: Number(r?.rows || 5),
        cols: Number(r?.cols || 5),
        assignedSupervisorId: r?.assignedSupervisorId ? String(r.assignedSupervisorId) : "",
        assignedSupervisorName: String(r?.assignedSupervisorName || ""),
      }));

      if (!cls.length) throw new Error(t("admin.manageExams.errors.draftNoClassrooms"));

      setRooms(cls);
      setDraftMeta(draft?.meta || null);

      const lec = draft?.lecturer || null;
      const co = safeArr(draft?.coLecturers, []);
      setDraftLecturer(lec);
      setDraftCoLecturers(co);

      if (lec?.id) setLecturerId(String(lec.id));

      showMsg(t("admin.manageExams.messages.autoAssignCreated"), 3200);
    } catch (e) {
      setError(e?.message || t("admin.manageExams.errors.autoAssign"));
      throw e;
    } finally {
      setDraftBusy(false);
    }
  }

  /* =========================
     ✅ Derived UI lists (MUST be before any conditional return)
  ========================= */
  const stats = useMemo(() => {
    const list = safeArr(exams, []);
    const total = list.length;
    const running = list.filter((x) => String(x?.status).toLowerCase() === "running").length;
    const ended = list.filter((x) => String(x?.status).toLowerCase() === "ended").length;
    const scheduled = total - running - ended;
    return { total, running, ended, scheduled };
  }, [exams]);

  const filtered = useMemo(() => {
    let list = safeArr(exams, []);

    list = [...list].sort((a, b) => {
      const ta = new Date(a?.startAt || a?.examDate || 0).getTime();
      const tb = new Date(b?.startAt || b?.examDate || 0).getTime();
      return tb - ta;
    });

    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((e) => {
        const id = String(getId(e) || "").toLowerCase();
        const course = String(e?.courseName || "").toLowerCase();
        const mode = String(e?.examMode || "").toLowerCase();
        const roomsTxt = safeArr(e?.classrooms, [])
          .map((r) => String(r?.name || r?.id || "").toLowerCase())
          .join(" ");
        return id.includes(qq) || course.includes(qq) || mode.includes(qq) || roomsTxt.includes(qq);
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((e) => String(e?.status || "scheduled").toLowerCase() === statusFilter);
    }
    if (modeFilter !== "all") {
      list = list.filter((e) => String(e?.examMode || "onsite").toLowerCase() === modeFilter);
    }

    if (fromDate) {
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      list = list.filter((e) => new Date(e?.startAt || e?.examDate || 0).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(toDate).setHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e?.startAt || e?.examDate || 0).getTime() <= to);
    }

    return list;
  }, [exams, q, statusFilter, modeFilter, fromDate, toDate]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);

  const paged = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter, modeFilter, fromDate, toDate, pageSize]);

  /* =========================
     Admin gate (AFTER hooks)
  ========================= */
  if (initialLoading) return <RocketLoader />;

  if (me?.role !== "admin") {
    return (
      <Card className="p-6">
        <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t("admin.manageExams.title")}</div>
        <div className="mt-2 text-slate-600 dark:text-slate-300">
          {t("admin.manageExams.adminOnlyPrefix")}{" "}
          <span className="font-semibold">{t("roles.admin")}</span>{" "}
          {t("admin.manageExams.adminOnlySuffix")}
        </div>
      </Card>
    );
  }

  /* =========================
     Render
  ========================= */
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t("admin.manageExams.title")}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {t("admin.manageExams.subtitle")}
              <span className="font-semibold"> {t("admin.manageExams.subtitleEmphasis")}</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">
              ✅ {t("admin.manageExams.autoAssignNote")}{" "}
              <span className="font-semibold">{t("admin.manageExams.createModalOnly")}</span>.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Btn onClick={() => refresh({ silent: true })} className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40">
              {refreshing ? t("admin.manageExams.actions.refreshing") : t("admin.manageExams.actions.refresh")}
            </Btn>
            <Btn onClick={openCreate} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3">
              + {t("admin.manageExams.actions.createNew")}
            </Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("admin.manageExams.stats.total")}</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs text-emerald-700">{t("admin.manageExams.stats.running")}</div>
            <div className="text-2xl font-extrabold text-emerald-800">{stats.running}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="text-xs text-sky-700">{t("admin.manageExams.stats.scheduled")}</div>
            <div className="text-2xl font-extrabold text-sky-800">{stats.scheduled}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">{t("admin.manageExams.stats.ended")}</div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{stats.ended}</div>
          </div>
        </div>
      </Card>

      {(error || msg) ? (
        <div
          className={`rounded-2xl border p-4 ${
            error ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {error || msg}
        </div>
      ) : null}

      {/* Search & Filters */}
<Card className="p-5">
  {/* Header row */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
      {t("admin.manageExams.filters.title")}
    </div>

    <div className="text-sm text-slate-600 dark:text-slate-300">
      {t("admin.manageExams.filters.showing")}{" "}
      <span className="font-extrabold text-slate-900 dark:text-slate-100">{filtered.length}</span>{" "}
      {t("admin.manageExams.filters.results")}
    </div>
  </div>

  {/* Controls */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-4">
    <div className="lg:col-span-5">
      <Field label={t("admin.manageExams.filters.search.label")}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.manageExams.filters.search.placeholder")}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
        />
      </Field>
    </div>

    <div className="lg:col-span-2">
      <Field label={t("admin.manageExams.filters.status")}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
        >
          <option value="all">{t("common.all")}</option>
          <option value="scheduled">{t("exam.status.scheduled")}</option>
          <option value="running">{t("exam.status.running")}</option>
          <option value="ended">{t("exam.status.ended")}</option>
        </select>
      </Field>
    </div>

    <div className="lg:col-span-2">
      <Field label={t("admin.manageExams.filters.mode")}>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
        >
          <option value="all">{t("common.all")}</option>
          <option value="onsite">{t("exam.mode.onsite")}</option>
          <option value="online">{t("exam.mode.online")}</option>
        </select>
      </Field>
    </div>

    <div className="lg:col-span-3">
      <Field label={t("admin.manageExams.filters.from")}>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100"
          />
        </div>
      </Field>
    </div>
  </div>

  {/* Actions row */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
    <Btn
      onClick={() => {
        setQ("");
        setStatusFilter("all");
        setModeFilter("all");
        setFromDate("");
        setToDate("");
      }}
      className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200"
    >
      {t("admin.manageExams.filters.clear")}
    </Btn>

    <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-300">{t("admin.manageExams.pagination.rows")}</span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
        >
          <option value={6}>6</option>
          <option value={8}>8</option>
          <option value={12}>12</option>
          <option value={20}>20</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Btn
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          {t("common.prev")}
        </Btn>

        <div className="text-sm text-slate-700 dark:text-slate-200">
          {t("common.page")} <span className="font-extrabold">{page}</span> / {totalPages}
        </div>

        <Btn
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          {t("common.next")}
        </Btn>
      </div>
    </div>
  </div>
</Card>
  

      {/* Exams table */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("admin.manageExams.table.title")}</div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{t("admin.manageExams.table.subtitle")}</div>
          </div>
          {refreshing ? <div className="text-sm text-slate-600 dark:text-slate-300">{t("common.loading")}</div> : null}
        </div>


        {/* Mobile list (cards) */}
        <div className="mt-4 md:hidden space-y-3">
          {paged.map((e) => {
            const examId = getId(e);
            const isWorking = workingId === examId;

            const ws = windowState(e);
            const windowActive = ws.active;
            const windowFuture = ws.future;

            const isRunning = String(e?.status || "").toLowerCase() === "running";
            const canEnd = isRunning && (windowActive || me?.role === "admin");
            const canStart = windowActive || isRunning;

            const dbStatus = String(e?.status || "scheduled").toLowerCase();
            const displayStatusRaw =
              dbStatus === "ended" || dbStatus === "running"
                ? dbStatus
                : windowActive
                ? "running"
                : windowFuture
                ? "scheduled"
                : "ended";

            const displayStatusLabel = t(`exam.status.${displayStatusRaw}`);

            const roomsTxt =
              safeArr(e.classrooms, [])
                .map((r) => r?.name || r?.id)
                .filter(Boolean)
                .join(", ") || "--";

            return (
              <div
                key={String(examId)}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {e.courseName || "--"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {fmtShort(e.startAt || e.examDate)} •{" "}
                      {Array.isArray(e?.supervisors) ? e.supervisors.length : 0} {t("roles.supervisors")}
                    </div>
                  </div>

                  <span className={`shrink-0 inline-flex items-center rounded-xl border px-2 py-1 ${statusBadge(displayStatusRaw)}`}>
                    {displayStatusLabel}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-slate-500 dark:text-slate-400">{t("admin.manageExams.table.headers.schedule")}</div>
                    <div className="text-right text-slate-800 dark:text-slate-200">
                      <div>{fmtDT(e.startAt)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">→ {fmtDT(e.endAt)}</div>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="text-slate-500 dark:text-slate-400">{t("admin.manageExams.table.headers.rooms")}</div>
                    <div className="text-right text-slate-800 dark:text-slate-200">{roomsTxt}</div>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="text-slate-500 dark:text-slate-400">{t("admin.manageExams.table.headers.type")}</div>
                    <div className="text-right">
                      <span className={`inline-flex items-center rounded-xl border px-2 py-1 ${modeBadge(e.examMode)}`}>
                        {t(`exam.mode.${String(e.examMode || "onsite").toLowerCase()}`)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="text-slate-500 dark:text-slate-400">{t("admin.manageExams.table.headers.id")}</div>
                    <div className="text-right text-xs font-mono text-slate-700 dark:text-slate-300">
                      {String(examId || "--")}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Btn
                    onClick={() => openEdit(e)}
                    className="w-full sm:w-auto border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40"
                    title={t("admin.manageExams.tooltips.edit")}
                  >
                    {t("common.edit")}
                  </Btn>

                  <Btn
                    onClick={() =>
                      openConfirm({
                        title: t("admin.manageExams.confirm.start.title"),
                        text: t("admin.manageExams.confirm.start.text"),
                        action: () => onStartExam(e),
                      })
                    }
                    disabled={isWorking || !canStart}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                    title={t("admin.manageExams.tooltips.start")}
                  >
                    {t("common.start")}
                  </Btn>

                  <Btn
                    onClick={() =>
                      openConfirm({
                        title: t("admin.manageExams.confirm.end.title"),
                        text: t("admin.manageExams.confirm.end.text"),
                        action: () => onEndExam(e),
                      })
                    }
                    disabled={isWorking || !canEnd}
                    className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
                    title={t("admin.manageExams.tooltips.end")}
                  >
                    {t("common.end")}
                  </Btn>

                  <Btn
                    onClick={() =>
                      openConfirm({
                        title: t("admin.manageExams.confirm.delete.title"),
                        text: t("admin.manageExams.confirm.delete.text"),
                        action: () => onDeleteExam(e),
                      })
                    }
                    disabled={isWorking}
                    className="w-full sm:w-auto border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title={t("admin.manageExams.tooltips.delete")}
                  >
                    {t("common.delete")}
                  </Btn>
                </div>
              </div>
            );
          })}

          {paged.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-600 dark:text-slate-300">
              {t("admin.manageExams.table.noResults")}
            </div>
          ) : null}
        </div>

        <div className="mt-4 hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600 dark:text-slate-300">
                <th className="py-2 pr-3">{t("admin.manageExams.table.headers.course")}</th>
                <th className="py-2 pr-3">{t("admin.manageExams.table.headers.schedule")}</th>
                <th className="py-2 pr-3">{t("admin.manageExams.table.headers.rooms")}</th>
                <th className="py-2 pr-3">{t("admin.manageExams.table.headers.type")}</th>
                <th className="py-2 pr-3">{t("admin.manageExams.table.headers.status")}</th>
                <th className="py-2 pr-3">{t("admin.manageExams.table.headers.id")}</th>
                <th className="py-2 text-right">{t("admin.manageExams.table.headers.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {paged.map((e) => {
                const examId = getId(e);
                const isWorking = workingId === examId;

                const ws = windowState(e);
                const windowActive = ws.active;
                const windowFuture = ws.future;

                const isRunning = String(e?.status || "").toLowerCase() === "running";
                // Admin can end a running exam even outside the time window (forced end)
                const canEnd = isRunning && (windowActive || me?.role === "admin");
                // Start is allowed only inside window (unless already running)
                const canStart = windowActive || isRunning;

                const dbStatus = String(e?.status || "scheduled").toLowerCase();
                const displayStatusRaw =
                  dbStatus === "ended" || dbStatus === "running"
                    ? dbStatus
                    : windowActive
                    ? "running"
                    : windowFuture
                    ? "scheduled"
                    : "ended";

                const displayStatusLabel = t(`exam.status.${displayStatusRaw}`);

                const roomsTxt =
                  safeArr(e.classrooms, [])
                    .map((r) => r?.name || r?.id)
                    .filter(Boolean)
                    .join(", ") || "--";

                const startTitle = windowActive
                  ? t("admin.manageExams.tooltips.startWithinWindow")
                  : windowFuture
                  ? t("admin.manageExams.tooltips.startBeforeStartTime")
                  : t("admin.manageExams.tooltips.startWindowEnded");

                const endTitle = !isRunning
                  ? t("admin.manageExams.tooltips.endNotRunning")
                  : windowActive
                  ? t("admin.manageExams.tooltips.endWithinWindow")
                  : me?.role === "admin"
                  ? t("admin.manageExams.tooltips.endForcedByAdmin")
                  : t("admin.manageExams.tooltips.endOutsideWindow");

                return (
                  <tr key={String(examId)} className="border-t border-slate-100">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{e.courseName || "--"}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        {fmtShort(e.startAt || e.examDate)} •{" "}
                        {Array.isArray(e?.supervisors) ? e.supervisors.length : 0} {t("roles.supervisors")}
                      </div>
                    </td>

                    <td className="py-3 pr-3 text-slate-700 dark:text-slate-200">
                      <div>{fmtDT(e.startAt)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">→ {fmtDT(e.endAt)}</div>
                    </td>

                    <td className="py-3 pr-3 text-slate-700 dark:text-slate-200">{roomsTxt}</td>

                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center rounded-xl border px-2 py-1 ${modeBadge(e.examMode)}`}
                      >
                        {t(`exam.mode.${String(e.examMode || "onsite").toLowerCase()}`)}
                      </span>
                    </td>

                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex items-center rounded-xl border px-2 py-1 ${statusBadge(displayStatusRaw)}`}
                      >
                        {displayStatusLabel}
                      </span>
                    </td>

                    <td className="py-3 pr-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      <div className="font-mono">{String(examId || "--")}</div>
                    </td>

                    <td className="py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Btn
                          onClick={() => openEdit(e)}
                          className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40"
                          title={t("admin.manageExams.tooltips.edit")}
                        >
                          {t("common.edit")}
                        </Btn>

                        <Btn
                          onClick={() =>
                            openConfirm({
                              title: t("admin.manageExams.confirm.start.title"),
                              text: t("admin.manageExams.confirm.start.text"),
                              action: () => onStartExam(e),
                            })
                          }
                          disabled={isWorking || !canStart}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          title={startTitle}
                        >
                          {isWorking ? t("common.working") : t("common.start")}
                        </Btn>

                        <Btn
                          onClick={() =>
                            openConfirm({
                              title: t("admin.manageExams.confirm.end.title"),
                              text: t("admin.manageExams.confirm.end.text"),
                              action: () => onEndExam(e),
                            })
                          }
                          disabled={isWorking || !canEnd}
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                          title={endTitle}
                        >
                          {t("common.end")}
                        </Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!refreshing && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600 dark:text-slate-300">
                    {t("admin.manageExams.table.noResults")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      <CreateExamModal
        open={createOpen}
        saving={saving}
        draftBusy={draftBusy}
        onClose={() => (!saving ? setCreateOpen(false) : null)}
        onCreate={() =>
          openConfirm({
            title: t("admin.manageExams.confirm.create.title"),
            text: t("admin.manageExams.confirm.create.text"),
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

      {/* Edit Modal */}
      <EditExamModal
        open={editOpen}
        saving={saving}
        onClose={() => (!saving ? setEditOpen(false) : null)}
        onSave={() =>
          openConfirm({
            title: t("admin.manageExams.confirm.update.title"),
            text: t("admin.manageExams.confirm.update.text"),
            action: () => submitCreateOrEdit({ isEdit: true }),
          })
        }
        onDelete={() => {
          const id = getId(editExam);
          const course = String(editExam?.courseName || "").trim() || "--";
          openConfirm({
            title: t("admin.manageExams.confirm.delete.title"),
            text: t("admin.manageExams.confirm.delete.text", { course, id: String(id || "--") }),
            action: () => onDeleteExam(editExam),
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

      {/* Confirm Modal */}
      <ModalUI
        open={confirmOpen}
        title={confirmTitle}
        onClose={() => (!saving ? setConfirmOpen(false) : null)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40"
            >
              {t("common.cancel")}
            </button>

            <button
              onClick={async () => {
                try {
                  setConfirmError(null);
                  setConfirmSuccess(null);

                  if (confirmAction) await confirmAction();

                  setConfirmSuccess(t("common.actionCompleted"));
                  window.setTimeout(() => {
                    setConfirmOpen(false);
                    setConfirmSuccess(null);
                  }, 900);
                } catch (e) {
                  setConfirmError(e?.message || t("common.actionFailed"));
                }
              }}
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-5 py-2 font-semibold"
            >
              {t("common.yesContinue")}
            </button>
          </div>
        }
      >
        {confirmError ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {confirmError}
          </div>
        ) : null}

        {confirmSuccess ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {confirmSuccess}
          </div>
        ) : null}

        <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{confirmText}</div>
      </ModalUI>
    </div>
  );
}
