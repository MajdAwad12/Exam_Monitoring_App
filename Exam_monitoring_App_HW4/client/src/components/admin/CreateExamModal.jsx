// ===============================
// file: client/src/components/admin/CreateExamModal.jsx
// ===============================
import ModalUI from "./Modal.UI.jsx";

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-extrabold text-slate-900">{title}</div>
      {desc ? <div className="text-xs text-slate-600 mt-1">{desc}</div> : null}
    </div>
  );
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

export default function CreateExamModal({
  open,
  saving,
  draftBusy,
  onClose,
  onCreate,
  onAutoAssign,

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
          <Btn onClick={onClose} disabled={saving || draftBusy} className="border border-slate-200 hover:bg-white">
            Cancel
          </Btn>

          <Btn
            onClick={onCreate}
            disabled={saving || draftBusy}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {saving ? "Creating…" : "Create Exam"}
          </Btn>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionTitle title="① Exam Details" desc="Fill the basics. Nothing is guessed." />

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

            <Field label="Lecturer" hint="Main lecturer (auto-assign may override for grouping)">
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

            <div className="lg:col-span-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-600">Rooms currently in list</div>
              <div className="text-2xl font-extrabold text-slate-900">{rooms?.length || 0}</div>
              <div className="text-[11px] text-slate-500 mt-1">Starts from 0. Auto-Assign can grow or shrink this list.</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <SectionTitle title="② Auto-Assign (optional)" desc="Computes rooms by students (cap=25) and assigns 1 supervisor per room + lecturers grouping (1 per 3 rooms)." />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="Total students" hint="Auto decides rooms">
              <input
                type="number"
                min={0}
                value={totalStudentsDraft}
                onChange={(e) => setTotalStudentsDraft(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </Field>

            <Field label="Requested rooms (min)" hint="0 = AUTO">
              <input
                type="number"
                min={0}
                value={requestedRoomsDraft}
                onChange={(e) => setRequestedRoomsDraft(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </Field>

            <Field label="Draft result">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                {draftMeta?.roomsUsed ? `rooms=${draftMeta.roomsUsed}, cap=${draftMeta.roomsCapacity || 25}` : "Not generated yet"}
              </div>
            </Field>

            <div className="flex items-end">
              <Btn
                onClick={onAutoAssign}
                disabled={draftBusy || saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                title="Generate assignment draft"
              >
                {draftBusy ? "Working…" : "Auto-Assign"}
              </Btn>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-bold text-slate-900">Lecturers Assignment (1 per 3 rooms)</div>
            <div className="text-xs text-slate-600 mt-1">Rooms split into groups of 3. Main lecturer gets first group, co-lecturers get next groups.</div>

            {!draftLecturer ? (
              <div className="mt-3 text-sm text-slate-600">Not generated yet.</div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-900">Main Lecturer: {draftLecturer?.name || "--"}</div>
                  <div className="text-xs text-slate-600 mt-1">Rooms: {(draftLecturer?.roomIds || []).join(", ") || "--"}</div>
                </div>

                {(draftCoLecturers || []).length ? (
                  <div className="space-y-2">
                    {draftCoLecturers.map((x, i) => (
                      <div key={String(x?.id || i)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-sm font-semibold text-slate-900">Co-Lecturer #{i + 1}: {x?.name || "--"}</div>
                        <div className="text-xs text-slate-600 mt-1">Rooms: {(x?.roomIds || []).join(", ") || "--"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-2">No co-lecturers needed for this rooms count.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle title="③ Classrooms & Supervisors" desc="You can add/remove rooms. Each room must have a supervisor." />
            <Btn onClick={addRoom} className="border border-slate-200 hover:bg-slate-50">
              + Add room
            </Btn>
          </div>

          <div className="mt-3 space-y-3">
            {!rooms?.length ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                No rooms yet. Use <span className="font-semibold">Auto-Assign</span> (recommended) or <span className="font-semibold">+ Add room</span>.
              </div>
            ) : null}

            {(rooms || []).map((r, idx) => (
              <div key={String(r?._uid || `${r?.id}-${idx}`)} className="rounded-2xl border border-slate-200 p-3 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <Field label={`Room #${idx + 1} name`} hint="e.g. A101">
                      <input
                        value={r?.name || ""}
                        onChange={(e) => setRoomField(idx, "name", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Rows" hint="default 5">
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
                    <Field label="Cols" hint="default 5">
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
                      disabled={saving || draftBusy}
                    >
                      ✕
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalUI>
  );
}
