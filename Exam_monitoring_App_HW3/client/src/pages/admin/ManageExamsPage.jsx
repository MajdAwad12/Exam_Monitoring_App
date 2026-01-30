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

function getId(x) {
  return x?._id || x?.id;
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
  return m === "online" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-indigo-50 text-indigo-700 border-indigo-200";
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
   Small UI primitives
========================= */
function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>{children}</div>;
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

  const [createNotice, setCreateNotice] = useState(null);
  const [editNotice, setEditNotice] = useState(null);
  const [workingId, setWorkingId] = useState(null);

  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editExam, setEditExam] = useState(null);

  const msgTimerRef = useRef(null);
  function showMsg(text, ms = 2500) {
    setMsg(text);
    if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
    msgTimerRef.current = window.setTimeout(() => {
      setMsg(null);
      msgTimerRef.current = null;
    }, ms);
  }

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setInitialLoading(true);

    try {
      const [lsRes, ssRes, exRes] = await Promise.all([
        listUsers("lecturer"),
        listUsers("supervisor"),
        getAdminExams(),
      ]);
      setLecturers(unwrapUsers(lsRes));
      setSupervisors(unwrapUsers(ssRes));
      setExams(unwrapExams(exRes));
    } catch (e) {
      setError(e?.message || "Failed to load admin data");
    } finally {
      if (silent) setRefreshing(false);
      else setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh({ silent: false });
  }, []);

  if (initialLoading) return <RocketLoader />;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xl font-extrabold text-slate-900">Exam Management</div>
          <Btn onClick={() => setCreateOpen(true)} className="bg-sky-600 hover:bg-sky-700 text-white">
            + Create New Exam
          </Btn>
        </div>
      </Card>

      {(error || msg) && (
        <div className={`rounded-2xl border p-4 ${error ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
          {error || msg}
        </div>
      )}

      <CreateExamModal
        open={createOpen}
        saving={saving}
        notice={createNotice}
        setNotice={setCreateNotice}
        onClose={() => (!saving ? setCreateOpen(false) : null)}
        onSubmit={() => submitCreateOrEdit({ isEdit: false })}
      />

      <EditExamModal
        open={editOpen}
        saving={saving}
        notice={editNotice}
        setNotice={setEditNotice}
        onClose={() => (!saving ? setEditOpen(false) : null)}
        onSubmit={() => submitCreateOrEdit({ isEdit: true })}
        onDelete={() => {}}
      />
    </div>
  );

  async function submitCreateOrEdit({ isEdit }) {
    setSaving(true);
    try {
      if (!isEdit) {
        await createExam({});
        setCreateNotice({ type: "success", text: "Exam created successfully." });
        setTimeout(() => {
          setCreateNotice(null);
          setCreateOpen(false);
        }, 1500);
      }
    } catch (e) {
      if (!isEdit) setCreateNotice({ type: "error", text: e?.message || "Failed to create exam" });
      else setEditNotice({ type: "error", text: e?.message || "Failed to save exam" });
    } finally {
      setSaving(false);
    }
  }
}
