// client/src/hooks/useDashboardLive.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDashboardSnapshotLite, getDashboardSnapshot } from "../services/dashboard.service";

function normalizeRoomId(v) {
  return String(v || "").trim();
}

// ---- tiny in-memory cache (makes sidebar navigation feel instant) ----
let __dashCache = { raw: null, at: 0, examId: null, lite: null };
const DASH_CACHE_TTL_MS = 30_000;

/**
 * Live dashboard data (polling ONLY)
 * @param {object} params
 * @param {string|null} params.examId - (Admin only) selected running exam id
 * @param {string|null} params.roomId - (Client-side only) selected room for filtering UI
 * @param {number} params.pollMs - default 10s (per requirements)
 * @param {boolean} params.lite - use lite snapshot for speed
 */
export function useDashboardLive({ examId = null, roomId, pollMs = 10000, lite = true } = {}) {
  const cacheOk =
    __dashCache.raw &&
    Date.now() - (__dashCache.at || 0) < DASH_CACHE_TTL_MS &&
    Boolean(__dashCache.lite) === Boolean(lite) &&
    String(__dashCache.examId || "") === String(examId || "");

  const [raw, setRaw] = useState(cacheOk ? __dashCache.raw : null);
  const [loading, setLoading] = useState(!cacheOk);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);

  const examIdRef = useRef(examId);
  useEffect(() => {
    examIdRef.current = examId;
  }, [examId]);

  const pollMsRef = useRef(pollMs);
  useEffect(() => {
    pollMsRef.current = pollMs;
  }, [pollMs]);

  const fetchOnce = useCallback(async ({ force } = { force: false }) => {
    if (!aliveRef.current) return;

    // avoid noisy polling when tab is hidden, unless forced
    if (typeof document !== "undefined" && document.hidden && !force) return;

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      setError("");

      const snap = await (lite ? getDashboardSnapshotLite : getDashboardSnapshot)({
        examId: examIdRef.current,
      });

      if (!aliveRef.current) return;

      setRaw(snap);
      __dashCache = { raw: snap, at: Date.now(), examId: examIdRef.current || null, lite };
      setLoading(false);
      setRefreshing(false);
    } catch (e) {
      if (!aliveRef.current) return;

      setError(e?.message || "Failed to load dashboard");
      setLoading(false);
      setRefreshing(false);
    } finally {
      inFlightRef.current = false;
    }
  }, [lite]);

  // initial load + polling
  useEffect(() => {
    aliveRef.current = true;

    // 1) immediate fetch
    fetchOnce({ force: true });

    // 2) poll
    const id = setInterval(() => {
      fetchOnce();
    }, Math.max(2000, Number(pollMsRef.current) || 10000));

    // 3) when tab becomes visible => refresh immediately
    const onVis = () => {
      if (!document.hidden) fetchOnce({ force: true });
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      aliveRef.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchOnce]);

  // if admin switches exam => refresh (but keep UI responsive)
  useEffect(() => {
    if (!aliveRef.current) return;

    setError("");
    if (raw) setRefreshing(true);
    else setLoading(true);

    fetchOnce({ force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

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

    const requestedRoomId = normalizeRoomId(roomId);
    const assignedRoomId = normalizeRoomId(me?.assignedRoomId);

    const roomIds = rooms.map((r) => normalizeRoomId(r.id));

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
  }, [raw, roomId]);

  const refetch = useCallback(async () => {
    setRefreshing(true);
    await fetchOnce({ force: true });
  }, [fetchOnce]);

  return { ...derived, raw, loading, refreshing, error, refetch };
}
