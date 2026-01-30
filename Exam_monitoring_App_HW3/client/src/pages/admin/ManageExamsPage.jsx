// ===============================
// file: client/src/pages/admin/ManageExamsPage.jsx
// ===============================
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";

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
  if (s === "ended") return "bg-slate-100 text-slate-700 border-slate-200";
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
  // allow leading zeros, only digits
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

  const valid = Number.isFinite(startMs) && Number.isFinite(endMs) && startMs > 0 && endMs > 0 && endMs > startMs;
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
   Small UI primitives (same style as before)
========================= */
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
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
  const [courseName, setCourseName] = useState("Introduction to Web Systems");
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
        const [lsRes, ssRes, exRes] = await Promise.all([listUsers("lecturer"), listUsers("supervisor"), getAdminExams()]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     Admin gate
  ========================= */
  if (initialLoading) return <RocketLoader />;

  if (me?.role !== "admin") {
    return (
      <Card className="p-6">
        <div className="text-xl font-extrabold text-slate-900">Exam Management</div>
        <div className="mt-2 text-slate-600">
          This page is available for <span className="font-semibold">Admin</span> only.
        </div>
      </Card>
    );
  }

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
    setCourseName("Introduction to Web Systems");
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

    // merge supervisor assignment if server stores it also in exam.supervisors[]
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
      throw new Error("Please enter valid Start/End date and time.");
    }
    if (end.getTime() <= start.getTime()) {
      throw new Error("End time must be after Start time.");
    }
    if (!courseName.trim()) {
      throw new Error("Course name is required.");
    }
    if (!lecturerId) {
      throw new Error("Please choose a lecturer.");
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

    if (!cleanRooms.length) throw new Error("Please add at least 1 classroom (or use Auto-Assign).");

    const missing = cleanRooms.filter((r) => !r.assignedSupervisorId);
    if (missing.length) {
      throw new Error("Please assign a supervisor for each classroom (or use Auto-Assign in Create modal).");
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

        showMsg("Exam created successfully.", 2500);
        setCreateOpen(false);
        setEditExam(null);
      } else {
        const examId = getId(editExam);
        if (!examId) throw new Error("Missing exam id");

        const res = await updateExamAdmin(examId, payload);
        const updated = res?.exam || res?.data?.exam;
        if (updated) upsertExamLocal(updated);

        showMsg("Exam updated successfully.", 2500);
        setEditOpen(false);
        setEditExam(null);
      }

      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || "Failed to save exam");
      throw e; // so Confirm modal can show error too if needed
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteExam(examId) {
    if (!examId) return;
    setSaving(true);
    setMsg(null);
    setError(null);

    try {
      await deleteExamAdmin(examId);
      removeExamLocal(examId);

      showMsg("Exam deleted successfully.", 2500);
      setEditOpen(false);
      setEditExam(null);

      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || "Failed to delete exam");
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
      const msg2 = ws.future ? "Cannot start exam yet (start time hasn't arrived)." : "Cannot start exam (time window ended).";
      setError(msg2);
      throw new Error(msg2);
    }

    setWorkingId(id);
    setMsg(null);
    setError(null);

    try {
      await startExam(id);
      upsertExamLocal({ ...exam, status: "running" });

      showMsg("Exam started (status set to running).", 2500);
      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || "Failed to start exam");
      throw e;
    } finally {
      setWorkingId(null);
    }
  }

  async function onEndExam(exam) {
    const id = getId(exam);
    if (!id) return;

    const ws = windowState(exam);
    if (!ws.active) {
      const msg2 = "Cannot end exam outside its real time window.";
      setError(msg2);
      throw new Error(msg2);
    }

    setWorkingId(id);
    setMsg(null);
    setError(null);

    try {
      await endExam(id);
      upsertExamLocal({ ...exam, status: "ended" });

      showMsg("Exam ended (status set to ended).", 2500);
      await refresh({ silent: true });
    } catch (e) {
      setError(e?.message || "Failed to end exam");
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
        throw new Error("Please enter valid Start/End date and time.");
      }
      if (end.getTime() <= start.getTime()) {
        throw new Error("End time must be after Start time.");
      }

      const totalStudents = normalizeIntInput(totalStudentsDraft);
      if (!Number.isFinite(totalStudents)) {
        throw new Error("Total students must be a valid non-negative integer (digits only).");
      }
      if (totalStudents <= 0) {
        throw new Error("Total students must be greater than 0 to use Auto-Assign.");
      }

      const requestedRooms = normalizeIntInput(requestedRoomsDraft);
      if (!Number.isFinite(requestedRooms)) {
        throw new Error("Requested rooms must be a valid non-negative integer (digits only).");
      }

      const res = await autoAssignDraft({
        examDate: start.toISOString(),
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        totalStudents,
        requestedRooms,
      });

      const draft = res?.draft || res?.data?.draft;
      if (!draft) throw new Error("Draft auto-assign failed (no draft returned).");

      const cls = safeArr(draft?.classrooms, []).map((r) => ({
        _uid: nextRoomUid(),
        id: String(r?.id || r?.name || "").trim(),
        name: String(r?.name || r?.id || "").trim(),
        rows: Number(r?.rows || 5),
        cols: Number(r?.cols || 5),
        assignedSupervisorId: r?.assignedSupervisorId ? String(r.assignedSupervisorId) : "",
        assignedSupervisorName: String(r?.assignedSupervisorName || ""),
      }));

      if (!cls.length) throw new Error("Draft returned no classrooms.");

      setRooms(cls);
      setDraftMeta(draft?.meta || null);

      const lec = draft?.lecturer || null;
      const co = safeArr(draft?.coLecturers, []);
      setDraftLecturer(lec);
      setDraftCoLecturers(co);

      if (lec?.id) setLecturerId(String(lec.id));

      showMsg("Auto-Assign draft created. Review rooms/supervisors, then Create.", 3200);
    } catch (e) {
      setError(e?.message || "Failed to auto-assign draft");
      throw e;
    } finally {
      setDraftBusy(false);
    }
  }

  /* =========================
     Derived UI lists
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
     Render
  ========================= */
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold text-slate-900">Exam Management</div>
            <div className="text-sm text-slate-600 mt-1">
              Admin control: create, browse, filter, update, delete, and control start/end.
              <span className="font-semibold"> Start/End are enabled only during the real time window.</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              ✅ Auto-Assign is available <span className="font-semibold">ONLY inside Create Exam modal</span>.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Btn onClick={() => refresh({ silent: true })} className="border border-slate-200 hover:bg-slate-50">
              {refreshing ? "Refreshing…" : "Refresh"}
            </Btn>
            <Btn onClick={openCreate} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3">
              + Create New Exam
            </Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-xs text-emerald-700">Running</div>
            <div className="text-2xl font-extrabold text-emerald-800">{stats.running}</div>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="text-xs text-sky-700">Scheduled</div>
            <div className="text-2xl font-extrabold text-sky-800">{stats.scheduled}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
            <div className="text-xs text-slate-600">Ended</div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.ended}</div>
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Search & Filters</div>
            <div className="text-sm text-slate-600">Find exams by course, room, mode, id, date range.</div>
          </div>
          <div className="text-sm text-slate-600">
            Showing <span className="font-bold text-slate-900">{filtered.length}</span> results
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-4">
          <div className="lg:col-span-4">
            <Field label="Search" hint="course / room / id / mode">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. Web / A101 / running / 65a..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="Status">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="running">Running</option>
                <option value="ended">Ended</option>
              </select>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="Mode">
              <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="all">All</option>
                <option value="onsite">Onsite</option>
                <option value="online">Online</option>
              </select>
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="From">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="To">
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2">
            <Btn
              onClick={() => {
                setQ("");
                setStatusFilter("all");
                setModeFilter("all");
                setFromDate("");
                setToDate("");
              }}
              className="border border-slate-200 hover:bg-slate-50"
            >
              Clear filters
            </Btn>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Rows:</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
            </select>

            <div className="flex items-center gap-2">
              <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="border border-slate-200 hover:bg-slate-50">
                Prev
              </Btn>
              <div className="text-sm text-slate-700">
                Page <span className="font-bold">{page}</span> / {totalPages}
              </div>
              <Btn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="border border-slate-200 hover:bg-slate-50">
                Next
              </Btn>
            </div>
          </div>
        </div>
      </Card>

      {/* Exams table */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-slate-900">Exams</div>
            <div className="text-sm text-slate-600">Start/End work only during the real time window (startAt → endAt).</div>
          </div>
          {refreshing ? <div className="text-sm text-slate-600">Loading…</div> : null}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-3">Course</th>
                <th className="py-2 pr-3">Schedule</th>
                <th className="py-2 pr-3">Rooms</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paged.map((e) => {
                const examId = getId(e);
                const isWorking = workingId === examId;

                const ws = windowState(e);
                const windowActive = ws.active;
                const windowFuture = ws.future;

                const dbStatus = String(e?.status || "scheduled").toLowerCase();
                const displayStatus =
                  dbStatus === "ended" || dbStatus === "running"
                    ? dbStatus
                    : windowActive
                    ? "running"
                    : windowFuture
                    ? "scheduled"
                    : "ended";

                const roomsTxt =
                  safeArr(e.classrooms, [])
                    .map((r) => r?.name || r?.id)
                    .filter(Boolean)
                    .join(", ") || "--";

                const startTitle = windowActive
                  ? "Start / Resume exam (within real time window)"
                  : windowFuture
                  ? "Cannot start yet (before start time)"
                  : "Cannot start (time window ended)";

                const endTitle = windowActive ? "End exam now (within real time window)" : "Cannot end outside exam time window";

                return (
                  <tr key={String(examId)} className="border-t border-slate-100">
                    <td className="py-3 pr-3">
                      <div className="font-bold text-slate-900">{e.courseName || "--"}</div>
                      <div className="text-xs text-slate-500">
                        {fmtShort(e.startAt || e.examDate)} • {Array.isArray(e?.supervisors) ? e.supervisors.length : 0} supervisors
                      </div>
                    </td>

                    <td className="py-3 pr-3 text-slate-700">
                      <div>{fmtDT(e.startAt)}</div>
                      <div className="text-xs text-slate-500">→ {fmtDT(e.endAt)}</div>
                    </td>

                    <td className="py-3 pr-3 text-slate-700">{roomsTxt}</td>

                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center rounded-xl border px-2 py-1 ${modeBadge(e.examMode)}`}>{String(e.examMode || "onsite")}</span>
                    </td>

                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center rounded-xl border px-2 py-1 ${statusBadge(displayStatus)}`}>{displayStatus}</span>
                    </td>

                    <td className="py-3 pr-3 text-xs text-slate-500">
                      <div className="font-mono">{String(examId || "--")}</div>
                    </td>

                    <td className="py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Btn onClick={() => openEdit(e)} className="border border-slate-200 hover:bg-slate-50" title="Edit exam details">
                          Edit
                        </Btn>

                        <Btn
                          onClick={() =>
                            openConfirm({
                              title: "Start exam now?",
                              text: "This will set status to RUNNING (allowed only within the real time window).",
                              action: () => onStartExam(e),
                            })
                          }
                          disabled={isWorking || !windowActive}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          title={startTitle}
                        >
                          {isWorking ? "Working…" : "Start"}
                        </Btn>

                        <Btn
                          onClick={() =>
                            openConfirm({
                              title: "End exam now?",
                              text: "This will set status to ENDED. You can still START again while the exam is ACTIVE by time window.",
                              action: () => onEndExam(e),
                            })
                          }
                          disabled={isWorking || !windowActive}
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                          title={endTitle}
                        >
                          End
                        </Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!refreshing && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-600">
                    No exams found with current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* =========================
          Create Modal
      ========================= */}
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

      {/* =========================
          Edit Modal
      ========================= */}
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
          const course = String(editExam?.courseName || "").trim() || "--";
          openConfirm({
            title: "Delete exam?",
            text: `You are about to delete this exam:\n\nCourse: ${course}\nID: ${String(id || "--")}\n\nThis action cannot be undone.`,
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

      {/* =========================
          Confirm Modal (ModalUI)
      ========================= */}
      <ModalUI
        open={confirmOpen}
        title={confirmTitle}
        onClose={() => (!saving ? setConfirmOpen(false) : null)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
              className="border border-slate-200 rounded-xl px-4 py-2 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                try {
                  setConfirmError(null);
                  setConfirmSuccess(null);

                  if (confirmAction) await confirmAction();

                  setConfirmSuccess("Action completed successfully.");
                  window.setTimeout(() => {
                    setConfirmOpen(false);
                    setConfirmSuccess(null);
                  }, 900);
                } catch (e) {
                  setConfirmError(e?.message || "Action failed.");
                }
              }}
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-5 py-2 font-semibold"
            >
              Yes, continue
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

        <div className="text-sm text-slate-700 whitespace-pre-line">{confirmText}</div>
      </ModalUI>
    </div>
  );
}
