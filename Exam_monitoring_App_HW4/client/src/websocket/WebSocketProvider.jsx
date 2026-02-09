// client/src/websocket/WebSocketProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createWebSocketConnection } from "../services/websocket.service.js";

// Global browser event name (so any screen/hook can listen without prop-drilling)
export const WEBSOCKET_SYSTEM_EVENT = "WebSocketSystemEvent";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const connRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    connRef.current = createWebSocketConnection({
      onOpen: () => setIsConnected(true),
      onClose: () => setIsConnected(false),
      onMessage: (data) => {
        setLastEvent(data);

        // Broadcast a DOM event for simple app-wide subscriptions
        try {
          window.dispatchEvent(new CustomEvent(WEBSOCKET_SYSTEM_EVENT, { detail: data }));
        } catch {}
      },
    });

    return () => {
      try {
        connRef.current?.close?.();
      } catch {}
      connRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      lastEvent,
      sendJson: (obj) => connRef.current?.sendJson?.(obj),
      socketUrl: connRef.current?.getUrl?.(),
    }),
    [isConnected, lastEvent]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}
