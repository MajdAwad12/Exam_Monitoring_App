// ===== file: client/src/components/classroom/SeatCard.jsx =====
import { msToMMSS, safeId, safeName, statusMeta, normalizeStatus } from "./utils";

function transferMeta(mode = "pending") {
  if (mode === "moving") {
    return {
      label: "Moving",
      seat: "bg-purple-500",
      card: "bg-purple-50 border-purple-200 dark:bg-purple-950/25 dark:border-purple-900/60",
    };
  }
  return {
    label: "Pending transfer",
    seat: "bg-purple-500",
    card: "bg-purple-50 border-purple-200 dark:bg-purple-950/25 dark:border-purple-900/60",
  };
}

function seatLabel(seat) {
  const s = String(seat || "").trim();
  if (!s) return "—";
  if (s.toUpperCase() === "AUTO") return "AUTO";
  return s;
}

function ChairIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M18 10c0-2.2 1.8-4 4-4h20c2.2 0 4 1.8 4 4v22H18V10z" fill="currentColor" opacity="0.25" />
      <path d="M14 32h36c2.2 0 4 1.8 4 4v10H10V36c0-2.2 1.8-4 4-4z" fill="currentColor" opacity="0.35" />
      <path d="M14 46h6v12h-6V46zm30 0h6v12h-6V46z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export default function SeatCard({ a, elapsedMs = 0, toiletCount = 0, onClick }) {
  const rawStatus = String(a?.status || "").toLowerCase();

  const isMoving = rawStatus === "moving";
  const isPending = Boolean(a?.transferPending);

  // purple if pending OR moving
  const meta = isMoving ? transferMeta("moving") : isPending ? transferMeta("pending") : statusMeta(a?.status);

  const statusUI = normalizeStatus(a?.status);

  const name = safeName(a) || "Student";
  const id = safeId(a);

  const showTimer = rawStatus === "temp_out";
  const seatTxt = seatLabel(a?.seat);

  const overToiletLimit = Number(toiletCount) >= 3;
  const overToiletLong = rawStatus === "temp_out" && Number(elapsedMs || 0) >= 5 * 60 * 1000;

  const extraMin = Number(a?.extraMinutes || 0) || 0;
  const showExtra = extraMin > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name}${id ? ` (${id})` : ""} • Seat: ${seatTxt}`}
      className={[
        "w-full h-full rounded-2xl border shadow-sm text-left px-3 py-2",
        "transition hover:shadow-md active:scale-[0.99]",
        // ✅ IMPORTANT: allow the bubble to go OUTSIDE the card
        // (overflow-hidden was clipping it)
        "relative",
        meta.card,
      ].join(" ")}
    >
      <div className="h-full flex flex-col min-h-0">
        {/* Top */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold text-slate-900 dark:text-slate-50 drop-shadow-[0_1px_0_rgba(0,0,0,0.25)] truncate">
              {name}
            </div>
            <div className="text-[10px] font-bold text-slate-700 dark:text-slate-200/90 truncate">
              {id ? `ID: ${id}` : "—"}
            </div>
          </div>

          <span className={`w-3 h-3 rounded-full ${meta.seat}`} />

          {/* ✅ Bubble OUTSIDE top-right (tail touches the corner) */}
          {showExtra ? (
            <div
              className={[
                "absolute -top-6 -right-7", // 👈 top-right always (even in RTL)
                "z-30 pointer-events-none",
              ].join(" ")}
              title={`Extra time: +${extraMin} minutes`}
            >
              <div className="relative bg-sky-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-[18px] shadow-lg">
                +{extraMin}m

                {/* tail (touches the card corner) */}
                <div
                  className={[
                    "absolute top-full right-6", // 👈 tail aims to the top-right corner area
                    "w-0 h-0",
                    "border-l-[7px] border-r-[7px] border-t-[9px]",
                    "border-l-transparent border-r-transparent border-t-sky-600",
                    "drop-shadow-[0_2px_0_rgba(0,0,0,0.08)]",
                  ].join(" ")}
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* Middle */}
        <div className="mt-2 flex items-center justify-between gap-2 min-h-0">
          <div className="relative -mt-3 w-[56px] h-[44px] shrink-0">
            <ChairIcon className="w-full h-full text-slate-800 dark:text-slate-100" />
            <div className="absolute inset-0 grid place-items-center">
              <span
                className={[
                  "px-2 py-0.5 rounded-lg text-[10px] font-extrabold",
                  "border shadow-sm",
                  "bg-white/90 text-slate-900 border-slate-200",
                  // ✅ Dark: badge כהה וברור עם טקסט לבן חד
                  "dark:bg-slate-900/80 dark:text-white dark:border-slate-600",
                  // ✅ מוסיף קונטרסט על רקעים בהירים/סגולים
                  "dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
                ].join(" ")}
              >
                {seatTxt}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 text-right flex flex-col">
            <div className="text-[10px] font-extrabold text-slate-700 dark:text-slate-100 leading-tight break-words">
              {meta.label}
            </div>

            <div className="mt-auto pt-1 flex items-center justify-end gap-2 min-w-0">
              {Number(toiletCount) > 0 ? (
                <div className="flex items-center gap-1 text-[10px] font-extrabold whitespace-nowrap">
                  <span className="text-amber-900">🚻 {Number(toiletCount)}</span>
                  {overToiletLimit || overToiletLong ? (
                    <span className="text-rose-600" title="Too many toilet breaks">
                      ⚠️
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showTimer ? (
                <div className="text-[10px] font-extrabold text-amber-900 whitespace-nowrap">
                  ⏱ {msToMMSS(elapsedMs)}
                </div>
              ) : isPending ? (
                <div className="text-[10px] font-extrabold text-purple-900 whitespace-nowrap">pending</div>
              ) : isMoving ? (
                <div className="text-[10px] font-extrabold text-purple-900 whitespace-nowrap">moving</div>
              ) : statusUI === "waiting_transfer" ? (
                <div className="text-[10px] font-extrabold text-purple-900 whitespace-nowrap">waiting</div>
              ) : (
                <span className="text-[10px] opacity-0 select-none whitespace-nowrap">.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
