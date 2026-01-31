// client/src/components/layout/AppLayout.jsx
import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import FloatingChatWidget from "../chat/FloatingChatWidget.jsx";
import { getMe, logout } from "../../services/auth.service.js";

function routeToScreen(pathname) {
  const p = String(pathname || "").toLowerCase();
  if (p.includes("/dashboard")) return "dashboard";
  if (p.includes("/exams")) return "exams_list";
  if (p.includes("/reports")) return "reports";
  if (p.includes("/admin")) return "admin";
  return "other";
}

// ✅ Prefer env, fallback to Render URL
const WS_URL =
  import.meta.env.VITE_WS_URL || "wss://exam-monitoring-server.onrender.com/ws";

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  // ✅ Optional: you can show status somewhere if you want
  // const [wsStatus, setWsStatus] = useState("disconnected");

  // ✅ Global chat context (will be updated by pages)
  const [chatContext, setChatContext] = useState({
    screen: routeToScreen(pathname),
    examId: null,
    roomId: null,
    stats: null,
    alertsCount: 0,
    transfersCount: 0,
  });

  // keep screen updated when route changes (even if a page forgets to set it)
  useEffect(() => {
    setChatContext((prev) => ({
      ...prev,
      screen: routeToScreen(pathname),
    }));
  }, [pathname]);

  // ✅ Fetch current user (session)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const user = await getMe();
        if (!alive) return;
        setMe(user);
      } catch {
        navigate("/login", { replace: true });
      } finally {
        if (alive) setLoadingMe(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  // ✅ GLOBAL WebSocket: one connection for the whole app
  useEffect(() => {
    let ws = null;
    let retryTimer = null;
    let pingTimer = null;
    let alive = true;

    let attempts = 0;

    const connect = () => {
      if (!alive) return;

      try {
        ws = new WebSocket(WS_URL);
        window.dispatchEvent(new CustomEvent("ws:status", { detail: { status: "connecting", at: Date.now() } }));
        // setWsStatus("connecting");

        ws.onopen = () => {
          window.dispatchEvent(new CustomEvent("ws:status", { detail: { status: "connected", at: Date.now() } }));
          attempts = 0;
          // setWsStatus("connected");

          // keep-alive ping (helps proxies / idle timeouts)
          clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "PING", ts: Date.now() }));
            }
          }, 25000);
        };

        ws.onmessage = (e) => {
          let msg = null;
          try {
            msg = JSON.parse(e.data);
          } catch {
            return;
          }

          // ✅ Broadcast to the app (any page/hook can listen)
          window.dispatchEvent(new CustomEvent("ws:event", { detail: msg }));
        };

        ws.onerror = () => {
          // onclose usually fires after
        };

        ws.onclose = () => {
          window.dispatchEvent(new CustomEvent("ws:status", { detail: { status: "disconnected", at: Date.now() } }));
          // setWsStatus("disconnected");
          clearInterval(pingTimer);

          if (!alive) return;

          // ✅ reconnect with backoff
          attempts += 1;
          const delay = Math.min(10000, 500 * attempts); // up to 10s

          clearTimeout(retryTimer);
          retryTimer = setTimeout(connect, delay);
        };
      } catch {
        // setWsStatus("disconnected");
      }
    };

    connect();

    return () => {
      alive = false;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, []);

  async function onLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  // ✅ outlet context includes setChatContext (so any page can enrich the bot)
  const outletCtx = useMemo(() => {
    return {
      me,
      loadingMe,
      chatContext,
      setChatContext,
    };
  }, [me, loadingMe, chatContext]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-sky-600 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-[1800px] h-[95vh] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl flex overflow-hidden relative">
        {me ? <Sidebar me={me} onLogout={onLogout} /> : <div className="w-[280px] bg-white/90 border-r border-slate-200" /> }

        <div className="flex-1 flex flex-col bg-white min-w-0">
          {me ? <Topbar me={me} /> : <div className="h-[64px] border-b border-slate-200 bg-white" /> }

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-10">
              {loadingMe ? (
                <div className="min-h-[240px] grid place-items-center">
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-700 shadow-sm">
                    <div className="font-extrabold">Loading session…</div>
                    <div className="text-sm text-slate-500 mt-1">Preparing your dashboard</div>
                  </div>
                </div>
              ) : (
                <Outlet context={outletCtx} />
              )}
            </div>
          </div>
        </div>

        {/* ✅ Floating bot gets global context (updated by pages) */}
        {me?.role !== "student" && !loadingMe && <FloatingChatWidget me={me} context={chatContext} />}
      </div>
    </div>
  );
}
