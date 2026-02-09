// server/src/websocket/websocketHub.js
import { WebSocketServer } from "ws";
import { WEBSOCKET_EVENTS } from "./websocketEventNames.js";

/**
 * WebSocket hub (single place):
 * - attaches a WebSocketServer to an existing HTTP server (via /ws upgrade)
 * - tracks lightweight client metadata (examId/role/userId)
 * - broadcasts events to:
 *   - everyone
 *   - everyone subscribed to a specific examId
 *
 * NOTE: This hub does NOT store credentials/passwords.
 * It only keeps routing hints to send messages to the right clients.
 */

const WS_PATH = "/ws";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function wsIsOpen(ws) {
  return ws && ws.readyState === 1; // WebSocket.OPEN
}

export function attachWebSocketHub(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Expose globally for legacy code paths (if any)
  globalThis.__wss = wss;

  httpServer.on("upgrade", (req, socket, head) => {
    try {
      const url = req?.url || "";
      if (!url.startsWith(WS_PATH)) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (buf) => {
      const msg = safeJsonParse(String(buf || ""));
      if (!msg || typeof msg !== "object") return;

      // Subscribe routing info: examId / role / userId
      if (msg.type === "SUBSCRIBE") {
        if (msg.examId != null) ws.examId = String(msg.examId);
        if (msg.role != null) ws.role = String(msg.role);
        if (msg.userId != null) ws.userId = String(msg.userId);
      }

      // Allow explicit unsubscribe
      if (msg.type === "UNSUBSCRIBE") {
        if (msg.examId != null && String(ws.examId || "") === String(msg.examId)) {
          ws.examId = null;
        }
      }
    });

    ws.on("close", () => {
      // cleanup is handled naturally by ws server; no extra bookkeeping needed
    });
  });

  // Keep connections healthy (terminate dead clients)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    });
  }, 30_000);

  httpServer.on("close", () => clearInterval(pingInterval));

  return wss;
}

/**
 * Broadcast an event to all connected clients.
 */
export function broadcastToAll(eventName, payload = {}) {
  const wss = globalThis.__wss;
  if (!wss) return;

  const msg = JSON.stringify({ event: eventName, ...payload });

  wss.clients?.forEach((client) => {
    if (!wsIsOpen(client)) return;
    try {
      client.send(msg);
    } catch {}
  });
}

/**
 * Broadcast an event only to clients subscribed to a specific examId.
 */
export function broadcastToExam(examId, eventName, payload = {}) {
  const wss = globalThis.__wss;
  if (!wss) return;

  const target = String(examId || "");
  const msg = JSON.stringify({ event: eventName, examId: target, ...payload });

  wss.clients?.forEach((client) => {
    if (!wsIsOpen(client)) return;

    const clientExam = String(client.examId || "");
    // If client didn't subscribe, we skip (prevents spamming everyone)
    if (!clientExam) return;
    if (clientExam !== target) return;

    try {
      client.send(msg);
    } catch {}
  });
}

/**
 * Convenience: send a "something changed" signal.
 * Use this when multiple parts of the snapshot might have changed.
 */
export function broadcastSystemChange({ examId } = {}) {
  // For simplicity and reliability (especially with multiple screens),
  // we broadcast to ALL clients and include examId in the payload.
  // Clients can ignore events that are not relevant to the currently viewed exam.
  broadcastToAll(WEBSOCKET_EVENTS.SYSTEM_DATA_CHANGED, { ts: Date.now(), examId: examId ? String(examId) : "" });
}
