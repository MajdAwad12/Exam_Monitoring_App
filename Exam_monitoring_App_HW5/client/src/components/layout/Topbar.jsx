// client/src/components/layout/Topbar.jsx
import { useTranslation } from "react-i18next";
import LanguageDropdown from "../navigation/LanguageDropdown.jsx";
import ThemeToggle from "../common/ThemeToggle.jsx";
import AccessibilityWidget from "../common/AccessibilityWidget.jsx";

function formatDate(date, language) {
  try {
    return new Intl.DateTimeFormat(language === "he" ? "he-IL" : "en-GB", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

export default function Topbar({ me, onOpenSidebar }) {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const isRtl = i18n.language === "he";

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="min-h-16 sm:h-20 px-3 sm:px-6 lg:px-10 py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" role="banner">
        {/* Mobile: menu button */}
        <div className={"lg:hidden " + (isRtl ? "order-2" : "order-1")}>
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 transition"
            aria-label="Open sidebar"
            title="Menu"
          >
            ☰
          </button>
        </div>

        {/* Greeting */}
        <div className={"min-w-0 flex-1 w-full " + (isRtl ? "order-1" : "order-2")}>
          <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
            {t("topbar.greeting")},{" "}
            <span className="text-slate-900 dark:text-white">{me?.fullName || t("topbar.defaultUser")}</span> 👋
          </h2>
        </div>

        {/* Right side controls */}
        <div className={"w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 " + (isRtl ? "order-3" : "order-3")}>
          {/* Date (hide on very small) */}
          <div className="hidden sm:block text-right text-sm text-slate-500 dark:text-slate-300">
            <p>
              {t("topbar.today")}: {formatDate(today, i18n.language)}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{t("topbar.footer")}</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <AccessibilityWidget placement="topbar" />
            <LanguageDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
