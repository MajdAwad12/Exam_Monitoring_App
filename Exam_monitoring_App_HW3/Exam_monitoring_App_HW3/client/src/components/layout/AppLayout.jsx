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

// ---- small session cache (makes navigation feel instant) ----
const ME_CACHE_KEY = "__me_cache_v1";
const ME_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readMeCache() {
  try {
    const raw = sessionStorage.getItem(ME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user || !parsed?.at) return null;
    if (Date.now() - Number(parsed.at) > ME_CACHE_TTL_MS) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function writeMeCache(user) {
  try {
    sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify({ user, at: Date.now() }));
  } catch {
    // ignore
  }
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ✅ warm start: show cached session immediately, then verify in background
  const cachedMe = readMeCache();

  const [me, setMe] = useState(cachedMe);
  const [loadingMe, setLoadingMe] = useState(!cachedMe);

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

  // ✅ Fetch current user (session) with timeout (handled by auth.service)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const user = await getMe();
        if (!alive) return;
        setMe(user);
        writeMeCache(user);
      } catch {
        // if we had cached session but server says "no" => clear and redirect
        try {
          sessionStorage.removeItem(ME_CACHE_KEY);
        } catch {}
        if (alive) navigate("/login", { replace: true });
      } finally {
        if (alive) setLoadingMe(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  async function onLogout() {
    try {
      await logout();
    } finally {
      try {
        sessionStorage.removeItem(ME_CACHE_KEY);
      } catch {}
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
        {me ? <Sidebar me={me} onLogout={onLogout} /> : <div className="w-[280px] bg-white/90 border-r border-slate-200" />}

        <div className="flex-1 flex flex-col bg-white min-w-0">
          {me ? <Topbar me={me} /> : <div className="h-[64px] border-b border-slate-200 bg-white" />}

          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="p-10">
              {loadingMe && !me ? (
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
