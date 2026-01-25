// client/src/components/dashboard/DashboardAddDeleteStudentsCard.jsx
import { useMemo, useState } from "react";
import {
  addStudentToExam,
  deleteStudentFromExam,
} from "../../services/dashboard.ADD.DELETE.Students.service.js";

export default function DashboardAddDeleteStudentsCard({
  examId = null,
  currentRoomId = "",
  rooms = [],
  onChanged,
}) {
  const roomOptions = useMemo(() => {
    return (rooms || [])
      .map((r) => ({
        id: String(r?.id || r?.roomId || r?.name || "").trim(),
        label: String(r?.name || r?.id || r?.roomId || "").trim(),
      }))
      .filter((x) => x.id);
  }, [rooms]);

  const initialRoom = useMemo(() => {
    const rid = String(currentRoomId || "").trim();
    if (rid) return rid;
    return roomOptions[0]?.id || "";
  }, [currentRoomId, roomOptions]);

  // -------- Add form state --------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentIdAdd, setStudentIdAdd] = useState("");
  const [roomId, setRoomId] = useState(initialRoom);

  // -------- Delete form state --------
  const [studentIdDel, setStudentIdDel] = useState("");

  // -------- UI state --------
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  function setError(text) {
    setMsg({ type: "error", text: String(text || "Something went wrong") });
  }
  function setSuccess(text) {
    setMsg({ type: "success", text: String(text || "Done") });
  }

  async function onAdd() {
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });

      const res = await addStudentToExam({
        examId,
        firstName,
        lastName,
        studentId: studentIdAdd,
        roomId,
      });

      setSuccess(
        `Added: ${res?.student?.fullName || "Student"} (${res?.student?.studentId || studentIdAdd}) • Room ${
          res?.student?.roomId || roomId
        } • Seat ${res?.student?.seat || "?"}`
      );

      // reset fields (keep room)
      setFirstName("");
      setLastName("");
      setStudentIdAdd("");

      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      setError(e?.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    try {
      setBusy(true);
      setMsg({ type: "", text: "" });

      const res = await deleteStudentFromExam({
        examId,
        studentId: studentIdDel,
      });

      setSuccess(
        `Deleted: ${res?.removed?.name || ""} (${res?.removed?.studentId || studentIdDel}) from ${
          res?.removed?.roomId || ""
        }`
      );

      setStudentIdDel("");

      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      setError(e?.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900">Manage Students</div>
          <div className="text-sm text-slate-600">
            Add a new demo student to a room, or delete by Student ID.
          </div>
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          Exam: <span className="font-mono">{examId || "running"}</span>
        </div>
      </div>

      {msg.text ? (
        <div
          className={`mt-4 rounded-2xl border p-3 text-sm font-bold ${
            msg.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-12 gap-4">
        {/* -------- Add -------- */}
        <div className="col-span-12 lg:col-span-7 rounded-3xl border border-slate-200 p-4">
          <div className="font-extrabold text-slate-900">Add Student</div>

          <div className="mt-3 grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-extrabold text-slate-600">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Olivia"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-extrabold text-slate-600">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Martin"
              />
            </div>

            <div className="col-span-12 md:col-span-4">
              <label className="text-xs font-extrabold text-slate-600">Student ID</label>
              <input
                value={studentIdAdd}
                onChange={(e) => setStudentIdAdd(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="209999999"
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <label className="text-xs font-extrabold text-slate-600">Room</label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm bg-white"
              >
                {roomOptions.length ? (
                  roomOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))
                ) : (
                  <option value="">No rooms</option>
                )}
              </select>
            </div>

            <div className="col-span-12 md:col-span-6 flex items-end">
              <button
                disabled={busy}
                onClick={onAdd}
                className="w-full rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-extrabold hover:bg-slate-800 disabled:opacity-60"
              >
                {busy ? "Working..." : "Add Student"}
              </button>
            </div>
          </div>
        </div>

        {/* -------- Delete -------- */}
        <div className="col-span-12 lg:col-span-5 rounded-3xl border border-slate-200 p-4">
          <div className="font-extrabold text-slate-900">Delete Student</div>
          <div className="mt-3">
            <label className="text-xs font-extrabold text-slate-600">Student ID</label>
            <input
              value={studentIdDel}
              onChange={(e) => setStudentIdDel(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="209999999"
            />
          </div>

          <button
            disabled={busy}
            onClick={onDelete}
            className="mt-3 w-full rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm font-extrabold hover:bg-red-100 disabled:opacity-60"
          >
            {busy ? "Working..." : "Delete Student"}
          </button>

          <div className="mt-2 text-xs text-slate-500">
            * Deletes from exam attendance + removes student user (server logic).
          </div>
        </div>
      </div>
    </div>
  );
}
