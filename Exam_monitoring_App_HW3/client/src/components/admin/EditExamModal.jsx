// ===============================
// file: client/src/components/admin/EditExamModal.jsx
// ===============================
import ModalUI from "./Modal.UI.jsx";

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

export default function EditExamModal({
  open,
  saving,
  onClose,
  onSave,
  onDelete,

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
  return (
    <ModalUI
      open={open}
      title="Edit Exam"
      subtitle="Rooms and supervisors are shown dynamically from the exam."
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Btn
            onClick={onDelete}
            disabled={saving}
            className="border border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            Delete
          </Btn>

          <Btn onClick={onSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white">
            {saving ? "Saving…" : "Update & Save"}
          </Btn>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Course name">
          <input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </Field>

        <Field label="Mode">
          <select
            value={examMode}
            onChange={(e) => setExamMode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="onsite">Onsite</option>
            <option value="online">Online</option>
          </select>
        </Field>

        <Field label="Start">
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </Field>

        <Field label="End">
          <input
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </Field>

        <Field label="Lecturer">
          <select
            value={lecturerId}
            onChange={(e) => setLecturerId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {lecturers?.length === 0 ? <option value="">No lecturers</option> : null}
            {(lecturers || []).map((l) => (
              <option key={String(l?._id || l?.id)} value={String(l?._id || l?.id)}>
                {l.fullName} ({l.username})
              </option>
            ))}
          </select>
        </Field>

        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Classrooms & Supervisors (from this exam)</div>
              <div className="text-xs text-slate-500 mt-1">Edit any room/supervisor. You can also add/remove rooms here.</div>
            </div>

            <Btn onClick={addRoom} className="border border-slate-200 hover:bg-slate-50">
              + Add room
            </Btn>
          </div>

          <div className="mt-4 space-y-3">
            {(rooms || []).map((r, idx) => (
              <div key={String(r?._uid || `${r?.id}-${idx}`)} className="rounded-2xl border border-slate-200 p-3 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <Field label={`Room #${idx + 1} name`}>
                      <input
                        value={r?.name || ""}
                        onChange={(e) => setRoomField(idx, "name", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Rows">
                      <input
                        type="number"
                        min={1}
                        value={Number(r?.rows || 5)}
                        onChange={(e) => setRoomField(idx, "rows", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Cols">
                      <input
                        type="number"
                        min={1}
                        value={Number(r?.cols || 5)}
                        onChange={(e) => setRoomField(idx, "cols", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-4">
                    <Field label="Supervisor">
                      <select
                        value={r?.assignedSupervisorId || ""}
                        onChange={(e) => onSelectSupervisorForRoom(idx, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      >
                        <option value="">-- choose supervisor --</option>
                        {(supervisors || []).map((s) => (
                          <option key={String(s?._id || s?.id)} value={String(s?._id || s?.id)}>
                            {s.fullName} ({s.username})
                          </option>
                        ))}
                      </select>
                    </Field>
                    {r?.assignedSupervisorName ? (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Assigned: <span className="font-semibold">{r.assignedSupervisorName}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Btn
                      onClick={() => removeRoom(idx)}
                      className="border border-rose-200 text-rose-700 hover:bg-rose-50"
                      title="Remove room"
                      disabled={saving}
                    >
                      ✕
                    </Btn>
                  </div>
                </div>
              </div>
            ))}

            {!rooms?.length ? <div className="text-sm text-slate-600">No classrooms found in this exam.</div> : null}
          </div>
        </div>
      </div>
    </ModalUI>
  );
}
