import { useEffect, useState, useCallback } from "react";
import { getExams } from "../services/exams.service.js";
import { useWebSocketEvent } from "./useWebSocketEvent.js";

export function useExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExams = useCallback(() => {
    setLoading(true);
    setError(null);
    getExams()
      .then(setExams)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // WebSocket: if server says "data changed", refresh exams list (admin pages etc.)
  useWebSocketEvent((msg) => {
    if (msg?.event === "SYSTEM_DATA_CHANGED") {
      fetchExams();
    }
  });

  return { exams, loading, error, refetch: fetchExams };
}
