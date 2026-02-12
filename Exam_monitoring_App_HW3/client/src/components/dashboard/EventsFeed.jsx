// client/src/components/dashboard/EventsFeed.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { markCallLecturerSeen } from "../../services/incidents.service.js";

function fmtTime(d) {
  const dt = new Date(d || Date.now());
  if (Number.isNaN(dt.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(dt);
}

function sevMeta(sev) {
  const s = String(sev || "low").toLowerCase();
  if (s === "high" || s === "critical") {
  return {
    pill: "bg-rose-600 text-white",
    row: "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30",
    dot: "bg-rose-500",
  };
  }
  if (s === "medium") {
  return {
    pill: "bg-amber-500 text-white",
    row: "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/25",
    dot: "bg-amber-500",
  };
  }
  return { pill: "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100", row: "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40", dot: "bg-slate-400" };
}

function titleOf(item, t) {
  const type = String(item?.type || item?.kind || item?.eventType || "EVENT").toUpperCase();

  if (type === "EXAM_30_MIN_LEFT") return t("dashboard.events.titles.EXAM_30_MIN_LEFT");
  if (type === "EXAM_15_MIN_LEFT") return t("dashboard.events.titles.EXAM_15_MIN_LEFT");
  if (type === "EXAM_5_MIN_LEFT") return t("dashboard.events.titles.EXAM_5_MIN_LEFT");

  if (type.includes("TOILET_LONG")) return t("dashboard.events.titles.TOILET_TOO_LONG");
  if (type.includes("TOO_MANY_TOILET") || type.includes("TOILET_LIMIT")) return t("dashboard.events.titles.TOILET_LIMIT_REACHED");
  if (type.includes("CALL_LECTURER")) return t("dashboard.events.titles.CALL_LECTURER");
  if (type.includes("VIOLATION")) return t("dashboard.events.titles.VIOLATION");
  if (type.includes("CHEAT")) return t("dashboard.events.titles.CHEATING_NOTE");
  if (type.includes("TRANSFER")) return t("dashboard.events.titles.TRANSFER");
  if (type.includes("ALERT")) return t("dashboard.events.titles.ALERT");
  if (type.includes("INCIDENT")) return t("dashboard.events.titles.INCIDENT");

  return type.replaceAll("_", " ");
}

function pickText(item) {
  const candidates = [
    item?.text,
    item?.note,
    item?.message,
    item?.content,
    item?.description,
    item?.title,
    item?.details?.note,
    item?.details?.text,
    item?.details?.message,
    item?.payload?.note,
    item?.payload?.text,
    item?.payload?.message,
    item?.data?.note,
    item?.data?.text,
    item?.data?.message,
    item?.meta?.note,
    item?.meta?.text,
    item?.meta?.message,
  ];

  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) return s;
  }
  return "";
}

function normalize(item, source) {
  const at = item?.at || item?.createdAt || item?.time || item?.timestamp || new Date().toISOString();
  const severity = item?.severity || item?.level || (source === "alert" ? "medium" : "low");
  const roomId = item?.roomId || item?.classroom || item?.room || "";
  const seat = item?.seat || item?.seatId || "";
  const studentCode = item?.studentCode || item?.studentNumber || "";
  const name = item?.name || item?.student?.name || item?.studentName || "";

  const text = pickText(item);
  return { source, at, severity, roomId, seat, text, studentCode, name, raw: item };
}

// 🔥 helper: build a stable "signature" for newest item
function sigOf(it) {
  if (!it) return "";
  const type = String(it?.raw?.type || it?.raw?.kind || it?.raw?.eventType || "");
  return [
    it.source,
    String(it.at),
    type,
    String(it.severity || ""),
    String(it.roomId || ""),
    String(it.seat || ""),
    String(it.studentCode || ""),
    String(it.name || ""),
    String(it.text || ""),
  ].join("|");
}

/* =========================
   ✅ Toast filtering logic
   - Only notify parent on important, NEW, RECENT events
========================= */
function shouldNotifyToast(it) {
  if (!it) return false;

  const sev = String(it.severity || "low").toLowerCase();
  const type = String(it.raw?.type || it.raw?.kind || it.raw?.eventType || "").toUpperCase();
  const src = String(it.source || "").toLowerCase();

  // ✅ Alerts always allowed
  if (src === "alert") return true;

  // ✅ Explicit important types
  if (
  type.includes("INCIDENT") ||
  type.includes("ALERT") ||
  type.includes("TRANSFER") ||
  type.includes("STUDENT_ADDED") ||
  type.includes("STUDENT_REMOVED") ||
  type.includes("ADD_STUDENT") ||
  type.includes("DELETE_STUDENT") ||
  type.includes("ADD_DELETE_STUDENT")
) return true;


  // ✅ Toilet limit (3+): include 3 and above
  if (type.includes("TOO_MANY_TOILET") || type.includes("TOILET_LIMIT")) return true;

  // ✅ Severity medium+ (optional safety net)
  if (sev === "medium" || sev === "high" || sev === "critical") return true;

  // ❌ Everything else (like normal toilet exit) should not trigger toast
  return false;
}

function isRecent(at, ms = 12000) {
  const t = new Date(at || 0).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= ms;
}

export default function EventsFeed({
  examId,
  meRole,
  events = [],
  alerts = [],
  activeRoomId = "",
  canFilterRoom = true,
  onNewEvent,
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [onlyThisRoom, setOnlyThisRoom] = useState(false);
  // Used by the "Seen" button (lecturer CALL_LECTURER events)
  const [seenBusyId, setSeenBusyId] = useState("");

  // scroll container
  const listRef = useRef(null);
  const scrollToTop = () => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
  };
  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };


  const merged = useMemo(() => {
    const a = (Array.isArray(alerts) ? alerts : []).map((x) => normalize(x, "alert"));
    const e = (Array.isArray(events) ? events : []).map((x) => normalize(x, "event"));
    const all = [...a, ...e];
    all.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
    return all.slice(0, 500);
  }, [alerts, events]);

  // ✅ Detect new event (newest item changed)
  const lastSigRef = useRef("");
  const didMountRef = useRef(false);

  const storageKey = useMemo(() => `EVENTS_FEED_LASTSIG::${String(activeRoomId || "all")}`, [activeRoomId]);

  useEffect(() => {
    const newest = merged[0];
    const sig = sigOf(newest);
    if (!sig) return;

    if (!didMountRef.current) {
      // First render: store but don't notify
      didMountRef.current = true;
      const stored = sessionStorage.getItem(storageKey);
      lastSigRef.current = stored || sig;
      sessionStorage.setItem(storageKey, lastSigRef.current);
      return;
    }

    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      sessionStorage.setItem(storageKey, sig);

      // ✅ Notify ONLY if important + recent
      if (typeof onNewEvent === "function" && shouldNotifyToast(newest) && isRecent(newest.at, 12000)) {
        onNewEvent(newest);
      }
    }
  }, [merged, onNewEvent, storageKey]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return merged.filter((it) => {
      if (onlyThisRoom && activeRoomId) {
        const rid = String(it.roomId || "");
        // keep global items visible even when filtering a room
        if (rid && rid !== String(activeRoomId)) return false;
      }
      if (!query) return true;

      const head = titleOf(it.raw, t);
      const hay = `${head} ${it.text} ${it.roomId} ${it.seat} ${it.studentCode} ${it.name}`.toLowerCase();
      return hay.includes(query);
    });
  }, [merged, q, onlyThisRoom, activeRoomId]);

  
  async function handleSeen(it) {
    try {
      const role = String(meRole || "").toLowerCase();
      if (role !== "lecturer") return;
      const t = String(it?.raw?.type || "").toUpperCase();
      if (t !== "CALL_LECTURER") return;

      const eventId = String(it?.raw?.eventId || "").trim();
      if (!examId || !eventId) return;

      setSeenBusyId(eventId);
      await markCallLecturerSeen(examId, eventId);
      // UI will update via polling / WS; keep a tiny optimistic mark
      it.raw.seenByLecturer = true;
      it.raw.seenText = it.raw.seenText || t("dashboard.events.seenDefaultText")
      it.raw.severity = it.raw.severity || "high";
    } catch (e) {
      console.error(e);
      alert(e?.message || String(e));
    } finally {
      setSeenBusyId("");
    }
  }

return (
    <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("dashboard.page.liveMonitoringLabel")}</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{t("dashboard.events.title")}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("dashboard.events.subtitle")}</div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">
            <span>{t("dashboard.events.showing", { count: filtered.length })}</span>
            <button type="button" onClick={scrollToTop} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40">{t("dashboard.events.top")}</button>
            <button type="button" onClick={scrollToBottom} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40">{t("dashboard.events.bottom")}</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("dashboard.events.searchPlaceholder")}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-800
              bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              px-3 py-2 text-sm outline-none
              focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-500/30"
                        />

          {canFilterRoom ? (
<button
            type="button"
            onClick={() => setOnlyThisRoom((v) => !v)}
            disabled={!activeRoomId}
            className={`rounded-2xl border px-3 py-2 text-sm font-extrabold ${
              onlyThisRoom
                ? "bg-sky-600 border-sky-600 text-white"
                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40"
            } disabled:opacity-50`}
            title={activeRoomId ? t("dashboard.events.filterRoomTitle", { room: activeRoomId }) : t("dashboard.events.noActiveRoom")}
          >
            {onlyThisRoom ? t("dashboard.events.filteredRoom", { room: activeRoomId }) : t("dashboard.events.filterThisRoom")}
          </button>
          ) : null}
        </div>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-slate-900/40">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm text-slate-600 dark:text-slate-300">
            {t("dashboard.events.empty")}
          </div>
        ) : (
          <div ref={listRef} className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map((it, idx) => {
              const sev = sevMeta(it.severity);
              const head = titleOf(it.raw, t);

              const shownText = it.text?.trim()
                ? it.text
                : it.source === "alert"
                  ? t("dashboard.events.alertNoDetails")
                  : "—";

              return (
                <div key={`${idx}-${String(it.at)}`} className={`rounded-3xl border p-4 shadow-sm ${sev.row}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-2.5 h-2.5 rounded-full ${sev.dot}`} />
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{head}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${sev.pill}`}>
                          {String(it.severity || "low").toUpperCase()}
                        </span>

                        {it.roomId ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-extrabold">
                            {t("dashboard.common.roomLabel")} {it.roomId}
                          </span>
                        ) : null}
                        {it.seat ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-extrabold">
                            {t("dashboard.common.seatLabel")} {it.seat}
                          </span>
                        ) : null}
                        {it.studentCode ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-extrabold">
                            {t("dashboard.common.idLabel")} {it.studentCode}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100 break-words">{shownText}</div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{fmtTime(it.at)}</div>
                      
                      <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase font-extrabold">{it.source}</div>

                      {(() => {
                        const eid = String(it.raw?.eventId || "").trim();
                        const canShow =
                          String(meRole || "").toLowerCase() === "lecturer" &&
                          String(it.raw?.type || "").toUpperCase() === "CALL_LECTURER" &&
                          !it.raw?.seenByLecturer &&
                          !!eid;
                        if (!canShow) return null;
                        const busy = seenBusyId === eid;
                        return (
                          <button
                            type="button"
                            onClick={() => handleSeen(it)}
                            disabled={busy}
                            className={[
                              "mt-2 w-full rounded-xl px-3 py-1.5 text-xs font-extrabold",
                              "bg-sky-700 text-white hover:bg-sky-800",
                              "disabled:opacity-60 disabled:cursor-not-allowed",
                            ].join(" ")}
                          >
                            {busy ? t("dashboard.events.saving") : t("dashboard.events.seen")}
                          </button>
                        );
                      })()}

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}