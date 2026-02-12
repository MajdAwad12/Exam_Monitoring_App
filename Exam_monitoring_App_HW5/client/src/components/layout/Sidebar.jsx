// client/src/components/layout/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

const SIDEBAR_ROLES = {
  supervisor: [
    { key: "dashboard", path: "dashboard", icon: "📊" },
    { key: "exams", path: "exams", icon: "📝" },
  ],
  lecturer: [
    { key: "dashboard", path: "dashboard", icon: "📊" },
    { key: "exams", path: "exams", icon: "📝" },
    { key: "reports", path: "reports", icon: "📄" },
  ],
  admin: [
    { key: "dashboard", path: "dashboard", icon: "📊" },
    { key: "exams", path: "exams", icon: "📝" },
    { key: "reports", path: "reports", icon: "📄" },
    { key: "manageExams", path: "manage-exams", icon: "🛠️" },
  ],
  student: [{ key: "myExamReport", path: "student", icon: "🎓" }],
};

function buildItemClass({ isActive, collapsed }) {
  const base =
    "group w-full flex items-center rounded-2xl transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-500/30";

  const active = isActive
    ? "bg-sky-600 text-white shadow-sm"
    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900/60";

  const layout = collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3 py-2.5 sm:px-4 sm:py-3";

  return `${base} ${active} ${layout}`;
}

function NavItem({ to, icon, label, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) => buildItemClass({ isActive, collapsed })}
      end={false}
    >
      <span className={collapsed ? "text-xl" : "text-lg"} aria-hidden="true">
        {icon}
      </span>

      {!collapsed ? (
        <span className="min-w-0 truncate font-semibold text-[15px]">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </NavLink>
  );
}

function CollapseButton({ collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "h-10 w-10 rounded-2xl",
        "border border-slate-200 dark:border-slate-800",
        "bg-white/90 dark:bg-slate-950/70",
        "hover:bg-slate-50 dark:hover:bg-slate-900/70",
        "shadow-sm hover:shadow-md",
        "transition-all duration-200 ease-out",
        "text-slate-700 dark:text-slate-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-500/30",
        "active:scale-95",
      ].join(" ")}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand" : "Collapse"}
    >
      <span
        className={[
          "text-lg leading-none",
          "transition-transform duration-300",
          collapsed ? "rotate-0" : "rotate-180",
        ].join(" ")}
        aria-hidden="true"
      >
        ❯
      </span>
    </button>
  );
}

function SidebarContent({ me, onLogout, collapsed, onToggleCollapsed, onNavigate }) {
  const { t } = useTranslation();
  const role = me?.role;
  const items = SIDEBAR_ROLES[role] || [];

  const buildTo = (p) => `/app/${String(p).replace(/^\/+/, "")}`;
  const roleLabel = String(me?.role || "-").toUpperCase();
  const subtitleKey = role === "student" ? "sidebar.subtitle.student" : "sidebar.subtitle.live";
  const brandTitle = useMemo(() => t("app.title"), [t]);

  return (
    <div className="h-full flex flex-col">
      {/* ===== BRAND ===== */}
      <div className={`border-b border-slate-200 dark:border-slate-800 ${collapsed ? "p-3" : "p-5"}`}>
        {/* 
          Stabilize layout: always reserve the same vertical space for brand area
          so the user never sees a “jump” while collapsing/expanding.
        */}
        <div
          className={[
            "grid grid-rows-[auto_auto] gap-3",
            // reserve consistent height across states (logo row + button row)
            "min-h-[124px]",
          ].join(" ")}
        >
          {/* Row 1: logo + title */}
          <div className={`flex items-center min-w-0 ${collapsed ? "justify-center" : "gap-3"}`}>
            {/* Logo wrapper (never crops) */}
            <div
              className={[
                collapsed ? "h-12 w-12" : "h-14 w-14",
                "shrink-0 rounded-2xl",
                "bg-white dark:bg-slate-900",
                "ring-1 ring-slate-200/80 dark:ring-slate-800/70",
                "overflow-hidden",
                "flex items-center justify-center",
                "transform-gpu",
              ].join(" ")}
            >
              <img
                src="/exammonitoringPIC.png"
                alt="Exam Monitoring"
                className="h-full w-full object-contain p-1.5"
                draggable="false"
              />
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <h1
                  title={brandTitle}
                  className={[
                    "text-[15px] sm:text-[16px] font-extrabold",
                    "text-slate-800 dark:text-slate-100",
                    "leading-snug",
                    "whitespace-normal break-words",
                    // keep it stable: reserve up to 2 lines height
                    "min-h-[2.6em]",
                  ].join(" ")}
                >
                  {brandTitle}
                </h1>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 whitespace-normal break-words">
                  {t(subtitleKey)}
                </p>
              </div>
            ) : null}
          </div>

          {/* Row 2: collapse button (always same row/height; just align changes) */}
          <div className={collapsed ? "flex justify-center" : "flex justify-end"}>
            <CollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
          </div>
        </div>
      </div>

      {/* User box (only when expanded) */}
      {!collapsed ? (
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 text-sm">
          <p className="text-slate-600 dark:text-slate-300">{t("sidebar.loggedInAs")}</p>
          <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
            {me?.fullName || me?.username || "-"}
          </p>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-sky-50 dark:bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-200 ring-1 ring-sky-200 dark:ring-sky-500/30">
              {roleLabel}
            </span>

            {role === "student" && me?.studentId ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700">
                {t("sidebar.studentId", { id: me.studentId })}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ===== NAVIGATION ===== */}
      <nav className={`${collapsed ? "px-2 py-4" : "px-4 py-4"} flex-1 flex flex-col gap-2`} aria-label="Primary navigation">
        {items.map((it) => (
          <NavItem
            key={it.key}
            to={buildTo(it.path)}
            icon={it.icon}
            label={t(`nav.${it.key}`)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* ===== LOGOUT ===== */}
      <div className={`border-t border-slate-200 dark:border-slate-800 ${collapsed ? "p-3" : "p-4"}`}>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? t("nav.logout") : undefined}
          className={
            collapsed
              ? "mx-auto h-12 w-12 rounded-2xl bg-red-700 text-white hover:bg-red-800 dark:bg-rose-600 dark:hover:bg-rose-500 transition font-semibold shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-500/30 flex items-center justify-center"
              : "w-full rounded-2xl bg-red-700 text-white hover:bg-red-800 dark:bg-rose-600 dark:hover:bg-rose-500 transition font-semibold shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-500/30 px-4 py-3"
          }
        >
          {!collapsed ? <span>{t("nav.logout")}</span> : <span aria-hidden="true">⎋</span>}
          {collapsed ? <span className="sr-only">{t("nav.logout")}</span> : null}
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  me,
  onLogout,
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onCloseMobile,
}) {
  const { i18n, t } = useTranslation();
  const isRtl = i18n.language === "he";

  // Mobile: always expanded inside drawer
  const onNavigate = () => onCloseMobile?.();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={
          "hidden lg:flex shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-col transition-[width] duration-300 ease-out will-change-[width] " +
          (collapsed ? "w-[88px]" : "w-72")
        }
        aria-label="Sidebar"
      >
        <SidebarContent
          me={me}
          onLogout={onLogout}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
          onNavigate={onNavigate}
        />
      </aside>

      {/* Mobile drawer */}
      <div className={"lg:hidden " + (mobileOpen ? "fixed inset-0 z-50" : "hidden")}>
        {/* overlay */}
        <button
          type="button"
          aria-label={t("common.close")}
          className="absolute inset-0 bg-black/45"
          onClick={onCloseMobile}
        />

        {/* panel */}
        <aside
          className={
            "absolute top-0 bottom-0 " +
            (isRtl ? "right-0" : "left-0") +
            " w-[88vw] sm:w-[420px] max-w-[420px] bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto"
          }
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar"
        >
          {/* Drawer top bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t("app.title")}</div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition shadow-sm"
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              ✕
            </button>
          </div>

          <SidebarContent
            me={me}
            onLogout={() => {
              onCloseMobile?.();
              onLogout?.();
            }}
            collapsed={false}
            onToggleCollapsed={onToggleCollapsed}
            onNavigate={onNavigate}
          />
        </aside>
      </div>
    </>
  );
}
