// client/src/services/websocket.service.js
// One WebSocket connection helper (connect/reconnect + send JSON).
// This does NOT store passwords or sensitive user data.

function getBackendWebSocketUrl() {
  // Prefer explicit env, if provided:
  const envUrl = import.meta?.env?.VITE_WEBSOCKET_URL;
  if (envUrl) return String(envUrl);

  const loc = typeof window !== "undefined" ? window.location : null;
  const isLocal = loc && (loc.hostname === "localhost" || loc.hostname === "127.0.0.1");

  // Local dev: server typically runs on :5000
  if (isLocal) {
    return `ws://${loc.hostname}:5000/ws`;
  }

  // Production (your current backend on Render)
  return "wss://exam-monitoring-server.onrender.com/ws";
}

export function createWebSocketConnection({ onMessage, onOpen, onClose, onError } = {}) {
  let ws = null;
  let closedByUser = false;
  let reconnectTimer = null;

  const url = getBackendWebSocketUrl();

  function clearReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function connect() {
    clearReconnect();
    closedByUser = false;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        onOpen?.();
      };

      ws.onmessage = (ev) => {
        let data = null;
        try {
          data = JSON.parse(String(ev.data || ""));
        } catch {
          data = { event: "RAW", data: String(ev.data || "") };
        }
        onMessage?.(data);
      };

      ws.onerror = (e) => {
        onError?.(e);
      };

      ws.onclose = () => {
        onClose?.();
        ws = null;

        // auto-reconnect unless user closed
        if (!closedByUser) {
          reconnectTimer = setTimeout(connect, 1200);
        }
      };
    } catch (e) {
      onError?.(e);
      reconnectTimer = setTimeout(connect, 1500);
    }
  }

  function close() {
    closedByUser = true;
    clearReconnect();
    try {
      ws?.close();
    } catch {}
    ws = null;
  }

  function sendJson(obj) {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
        return true;
      }
    } catch {}
    return false;
  }

  // start immediately
  connect();

  return { close, sendJson, getUrl: () => url };
}
