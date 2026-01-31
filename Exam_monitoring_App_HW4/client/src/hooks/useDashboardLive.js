// client/src/hooks/useDashboardLive.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDashboardSnapshotLite, getDashboardSnapshot } from "../services/dashboard.service";

function normalizeRoomId(v) {
  return String(v || "").trim();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Live dashboard data (polling-based, but can be set to pollMs=0 when WS is used)
 * @param {object} params
 * @param {string|null} params.examId - (Admin only) selected running exam id
 * @param {string|null} params.roomId - (Client-side only) selected room for filtering UI
 * @param {number} params.pollMs
 */
export function useDashboardLive({ examId = null, roomId, pollMs = 60000, lite = true } = {}) {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // keep latest examId without restarting polling
  const examIdRef = useRef(examId);
  useEffect(() => {
    examIdRef.current = examId;
  }, [examId]);

  // keep latest roomId without restarting polling
  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // keep latest pollMs without restarting polling
  const pollMsRef = useRef(pollMs);
  useEffect(() => {
    pollMsRef.current = pollMs;
  }, [pollMs]);

  // ---- WS awareness (reduces loading + avoids extra polling) ----
  const [wsConnected, setWsConnected] = useState(false);
  const lastWsAtRef = useRef(0);

  useEffect(() => {
    const onStatus = (e) => {
      const st = String(e?.detail?.status || "").toLowerCase();
      if (st === "connected") setWsConnected(true);
      if (st === "disconnected") setWsConnected(false);
    };

    const onWs = (e) => {
      // any WS message keeps the connection "fresh"
      lastWsAtRef.current = Date.now();
      const msg = e?.detail || {};
      const t = String(msg?.type || "").toUpperCase();

      // These are the types your server broadcasts today (exams.controller.js)
      if (t === "EXAM_UPDATED" || t === "EXAM_STARTED" || t === "EXAM_ENDED") {
        // Debounced force-refresh (prevents request storms)
        scheduleWsRefresh();
      }
    };

    window.addEventListener("ws:status", onStatus);
    window.addEventListener("ws:event", onWs);

    return () => {
      window.removeEventListener("ws:status", onStatus);
      window.removeEventListener("ws:event", onWs);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wsRefreshTimerRef = useRef(null);
  const scheduleWsRefresh = useCallback(() => {
    // If polling is disabled (pollMs<=0), WS refresh is our main mechanism
    clearTimeout(wsRefreshTimerRef.current);
    wsRefreshTimerRef.current = setTimeout(() => {
      backoffRef.current = 1;
      fetchOnce({ force: true });
    }, 250);
  }, [fetchOnce]);


  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  const pendingForceRef = useRef(false);
  const reqIdRef = useRef(0);
  const timerRef = useRef(null);

  // backoff on errors (prevents spam + improves UX)
  const backoffRef = useRef(1);
  const MAX_BACKOFF = 6;

  const tickRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const shouldPause = useCallback(() => {
    return typeof document !== "undefined" && document.hidden;
  }, []);

  const scheduleNext = useCallback(
    (multiplier = 1) => {
      clearTimer();

      const base = Number(pollMsRef.current);

      // If WS is connected and recently active, avoid redundant polling.
      const WS_FRESH_MS = 20000;
      if (wsConnected && Date.now() - (lastWsAtRef.current || 0) < WS_FRESH_MS) return;

      // Polling disabled if pollMs <= 0 (or invalid)
      if (!Number.isFinite(base) || base <= 0) return;

      const wait = clamp(base * multiplier, 1500, 60000);

      timerRef.current = setTimeout(() => {
        tickRef.current?.();
      }, wait);
    },
    [clearTimer, wsConnected]
  );

  const fetchOnce = useCallback(
    async (opts = { force: false }) => {
      if (!aliveRef.current) return;
      if (shouldPause() && !opts.force) return;

      if (inFlightRef.current) {
        if (opts.force) pendingForceRef.current = true;
        return;
      }

      inFlightRef.current = true;
      const myReqId = ++reqIdRef.current;

      try {
        setError("");

        const snap = await (lite ? getDashboardSnapshotLite : getDashboardSnapshot)({ examId: examIdRef.current });

        if (!aliveRef.current) return;
        if (myReqId !== reqIdRef.current) return;

        setRaw(snap);
        setLoading(false);

        backoffRef.current = 1;
      } catch (e) {
        if (!aliveRef.current) return;
        if (myReqId !== reqIdRef.current) return;

        setError(e?.message || "Failed to load dashboard");
        setLoading(false);

        backoffRef.current = clamp(backoffRef.current * 2, 1, MAX_BACKOFF);
      } finally {
        inFlightRef.current = false;
        if (pendingForceRef.current) {
          pendingForceRef.current = false;
          setTimeout(() => fetchOnce({ force: true }), 0);
        }
      }
    },
    [shouldPause]
  );

  // restart the "session" when examId changes (avoid showing old exam briefly)
  useEffect(() => {
    setLoading(true);
    setRaw(null);
    setError("");
    reqIdRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    reqIdRef.current += 1;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || !aliveRef.current) return;

      if (shouldPause()) {
        scheduleNext(1);
        return;
      }

      await fetchOnce();
      if (cancelled || !aliveRef.current) return;

      scheduleNext(backoffRef.current);
    };

    tickRef.current = tick;

    // initial
    tick();

    const onVis = () => {
      if (!aliveRef.current) return;
      if (!document.hidden) {
        backoffRef.current = 1;
        fetchOnce({ force: true });
        scheduleNext(1);
      }
    };

    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      aliveRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      clearTimer();
    };
  }, [fetchOnce, clearTimer, scheduleNext, shouldPause]);

  const derived = useMemo(() => {
    const me = raw?.me || null;
    const exam = raw?.exam || null;

    const classrooms = exam?.classrooms || exam?.rooms || [];
    const rooms = (Array.isArray(classrooms) ? classrooms : [])
      .map((c) => ({
        id: normalizeRoomId(c?.id || c?.roomId || c?.name || c),
        name: normalizeRoomId(c?.name || c?.id || c?.roomId || c),
        rows: Number(c?.rows || 0),
        cols: Number(c?.cols || 0),
        assignedSupervisorId: c?.assignedSupervisorId || null,
        assignedSupervisorName: String(c?.assignedSupervisorName || ""),
      }))
      .filter((r) => r.id);

    const firstRoomId = normalizeRoomId(rooms?.[0]?.id || rooms?.[0]?.name || "");
    const requestedRoomId = normalizeRoomId(roomIdRef.current);

    const effectiveRoomId =
      requestedRoomId || normalizeRoomId(me?.assignedRoomId) || firstRoomId || "";

    const activeRoom = effectiveRoomId
      ? rooms.find((r) => normalizeRoomId(r.id) === normalizeRoomId(effectiveRoomId)) || null
      : rooms[0] || null;

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
    scheduleNext(1);
  }, [fetchOnce, scheduleNext]);

  return { ...derived, raw, loading, error, refetch, wsConnected };
}
