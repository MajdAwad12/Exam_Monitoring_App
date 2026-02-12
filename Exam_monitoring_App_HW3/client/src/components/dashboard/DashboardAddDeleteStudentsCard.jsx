// client/src/components/dashboard/DashboardAddDeleteStudentsCard.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  addStudentToExam,
  deleteStudentFromExam,
} from "../../services/dashboard.ADD.DELETE.Students.service";

function normRoomKey(v) {
  return String(v || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function roomLabel(r) {
  return String(r?.id || r?.roomId || r?.name || "").trim();
}

export default function DashboardAddDeleteStudentsCard({
  examId = "",
  currentRoomId = "",
  rooms = [],
  onChanged,
}) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  const roomOptions = useMemo(() => {
    const list = Array.isArray(rooms) ? rooms : [];
    const mapped = list
      .map((r) => {
        const label = roomLabel(r);
        if (!label) return null;
        return { value: label, key: normRoomKey(label), label };
      })
      .filter(Boolean);

    const seen = new Set();
    const unique = [];
    for (const it of mapped) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      unique.push(it);
    }
    return unique;
  }, [rooms]);

  const [roomId, setRoomId] = useState(currentRoomId || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [delStudentId, setDelStudentId] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (currentRoomId) setRoomId(currentRoomId);
  }, [currentRoomId]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (busy) return;
    setBusy(true);
    try {
      const res = await addStudentToExam({
        examId,
        roomId: roomId || currentRoomId || "",
        firstName,
        lastName,
        studentId,
      });

      setOk(
        res?.message ||
          t("dashboard.manageStudents.ok.add", "Student added to class successfully")
      );

      setFirstName("");
      setLastName("");
      setStudentId("");

      onChanged?.();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    setError("");
    setOk("");

    if (busy) return;
    setBusy(true);
    try {
      const res = await deleteStudentFromExam({
        examId,
        studentId: delStudentId,
      });

      setOk(
        res?.message ||
          t("dashboard.manageStudents.ok.delete", "Student removed from class successfully")
      );

      setDelStudentId("");
      onChanged?.();
    } catch (err) {
      setError(err?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/40 backdrop-blur p-3"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {ok}
        </div>
      ) : null}

      {/* Two compact cards side-by-side on lg+, stacked on mobile */}
      <div className="grid grid-cols-12 gap-4">
        {/* ===== Add ===== */}
        <form
          onSubmit={handleAdd}
          className="col-span-12 lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3"
        >
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {t("dashboard.manageStudents.actions.add", "Add student")}
          </div>

          <div className="mt-3 grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12 sm:col-span-5">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {t("dashboard.manageStudents.fields.room", "Room")}
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 w-full max-w-[260px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="">
                  {t("dashboard.manageStudents.placeholders.chooseRoom", "Choose room")}
                </option>
                {roomOptions.map((r) => (
                  <option key={r.key} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 sm:col-span-4">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {t("dashboard.manageStudents.fields.firstName", "First name")}
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full max-w-[220px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
                placeholder={t("dashboard.manageStudents.placeholders.firstName", "e.g. Majd")}
              />
            </div>

            <div className="col-span-12 sm:col-span-3">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {t("dashboard.manageStudents.fields.lastName", "Last name")}
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full max-w-[220px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
                placeholder={t("dashboard.manageStudents.placeholders.lastName", "e.g. Awad")}
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {t("dashboard.manageStudents.fields.studentId", "Student ID")}
              </label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 w-full max-w-[260px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
                placeholder={t("dashboard.manageStudents.placeholders.studentId", "123456789")}
              />
            </div>

            <div className="col-span-12 sm:col-span-6 flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full max-w-[220px] rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {busy
                  ? t("dashboard.manageStudents.actions.working", "Working...")
                  : t("dashboard.manageStudents.actions.add", "Add student")}
              </button>
            </div>

            <div className="col-span-12">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t(
                  "dashboard.manageStudents.hint.add",
                  "Creates the student in DB (if missing) and seats them in the selected room if space is available."
                )}
              </div>
            </div>
          </div>
        </form>

        {/* ===== Delete ===== */}
        <form
          onSubmit={handleDelete}
          className="col-span-12 lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3"
        >
          <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {t("dashboard.manageStudents.actions.delete", "Remove")}
          </div>

          <div className="mt-3 grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12 sm:col-span-8">
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {t(
                  "dashboard.manageStudents.fields.deleteStudentId",
                  "Remove from class (Student ID)"
                )}
              </label>
              <input
                value={delStudentId}
                onChange={(e) => setDelStudentId(e.target.value)}
                className="mt-1 w-full max-w-[320px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
                placeholder={t("dashboard.manageStudents.placeholders.studentId", "123456789")}
              />
              <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t(
                  "dashboard.manageStudents.hint.delete",
                  "Deletes from the class only (keeps the student in the database)"
                )}
              </div>
            </div>

            <div className="col-span-12 sm:col-span-4 flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="w-full max-w-[220px] rounded-xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
              >
                {busy
                  ? t("dashboard.manageStudents.actions.working", "Working...")
                  : t("dashboard.manageStudents.actions.delete", "Remove")}
              </button>
            </div>

            <div className="col-span-12">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t(
                  "dashboard.manageStudents.hint.delete2",
                  "The student remains in the DB for reports, incidents, and history."
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
