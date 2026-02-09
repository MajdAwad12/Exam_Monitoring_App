// client/src/hooks/useWebSocketEvent.js
import { useEffect } from "react";
import { WEBSOCKET_SYSTEM_EVENT } from "../websocket/WebSocketProvider.jsx";

/**
 * Subscribe to system-wide WebSocket events.
 * @param {(data:any)=>void} handler
 */
export function useWebSocketEvent(handler) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const fn = (ev) => handler?.(ev?.detail);
    window.addEventListener(WEBSOCKET_SYSTEM_EVENT, fn);
    return () => window.removeEventListener(WEBSOCKET_SYSTEM_EVENT, fn);
  }, [handler]);
}
