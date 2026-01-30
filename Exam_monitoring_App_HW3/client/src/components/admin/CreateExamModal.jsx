import ModalUI from "./Modal.UI.jsx";

export default function CreateExamModal({
  open,
  saving,
  draftBusy,
  onClose,
  onCreate,
  onAutoAssign,

  // form state
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
  addRoom,
  removeRoom,
  setRoomField,
  onSelectSupervisorForRoom,
}) {
  return (
    <ModalUI
      open={open}
      title="Create New Exam"
      subtitle="Clear flow: ① Details → ② Auto-Assign (optional) → ③ Review rooms → Create"
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={saving || draftBusy}
            className="border border-slate-200 rounded-xl px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={onCreate}
            disabled={saving || draftBusy}
            className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-6 py-2 font-semibold disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Exam"}
          </button>
        </div>
      }
    >
      {/* =========================
          ① Exam Details
      ========================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-extrabold text-slate-900 mb-3">① Exam Details</div>

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

      {/* =========================
          ② Auto Assign
      ========================= */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mt-4">
        <div className="text-sm font-extrabold text-slate-900 mb-3">
          ② Auto-Assign (optional)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="number"
            min={0}
            value={totalStudentsDraft}
            onChange={(e) => setTotalStudentsDraft(e.target.value)}
            placeholder="Total students"
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />

          <input
            type="number"
            min={0}
            value={requestedRoomsDraft}
            onChange={(e) => setRequestedRoomsDraft(e.target.value)}
            placeholder="Requested rooms"
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {draftMeta?.roomsUsed
              ? `rooms=${draftMeta.roomsUsed}`
              : "Not generated"}
          </div>

          <button
            onClick={onAutoAssign}
            disabled={saving || draftBusy}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-semibold disabled:opacity-50"
          >
            {draftBusy ? "Working…" : "Auto-Assign"}
          </button>
        </div>
      </div>

      {/* =========================
          ③ Rooms & Supervisors
      ========================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-extrabold text-slate-900">
            ③ Classrooms & Supervisors
          </div>

          <button
            onClick={addRoom}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            + Add room
          </button>
        </div>

        {rooms.map((r, idx) => (
          <div key={r._uid} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            <input
              value={r.name}
              onChange={(e) => setRoomField(idx, "name", e.target.value)}
              className="md:col-span-3 rounded-xl border border-slate-200 px-3 py-2"
            />

            <input
              type="number"
              value={r.rows}
              onChange={(e) => setRoomField(idx, "rows", Number(e.target.value))}
              className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2"
            />

            <input
              type="number"
              value={r.cols}
              onChange={(e) => setRoomField(idx, "cols", Number(e.target.value))}
              className="md:col-span-2 rounded-xl border border-slate-200 px-3 py-2"
            />

            <select
              value={r.assignedSupervisorId || ""}
              onChange={(e) => onSelectSupervisorForRoom(idx, e.target.value)}
              className="md:col-span-4 rounded-xl border border-slate-200 px-3 py-2"
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
              className="md:col-span-1 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 hover:bg-rose-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ModalUI>
  );
}
