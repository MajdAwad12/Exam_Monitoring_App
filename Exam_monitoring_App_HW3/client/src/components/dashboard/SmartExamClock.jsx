// client/src/components/dashboard/SmartExamClock.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function toMs(v) {
  // Accept: number (ms), Date, ISO string
  if (v == null) return null;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }

  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }

  const d = new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function fmtTime(ms) {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function fmtHMS(totalMs) {
  const ms = Math.max(0, Number(totalMs) || 0);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

export default function SmartExamClock({ exam, nowMs }) {
  const { t } = useTranslation();

  const derived = useMemo(() => {
    const startMs = toMs(exam?.startAt);
    const baseEndMs = toMs(exam?.endAt);

    // If invalid dates -> do not render clock (avoid misleading 0%/100%)
    if (!Number.isFinite(startMs) || !Number.isFinite(baseEndMs)) {
      return { ready: false };
    }

    // nowMs can be number OR Date OR undefined
    const safeNowRaw = toMs(nowMs);

    // If nowMs is missing/invalid, anchor progress to start => 0%
    const safeNow = Number.isFinite(safeNowRaw) ? safeNowRaw : startMs;

    // ---- optional extra time (kept identical behavior) ----
    const minutesPerHourRaw = Number(exam?.extraTimeMinutesPerHour);
    const minutesPerHour =
      Number.isFinite(minutesPerHourRaw) && minutesPerHourRaw > 0 && minutesPerHourRaw <= 60
        ? minutesPerHourRaw
        : 15;

    const durationHoursRaw = (baseEndMs - startMs) / (60 * 60 * 1000);
    const durationHours = Math.max(1, Math.ceil(durationHoursRaw));

    const isExtended = Boolean(exam?.extraTimeActive);
    const extraMinutes = isExtended ? durationHours * minutesPerHour : 0;

    const extendedByMs = extraMinutes * 60 * 1000;
    const endMs = baseEndMs + extendedByMs;

    const totalMs = Math.max(1, endMs - startMs);

    // ✅ Progress based only on time difference:
    //    progress = (now - start) / (end - start) clamped to [0, 1]
    //    So at start => 0%, at end => 100%.
    const clampedNow = Math.min(endMs, Math.max(startMs, safeNow));
    const remainingMs = Math.max(0, endMs - clampedNow);
    const progress = clamp01((clampedNow - startMs) / totalMs);

    return {
      ready: true,
      startMs,
      baseEndMs,
      endMs,
      remainingMs,
      progress,
      isExtended,
      extraMinutes,
      nowMs: clampedNow,
    };
  }, [exam, nowMs]);

  if (!derived.ready) return null;

  // SVG ring (stable across browsers): fixed dasharray + dashoffset
  const ring = 2 * Math.PI * 44;
  const dashOffset = ring * (1 - derived.progress);

  const baseEnded = derived.nowMs >= derived.baseEndMs;
  const inExtension = derived.isExtended && baseEnded && derived.nowMs < derived.endMs;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
            {t("dashboard.clock.title", "Exam clock")}
          </div>

          <div className="mt-1 text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {fmtHMS(derived.remainingMs)}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">
            <span className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              {t("dashboard.clock.start", "Start")}:{" "}
              <span className="text-slate-900 dark:text-slate-100">{fmtTime(derived.startMs)}</span>
            </span>

            <span className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              {t("dashboard.clock.end", "End")}:{" "}
              <span className="text-slate-900 dark:text-slate-100">{fmtTime(derived.baseEndMs)}</span>
            </span>

            {derived.isExtended ? (
              <span className="px-3 py-1.5 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 font-bold">
                {t("dashboard.clock.extendedEnd", "Extended by")}:{" "}
                {Math.round(derived.extraMinutes)} {t("common.minutes", "minutes")}
              </span>
            ) : null}

            {inExtension ? (
              <span className="px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                {t("dashboard.clock.inExtension", "Extra time active")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0">
          <div className="relative w-[120px] h-[120px]">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="44"
                strokeWidth="10"
                className="stroke-slate-200 dark:stroke-slate-800"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                strokeWidth="10"
                className="stroke-sky-600 dark:stroke-sky-400"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ring}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 50 50)"
              />
            </svg>

            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                  {t("dashboard.clock.progress", "Progress")}
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {Math.round(derived.progress * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
