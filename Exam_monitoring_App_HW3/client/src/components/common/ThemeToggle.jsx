// client/src/components/common/ThemeToggle.jsx
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemeToggle({ className = "" }) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  const label = isDark ? t("theme.darkMode") : t("theme.lightMode");
  const hint = isDark ? t("theme.switchToLight") : t("theme.switchToDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={hint}
      title={hint}
      className={[
        "h-9 px-3 rounded-xl border shadow-sm inline-flex items-center gap-2",
        "border-slate-200/80 dark:border-slate-700/80",
        "bg-slate-50/90 dark:bg-slate-900/60",
        "text-slate-900 dark:text-slate-100",
        "hover:bg-white dark:hover:bg-slate-900/80",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-500/40",
        className,
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-base leading-none">
        {isDark ? "🌙" : "☀️"}
      </span>
      <span className="text-[12px] font-extrabold tracking-tight">
        {label}
      </span>
    </button>
  );
}
