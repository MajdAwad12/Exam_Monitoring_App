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

// ---- sidebar UI state (persisted) ----
const SIDEBAR_COLLAPSED_KEY = "__sidebar_collapsed_v1";

function readSidebarCollapsed() {
  try {
    const v = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (v == null) return false; // default expanded
    return v === "1" || v === "true";
  } catch {
    return false;
  }
}

function writeSidebarCollapsed(v) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? "1" : "0");
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

  // ✅ Sidebar UI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
    setChatContext((prev) => ({ ...prev, screen: routeToScreen(pathname) }));
  }, [pathname]);

  // persist sidebar collapsed state
  useEffect(() => {
    writeSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  // close mobile drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // ✅ Fetch current user (session)
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
    return { me, loadingMe, chatContext, setChatContext };
  }, [me, loadingMe, chatContext]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-sky-600 to-cyan-400 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-stretch sm:items-center sm:justify-center p-0 sm:p-4">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[9999] focus:bg-white dark:bg-slate-950 focus:text-slate-900 dark:text-slate-100 focus:px-4 focus:py-2 focus:rounded-xl focus:shadow dark:focus:bg-slate-950 dark:focus:text-slate-100"
      >
        Skip to content
      </a>

      <div className="w-full max-w-[1800px] h-screen sm:h-[95vh] bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl flex overflow-hidden relative">
        {me ? (
          <Sidebar
            me={me}
            onLogout={onLogout}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        ) : (
          <div className="hidden lg:block w-[280px] bg-white/90 dark:bg-slate-950/70 border-r border-slate-200 dark:border-slate-800" />
        )}

        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 min-w-0">
          {me ? (
            <Topbar me={me} onOpenSidebar={() => setMobileSidebarOpen(true)} />
          ) : (
            <div className="h-[64px] border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950" />
          )}

          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
            <main id="main-content" className="p-4 sm:p-6 lg:p-10" role="main">
              <Outlet context={outletCtx} />
            </main>
          </div>
        </div>

        {/* ✅ Floating bot gets global context (updated by pages) */}
        {me?.role !== "student" && !loadingMe && <FloatingChatWidget me={me} context={chatContext} />}
      </div>
    </div>
  );
}
