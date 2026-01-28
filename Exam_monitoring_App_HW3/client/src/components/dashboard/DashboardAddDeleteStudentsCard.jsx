// client/src/components/dashboard/DashboardAddDeleteStudentsCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addStudentToExam,
  deleteStudentFromExam,
} from "../../services/dashboard.ADD.DELETE.Students.service.js";

function normalizeRoomId(v) {
  return String(v ?? "").trim();
}

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
    const rid = normalizeRoomId(currentRoomId);
    if (rid) return rid;
    return roomOptions[0]?.id || "";
  }, [currentRoomId, roomOptions]);

  // -------- Add form state --------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentIdAdd, setStudentIdAdd] = useState("");
  const [roomId, setRoomId] = useState(initialRoom);

  // keep roomId synced if rooms/currentRoomId change
  useEffect(() => {
    if (!roomId && initialRoom) setRoomId(initialRoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoom]);

  // -------- Delete form state --------
  const [studentIdDel, setStudentIdDel] = useState("");

  // -------- UI state (separate per tab) --------
  const [addBusy, setAddBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const [addMsg, setAddMsg] = useState({ type: "", text: "" });
  const [delMsg, setDelMsg] = useState({ type: "", text: "" });

  const addTimerRef = useRef(null);
  const delTimerRef = useRef(null);

  // auto-dismiss helper (per tab)
  function showAddMsg(type, text) {
    if (addTimerRef.current) clearTimeout(addTimerRef.current);
    setAddMsg({ type, text: String(text || "") });
    addTimerRef.current = setTimeout(() => {
      setAddMsg({ type: "", text: "" });
      addTimerRef.current = null;
    }, 1600);
  }

  function showDelMsg(type, text) {
    if (delTimerRef.current) clearTimeout(delTimerRef.current);
    setDelMsg({ type, text: String(text || "") });
    delTimerRef.current = setTimeout(() => {
      setDelMsg({ type: "", text: "" });
      delTimerRef.current = null;
    }, 1600);
  }

  useEffect(() => {
    return () => {
      if (addTimerRef.current) clearTimeout(addTimerRef.current);
      if (delTimerRef.current) clearTimeout(delTimerRef.current);
    };
  }, []);

  async function onAdd() {
    try {
      setAddBusy(true);
      setAddMsg({ type: "", text: "" });

      const res = await addStudentToExam({
        examId,
        firstName,
        lastName,
        studentId: studentIdAdd,
        roomId,
      });

      showAddMsg(
        "success",
        `Added: ${res?.student?.fullName || "Student"} (${
          res?.student?.studentId || studentIdAdd
        }) • Room ${res?.student?.roomId || roomId} • Seat ${res?.student?.seat || "?"}`
      );

      // reset fields (keep room)
      setFirstName("");
      setLastName("");
      setStudentIdAdd("");

      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      showAddMsg("error", e?.message || "Something went wrong");
    } finally {
      setAddBusy(false);
    }
  }

  async function onDelete() {
    try {
      setDelBusy(true);
      setDelMsg({ type: "", text: "" });

      const res = await deleteStudentFromExam({
        examId,
        studentId: studentIdDel,
      });

      showDelMsg(
        "success",
        `Deleted: ${res?.removed?.name || ""} (${res?.removed?.studentId || studentIdDel}) from ${
          res?.removed?.roomId || ""
        }`
      );

      setStudentIdDel("");

      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      showDelMsg("error", e?.message || "Something went wrong");
    } finally {
      setDelBusy(false);
    }
  }

  const MsgBox = ({ msg }) => {
    if (!msg?.text) return null;
    const ok = msg.type === "success";
    return (
      <div
        className={`mt-3 rounded-2xl border p-3 text-sm font-bold ${
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {msg.text}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-extrabold text-slate-900">Manage Students</div>
       
        </div>

      </div>

      <div className="mt-5 grid grid-cols-12 gap-4">
        {/* -------- Add -------- */}
        <div className="col-span-12 lg:col-span-7 rounded-3xl border border-slate-200 p-4">
          <div className="font-extrabold text-slate-600">Add Student</div>

          <MsgBox msg={addMsg} />

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
                placeholder="000000000"
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
              disabled={addBusy}
              onClick={onAdd}
              className={[
                "w-full rounded-2xl px-4 py-2 text-sm font-extrabold",
                "text-white bg-emerald-600 hover:bg-emerald-700",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                "shadow-sm hover:shadow-md transition-all",
                "ring-1 ring-black/5",
              ].join(" ")}
            >
              <span className="text-base leading-none">{addBusy ? "⏳" : "➕"}</span>
              <span>{addBusy ? "Adding..." : "Add Student"}</span>
            </button>
            </div>
          </div>
        </div>

        {/* -------- Delete -------- */}
        <div className="col-span-12 lg:col-span-5 rounded-3xl border border-slate-200 p-4">
          <div className="font-extrabold text-slate-900">Delete Student</div>

          <MsgBox msg={delMsg} />

          <div className="mt-3">
            <label className="text-xs font-extrabold text-slate-600">Student ID</label>
            <input
              value={studentIdDel}
              onChange={(e) => setStudentIdDel(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="000000000"
            />
          </div>

          <button
            disabled={delBusy}
            onClick={onDelete}
            className={[
              "mt-3 w-full rounded-2xl px-4 py-2 text-sm font-extrabold",
              "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2",
              "shadow-sm hover:shadow-md transition-all",
              "ring-1 ring-black/5",
            ].join(" ")}
          >
            <span className="text-base leading-none">{delBusy ? "⏳" : "🗑️"}</span>
            <span>{delBusy ? "Deleting..." : "Delete Student"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
