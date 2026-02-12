// ===============================
// file: client/src/components/admin/CreateExamModal.jsx
// ===============================
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ModalUI from "./Modal.UI.jsx";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
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

function StepPill({ active, done, n, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : done
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
      }`}
    >
      <span
        className={`grid h-7 w-7 place-items-center rounded-xl text-xs font-extrabold ${
          active
            ? "bg-sky-600 text-white"
            : done
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function Panel({ title, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
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
  const { t } = useTranslation();

  // steps: 0=details, 1=auto, 2=rooms
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const roomsCount = (rooms || []).length;

  const draftLabel = useMemo(() => {
    return draftMeta?.roomsUsed
      ? t("admin.createExamModal.draftResult.generated", {
          roomsUsed: draftMeta.roomsUsed,
          cap: draftMeta.roomsCapacity || 25,
        })
      : t("admin.createExamModal.draftResult.notGenerated");
  }, [draftMeta, t]);

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return Boolean(String(courseName || "").trim()) && Boolean(lecturerId) && Boolean(startAt) && Boolean(endAt);
    }
    if (step === 1) return true; // auto-assign optional
    if (step === 2) return roomsCount > 0;
    return true;
  }, [step, courseName, lecturerId, startAt, endAt, roomsCount]);

  const progressPct = useMemo(() => {
    // 0 -> 0%, 1 -> 50%, 2 -> 100%
    return step === 0 ? 0 : step === 1 ? 50 : 100;
  }, [step]);

  return (
    <ModalUI
      open={open}
      title={t("admin.createExamModal.title")}
      subtitle={t("admin.createExamModal.subtitle")}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
  <div className="flex items-center justify-between gap-6">
    {/* Left button */}
    {step > 0 ? (
      <Btn
        onClick={() => setStep((s) => Math.max(0, s - 1))}
        disabled={saving || draftBusy}
className="
  rounded-xl px-4 py-2 text-sm font-semibold border transition
  bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100
  dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/40
  disabled:opacity-40 disabled:cursor-not-allowed
"
          >
        {t("common.prev")}
      </Btn>
    ) : (
      <div />
    )}

    {/* Right button */}
    {step < 2 ? (
      <Btn
        onClick={() => setStep((s) => Math.min(2, s + 1))}
        disabled={!canGoNext || saving || draftBusy}
        className="bg-sky-600 hover:bg-sky-700 text-white px-7"
      >
        {t("common.next")}
      </Btn>
    ) : (
      <Btn
        onClick={onCreate}
        disabled={saving || draftBusy}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-7"
      >
        {saving ? t("admin.createExamModal.actions.creating") : t("admin.createExamModal.actions.createExam")}
      </Btn>
    )}
  </div>
}

    >
      {/* Stepper header */}
      <div className="mb-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StepPill
            n={1}
            label={t("admin.createExamModal.sections.details.title")}
            active={step === 0}
            done={step > 0}
            onClick={() => setStep(0)}
          />
          <StepPill
            n={2}
            label={t("admin.createExamModal.sections.autoAssign.title")}
            active={step === 1}
            done={step > 1}
            onClick={() => setStep(1)}
          />
          <StepPill
            n={3}
            label={t("admin.createExamModal.sections.rooms.title")}
            active={step === 2}
            done={false}
            onClick={() => setStep(2)}
          />

          <div className="ml-auto text-xs text-slate-600 dark:text-slate-300">
            {t("common.page")} <span className="font-bold">{step + 1}</span> / 3
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-3 h-2 w-full rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Details */}
      {step === 0 ? (
        <Panel title={t("admin.createExamModal.sections.details.title")}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label={t("admin.createExamModal.fields.courseName")}>
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
              />
            </Field>

            <Field label={t("admin.createExamModal.fields.mode")}>
              <select
                value={examMode}
                onChange={(e) => setExamMode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
              >
                <option value="onsite">{t("exam.mode.onsite")}</option>
                <option value="online">{t("exam.mode.online")}</option>
              </select>
            </Field>

            <Field label={t("admin.createExamModal.fields.start")}>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
              />
            </Field>

            <Field label={t("admin.createExamModal.fields.end")}>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
              />
            </Field>

            <div className="lg:col-span-2">
              <Field label={t("admin.createExamModal.fields.lecturer")}>
                <select
                  value={lecturerId}
                  onChange={(e) => setLecturerId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                >
                  {lecturers?.length === 0 ? <option value="">{t("admin.createExamModal.noLecturers")}</option> : null}
                  {(lecturers || []).map((l) => (
                    <option key={String(l?._id || l?.id)} value={String(l?._id || l?.id)}>
                      {l.fullName} ({l.username})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            {t("admin.manageExams.autoAssignNote")}{" "}
            <span className="font-semibold">{t("admin.manageExams.createModalOnly")}</span>.
          </div>
        </Panel>
      ) : null}

      {/* STEP 2: Auto-Assign */}
      {step === 1 ? (
        <div className="space-y-4">
          <Panel
            title={t("admin.createExamModal.sections.autoAssign.title")}
            right={
              <Btn
                onClick={onAutoAssign}
                disabled={draftBusy || saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {draftBusy ? t("common.working") : t("admin.createExamModal.actions.autoAssign")}
              </Btn>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("admin.createExamModal.fields.totalStudents")}>
                <input
                  type="number"
                  min={0}
                  value={totalStudentsDraft}
                  onChange={(e) => setTotalStudentsDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                />
              </Field>

              <Field label={t("admin.createExamModal.fields.requestedRooms")}>
                <input
                  type="number"
                  min={0}
                  value={requestedRoomsDraft}
                  onChange={(e) => setRequestedRoomsDraft(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                />
              </Field>
            </div>

            <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
              {t("admin.createExamModal.fields.draftResult")}:{" "}
              <span className="font-semibold">{draftLabel}</span>
            </div>
          </Panel>

          <Panel title={t("admin.createExamModal.lecturersAssign.title")}>
            {!draftLecturer ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">{t("admin.createExamModal.notGeneratedYet")}</div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="text-sm font-semibold text-emerald-900">
                    {t("admin.createExamModal.lecturersAssign.main", { name: draftLecturer?.name || "--" })}
                  </div>
                </div>

                {(draftCoLecturers || []).length ? (
                  <div className="space-y-2">
                    {draftCoLecturers.map((x, i) => (
                      <div key={String(x?.id || i)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {t("admin.createExamModal.lecturersAssign.co", { n: i + 1, name: x?.name || "--" })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t("admin.createExamModal.lecturersAssign.noCo")}</div>
                )}
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {/* STEP 3: Rooms */}
      {step === 2 ? (
        <Panel
          title={t("admin.createExamModal.sections.rooms.title")}
          right={
            <Btn
              onClick={addRoom}
              disabled={saving || draftBusy}
              className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40"
            >
              {t("admin.createExamModal.actions.addRoom")}
            </Btn>
          }
        >
          <div className="space-y-3">
            {!rooms?.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {t("admin.createExamModal.noRooms.prefix")}{" "}
                <span className="font-semibold">{t("admin.createExamModal.noRooms.autoAssign")}</span>{" "}
                {t("admin.createExamModal.noRooms.middle")}{" "}
                <span className="font-semibold">{t("admin.createExamModal.noRooms.addRoom")}</span>.
              </div>
            ) : null}

            {(rooms || []).map((r, idx) => (
              <div
                key={String(r?._uid || `${r?.id}-${idx}`)}
                className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <Field label={t("admin.createExamModal.roomNameLabel", { n: idx + 1 })}>
                      <input
                        value={r?.name || ""}
                        onChange={(e) => setRoomField(idx, "name", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label={t("admin.createExamModal.fields.rows")}>
                      <input
                        type="number"
                        min={1}
                        value={Number(r?.rows || 5)}
                        onChange={(e) => setRoomField(idx, "rows", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label={t("admin.createExamModal.fields.cols")}>
                      <input
                        type="number"
                        min={1}
                        value={Number(r?.cols || 5)}
                        onChange={(e) => setRoomField(idx, "cols", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-4">
                    <Field label={t("admin.createExamModal.fields.supervisor")}>
                      <select
                        value={r?.assignedSupervisorId || ""}
                        onChange={(e) => onSelectSupervisorForRoom(idx, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 bg-white dark:bg-slate-950"
                      >
                        <option value="">{t("admin.createExamModal.chooseSupervisor")}</option>
                        {(supervisors || []).map((s) => (
                          <option key={String(s?._id || s?.id)} value={String(s?._id || s?.id)}>
                            {s.fullName} ({s.username})
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <Btn
                      onClick={() => removeRoom(idx)}
                      className="border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                      title={t("admin.createExamModal.actions.removeRoom")}
                      disabled={saving || draftBusy}
                    >
                      ✕
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            ✅ {t("admin.createExamModal.roomsInList.label")}:{" "}
            <span className="font-semibold">{roomsCount}</span>
          </div>
        </Panel>
      ) : null}
    </ModalUI>
  );
}
