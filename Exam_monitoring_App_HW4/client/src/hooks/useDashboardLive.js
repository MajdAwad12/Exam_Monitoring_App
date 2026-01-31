// client/src/hooks/useDashboardLive.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDashboardSnapshotLite, getDashboardSnapshot } from "../services/dashboard.service";

function normalizeRoomId(v) {
  return String(v || "").trim();
}

// ---- tiny in-memory cache (makes sidebar navigation feel instant) ----
let __dashCache = { raw: null, at: 0, examId: null, lite: null };
const DASH_CACHE_TTL_MS = 30_000;

export function useDashboardLive({ examId = null, roomId, pollMs = 60000, lite = false } = {}) {
  const cacheOk =
    __dashCache.raw &&
    Date.now() - (__dashCache.at || 0) < DASH_CACHE_TTL_MS &&
    Boolean(__dashCache.lite) === Boolean(lite) &&
    String(__dashCache.examId || "") === String(examId || "");

  const [raw, setRaw] = useState(cacheOk ? __dashCache.raw : null);
  const [loading, setLoading] = useState(!cacheOk);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // keep latest params without restarting everything
  const examIdRef = useRef(examId);
  useEffect(() => {
    examIdRef.current = examId;
  }, [examId]);

  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const pollMsRef = useRef(pollMs);
  useEffect(() => {
    pollMsRef.current = pollMs;
  }, [pollMs]);

  // WS connection indicator (UI only)
  const [wsConnected, setWsConnected] = useState(false);

  // internal refs
  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const timerRef = useRef(null);
  const backoffRef = useRef(1);
  const MAX_BACKOFF = 6;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const shouldPause = useCallback(() => {
    return typeof document !== "undefined" && document.hidden;
  }, []);

  const fetchOnce = useCallback(async ({ force = false } = {}) => {
    if (!aliveRef.current) return;
    if (inFlightRef.current) return;

    if (!force && shouldPause()) return;

    inFlightRef.current = true;
    setRefreshing((v) => v || Boolean(raw));
    setError("");

    try {
      const eid = examIdRef.current;
      const data = lite ? await getDashboardSnapshotLite({ examId: eid }) : await getDashboardSnapshot({ examId: eid });

      if (!aliveRef.current) return;

      __dashCache = { raw: data, at: Date.now(), examId: String(eid || ""), lite: Boolean(lite) };

      setRaw(data);
      setLoading(false);
      setRefreshing(false);
      backoffRef.current = 1;
    } catch (e) {
      if (!aliveRef.current) return;
      const msg = e?.message || String(e);
      setError(msg);
      setLoading(false);
      setRefreshing(false);
      backoffRef.current = Math.min(MAX_BACKOFF, backoffRef.current + 1);
    } finally {
      inFlightRef.current = false;
    }
  }, [lite, shouldPause, raw]);

  const scheduleNext = useCallback((ms) => {
    clearTimer();
    const delay = Math.max(800, Number(ms || pollMsRef.current || 0));
    timerRef.current = setTimeout(() => {
      fetchOnce({ force: false });
      scheduleNext(pollMsRef.current * backoffRef.current);
    }, delay);
  }, [clearTimer, fetchOnce]);

  // mount/unmount
  useEffect(() => {
    aliveRef.current = true;
    fetchOnce({ force: true });
    scheduleNext(pollMsRef.current);

    return () => {
      aliveRef.current = false;
      clearTimer();
    };
  }, [fetchOnce, scheduleNext, clearTimer]);

  // WebSocket: refresh on server pushes (EXAM_UPDATED/STARTED/ENDED)
  useEffect(() => {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return;

    let ws;
    let alive = true;
    let retryTimer = null;
    let debounceTimer = null;

    const connect = () => {
      if (!alive) return;

      try {
        const proto = window.location.protocol === "https:" ? "wss" : "ws";
        const url = `${proto}://${window.location.host}/ws`;
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (!alive) return;
          setWsConnected(true);
        };

        ws.onclose = () => {
          if (!alive) return;
          setWsConnected(false);
          retryTimer = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          try {
            ws?.close();
          } catch {}
        };

        ws.onmessage = (ev) => {
          if (!alive) return;

          let msg;
          try {
            msg = JSON.parse(ev.data);
          } catch {
            return;
          }

          const type = String(msg?.type || "");
          const msgExamId = String(msg?.examId || "");

          const wanted = String(examIdRef.current || "");
          if (wanted && msgExamId && wanted !== msgExamId) return;

          if (type !== "EXAM_UPDATED" && type !== "EXAM_STARTED" && type !== "EXAM_ENDED") return;

          // debounce refresh storms
          if (debounceTimer) return;
          debounceTimer = setTimeout(() => {
            debounceTimer = null;
            fetchOnce({ force: true });
            scheduleNext(pollMsRef.current);
          }, 250);
        };
      } catch {
        retryTimer = setTimeout(connect, 2500);
      }
    };

    connect();

    return () => {
      alive = false;
      setWsConnected(false);
      if (retryTimer) clearTimeout(retryTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      try {
        ws?.close();
      } catch {}
    };
  }, [fetchOnce, scheduleNext]);

  const derived = useMemo(() => {
    const me = raw?.me || null;
    const exam = raw?.exam || null;

    const rooms = (exam?.classrooms || exam?.rooms || [])
      .map((r) => (typeof r === "string" ? { id: r, name: r } : r))
      .map((r) => ({ id: normalizeRoomId(r?.id || r?.name || r), name: normalizeRoomId(r?.name || r?.id || r) }))
      .filter((r) => Boolean(r.id));

    const roomIds = rooms.map((r) => r.id);

    const assignedRoomId = normalizeRoomId(me?.assignedRoomId);
    const requestedRoomId = normalizeRoomId(roomIdRef.current);

    let effectiveRoomId = "";
    if (requestedRoomId && roomIds.includes(requestedRoomId)) effectiveRoomId = requestedRoomId;
    else if (assignedRoomId && roomIds.includes(assignedRoomId)) effectiveRoomId = assignedRoomId;
    else effectiveRoomId = roomIds[0] || "";

    const activeRoom = rooms.find((r) => normalizeRoomId(r.id) === effectiveRoomId) || null;

    const attendance = raw?.attendance || exam?.attendance || [];

    return {
      me,
      exam,
      rooms,
      activeRoom,
      attendance,
      transfers: raw?.transfers || [],
      stats: raw?.stats || {},
      alerts: raw?.alerts || [],
      inbox: raw?.inbox || { unread: 0, recent: [] },
      events: raw?.events || [],
    };
  }, [raw]);

  const refetch = useCallback(async () => {
    backoffRef.current = 1;
    await fetchOnce({ force: true });
    scheduleNext(pollMsRef.current);
  }, [fetchOnce, scheduleNext]);

  return { ...derived, raw, loading, refreshing, error, refetch, wsConnected };
}
