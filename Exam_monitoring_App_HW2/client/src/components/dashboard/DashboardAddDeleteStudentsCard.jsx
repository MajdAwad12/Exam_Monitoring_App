// client/src/components/dashboard/DashboardAddDeleteStudentsCard.jsx
import { useMemo, useState } from "react";
import {
  addStudentToExam,
  deleteStudentFromExam,
} from "../../services/dashboard.ADD.DELETE.Students.service.js";

export default function DashboardAddDeleteStudentsCard({ rooms = [], onChanged }) {
  const [tab, setTab] = useState("add"); // "add" | "delete"

  // ---- Add form state ----
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [roomId, setRoomId] = useState("");

  // ---- Delete form state ----
  const [deleteStudentId, setDeleteStudentId] = useState("");

  // ---- UX state ----
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const roomOptions = useMemo(() => {
    return (rooms || [])
      .map((r) => ({
        id: String(r?.id || r?.roomId || r?.name || "").trim(),
        label: String(r?.name || r?.id || r?.roomId || "").trim(),
        capacity: r?.capacity,
      }))
      .filter((x) => x.id && x.label);
  }, [rooms]);

  const clearMsgs = () => {
    setOkMsg("");
    setErrMsg("");
  };

  const normalizeId = (v) => String(v || "").trim();

  async function handleAdd(e) {
    e.preventDefault();
    clearMsgs();

    const payload = {
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      studentId: normalizeId(studentId),
      roomId: normalizeId(roomId),
    };

    if (!payload.firstName || !payload.lastName || !payload.studentId || !payload.roomId) {
      setErrMsg("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);
      const res = await addStudentToExam(payload);
      setOkMsg(res?.message || "Student added successfully.");
      // reset add form
      setFirstName("");
      setLastName("");
      setStudentId("");
      setRoomId("");

      // let parent refresh dashboard snapshot
      if (typeof onChanged === "function") onChanged();
    } catch (err) {
      setErrMsg(err?.message || "Failed to add student.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    clearMsgs();

    const sid = normalizeId(deleteStudentId);
    if (!sid) {
      setErrMsg("Please enter Student ID.");
      return;
    }

    try {
      setLoading(true);
      const res = await deleteStudentFromExam({ studentId: sid });
      setOkMsg(res?.message || "Student deleted successfully.");
      setDeleteStudentId("");

      if (typeof onChanged === "function") onChanged();
    } catch (err) {
      setErrMsg(err?.message || "Failed to delete student.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-extrabold text-slate-900">Students Control</div>
          <div className="text-sm text-slate-600 mt-0.5">
            Admin/Lecturer can add / delete students for the running exam
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setTab("add");
            clearMsgs();
          }}
          className={[
            "px-4 py-2 rounded-2xl text-sm font-extrabold border",
            tab === "add"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          Add Student
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("delete");
            clearMsgs();
          }}
          className={[
            "px-4 py-2 rounded-2xl text-sm font-extrabold border",
            tab === "delete"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50",
          ].join(" ")}
        >
          Delete Student
        </button>
      </div>

      {/* Messages */}
      {(okMsg || errMsg) && (
        <div className="mt-4">
          {okMsg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 text-sm font-semibold">
              {okMsg}
            </div>
          ) : null}
          {errMsg ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-800 text-sm font-semibold mt-2">
              {errMsg}
            </div>
          ) : null}
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {tab === "add" ? (
          <form onSubmit={handleAdd} className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-bold text-slate-700">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., Olivia"
                disabled={loading}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-bold text-slate-700">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., Martin"
                disabled={loading}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-bold text-slate-700">Student ID</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., 322001234"
                disabled={loading}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-bold text-slate-700">Room</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                disabled={loading}
              >
                <option value="">Select room...</option>
                {roomOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                    {Number.isFinite(r.capacity) ? ` (cap: ${r.capacity})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFirstName("");
                  setLastName("");
                  setStudentId("");
                  setRoomId("");
                  clearMsgs();
                }}
                className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-extrabold"
                disabled={loading}
              >
                Clear
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-2xl bg-slate-900 text-white hover:bg-black text-sm font-extrabold disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Student"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDelete} className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-8">
              <label className="text-xs font-bold text-slate-700">Student ID</label>
              <input
                value={deleteStudentId}
                onChange={(e) => setDeleteStudentId(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="e.g., 322001234"
                disabled={loading}
              />
            </div>

            <div className="col-span-12 md:col-span-4 flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteStudentId("");
                  clearMsgs();
                }}
                className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-extrabold"
                disabled={loading}
              >
                Clear
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 text-sm font-extrabold disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
