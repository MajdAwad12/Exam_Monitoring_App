import { useEffect, useState } from "react";
import ModalUI from "./Modal.UI.jsx";

export default function EditExamModal({
  open,
  saving,
  onClose,
  onSave,
  onDelete,

  // form state (from page)
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
  addRoom,
  removeRoom,
  setRoomField,
  onSelectSupervisorForRoom,
}) {
  const [localError, setLocalError] = useState(null);
  const [localSuccess, setLocalSuccess] = useState(null);

  // reset messages when modal opens
  useEffect(() => {
    if (open) {
      setLocalError(null);
      setLocalSuccess(null);
    }
  }, [open]);

  function handleSave() {
    try {
      setLocalError(null);

      if (!courseName.trim()) {
        throw new Error("Course name is required.");
      }
      if (!lecturerId) {
        throw new Error("Please select a lecturer.");
      }
      if (!rooms || rooms.length === 0) {
        throw new Error("This exam has no classrooms.");
      }

      onSave();
      setLocalSuccess("Exam updated successfully.");

      // auto close after success
      setTimeout(() => {
        setLocalSuccess(null);
        onClose();
      }, 1500);
    } catch (e) {
      setLocalError(e?.message || "Failed to update exam.");
    }
  }

  function handleDelete() {
    try {
      setLocalError(null);
      onDelete();
      setLocalSuccess("Exam deleted successfully.");

      setTimeout(() => {
        setLocalSuccess(null);
        onClose();
      }, 1200);
    } catch (e) {
      setLocalError(e?.message || "Failed to delete exam.");
    }
  }

  return (
    <ModalUI
      open={open}
      title="Edit Exam"
      subtitle="Update exam details, rooms and supervisors"
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="border border-rose-200 text-rose-700 rounded-xl px-4 py-2 font-semibold hover:bg-rose-50 disabled:opacity-50"
          >
            Delete
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-6 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update & Save"}
          </button>
        </div>
      }
    >
      {/* ===== Local messages ===== */}
      {localError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {localError}
        </div>
      ) : null}

      {localSuccess ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {localSuccess}
        </div>
      ) : null}

      {/* ===== Exam Details ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-extrabold text-slate-900 mb-3">
          Exam Details
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Course name"
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />

          <select
            value={examMode}
            onChange={(e) => setExamMode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="onsite">Onsite</option>
            <option value="online">Online</option>
          </select>

          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />

          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />

          <select
            value={lecturerId}
            onChange={(e) => setLecturerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 lg:col-span-2"
          >
            {lecturers.map((l) => (
              <option key={l._id || l.id} value={l._id || l.id}>
                {l.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== Rooms ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-extrabold text-slate-900">
            Classrooms & Supervisors
          </div>

          <button
            onClick={addRoom}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            + Add room
          </button>
        </div>

        {rooms.map((r, idx) => (
          <div
            key={r._uid || idx}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3"
          >
            <input
              value={r.name}
              onChange={(e) => setRoomField(idx, "name", e.target.value)}
              className="md:col-span-3 rounded-xl border border-slate-200 px-3 py-2"
            />

            <select
              value={r.assignedSupervisorId || ""}
              onChange={(e) =>
                onSelectSupervisorForRoom(idx, e.target.value)
              }
              className="md:col-span-7 rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">-- choose supervisor --</option>
              {supervisors.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>

            <button
              onClick={() => removeRoom(idx)}
              disabled={saving}
              className="md:col-span-2 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 hover:bg-rose-50 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ModalUI>
  );
}
