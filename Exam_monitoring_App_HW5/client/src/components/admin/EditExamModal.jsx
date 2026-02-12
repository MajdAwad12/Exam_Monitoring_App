// ===============================
// file: client/src/components/admin/EditExamModal.jsx
// ===============================
import { useTranslation } from "react-i18next";
import ModalUI from "./Modal.UI.jsx";

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
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

function Section({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {title}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
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
  const { t } = useTranslation();

  return (
    <ModalUI
      open={open}
      title={t("admin.editExamModal.title")}
      subtitle={t("admin.editExamModal.subtitle")}
      onClose={onClose}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Btn
            onClick={onDelete}
            disabled={saving}
            className="border border-rose-200 text-rose-700 hover:bg-rose-50"
          >
            {t("admin.editExamModal.actions.delete")}
          </Btn>

          <div className="flex items-center gap-2">
            <Btn
              onClick={onClose}
              disabled={saving}
              className="border border-slate-200 dark:border-slate-800 hover:bg-white dark:bg-slate-950"
            >
              {t("common.cancel")}
            </Btn>
            <Btn
              onClick={onSave}
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white"
            >
              {saving
                ? t("admin.editExamModal.actions.saving")
                : t("admin.editExamModal.actions.updateSave")}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <Section title={t("admin.editExamModal.title")}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label={t("admin.editExamModal.fields.courseName")}>
              <input
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
              />
            </Field>

            <Field label={t("admin.editExamModal.fields.mode")}>
              <select
                value={examMode}
                onChange={(e) => setExamMode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
              >
                <option value="onsite">{t("exam.mode.onsite")}</option>
                <option value="online">{t("exam.mode.online")}</option>
              </select>
            </Field>

            <Field label={t("admin.editExamModal.fields.start")}>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
              />
            </Field>

            <Field label={t("admin.editExamModal.fields.end")}>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
              />
            </Field>

            <Field label={t("admin.editExamModal.fields.lecturer")}>
              <select
                value={lecturerId}
                onChange={(e) => setLecturerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
              >
                {lecturers?.length === 0 ? (
                  <option value="">{t("admin.editExamModal.noLecturers")}</option>
                ) : null}
                {(lecturers || []).map((l) => (
                  <option key={String(l?._id || l?.id)} value={String(l?._id || l?.id)}>
                    {l.fullName} ({l.username})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section
          title={t("admin.editExamModal.rooms.title")}
          right={
            <Btn
              onClick={addRoom}
              disabled={saving}
              className="border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40"
            >
              {t("admin.editExamModal.actions.addRoom")}
            </Btn>
          }
        >
          <div className="space-y-3">
            {(rooms || []).map((r, idx) => (
              <div
                key={String(r?._uid || `${r?.id}-${idx}`)}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <Field label={t("admin.editExamModal.roomNameLabel", { n: idx + 1 })}>
                      <input
                        value={r?.name || ""}
                        onChange={(e) => setRoomField(idx, "name", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label={t("admin.editExamModal.fields.rows")}>
                      <input
                        type="number"
                        min={1}
                        value={Number(r?.rows || 5)}
                        onChange={(e) => setRoomField(idx, "rows", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label={t("admin.editExamModal.fields.cols")}>
                      <input
                        type="number"
                        min={1}
                        value={Number(r?.cols || 5)}
                        onChange={(e) => setRoomField(idx, "cols", Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-4">
                    <Field label={t("admin.editExamModal.fields.supervisor")}>
                      <select
                        value={r?.assignedSupervisorId || ""}
                        onChange={(e) => onSelectSupervisorForRoom(idx, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
                      >
                        <option value="">{t("admin.editExamModal.chooseSupervisor")}</option>
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
                      className="border border-rose-200 text-rose-700 hover:bg-rose-50"
                      title={t("admin.editExamModal.actions.removeRoom")}
                      disabled={saving}
                    >
                      ✕
                    </Btn>
                  </div>
                </div>
              </div>
            ))}

            {!rooms?.length ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {t("admin.editExamModal.noRooms")}
              </div>
            ) : null}
          </div>
        </Section>
      </div>
    </ModalUI>
  );
}
