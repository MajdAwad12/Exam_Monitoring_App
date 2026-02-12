// client/src/components/navigation/LanguageSwitcherButton.jsx
import { useTranslation } from "react-i18next";

export default function LanguageSwitcherButton({ className = "" }) {
  const { t, i18n } = useTranslation();
  const current = i18n.language === "en" ? "en" : "he";

  function setLang(lang) {
    if (lang === current) return;
    i18n.changeLanguage(lang);
  }

  const base =
    "h-9 px-3 rounded-xl border shadow-sm inline-flex items-center gap-2 " +
    "border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/70 " +
    "text-slate-900 dark:text-slate-100";

  const pill =
    "h-7 px-2 rounded-lg text-[12px] font-extrabold transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-500/40";

  const active =
    "bg-sky-600 text-white shadow-sm dark:bg-sky-500/25 dark:text-sky-100";
  const inactive =
    "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60";

  return (
    <div
      className={[base, className].join(" ")}
      role="group"
      aria-label={t("language.switcherLabel", "Language")}
      title={t("language.switcherHint", "Switch language")}
    >
      <span aria-hidden="true" className="text-[14px] leading-none opacity-80">
        🌐
      </span>

      <button
        type="button"
        onClick={() => setLang("he")}
        className={[pill, current === "he" ? active : inactive].join(" ")}
        aria-pressed={current === "he"}
      >
        עב
      </button>

      <button
        type="button"
        onClick={() => setLang("en")}
        className={[pill, current === "en" ? active : inactive].join(" ")}
        aria-pressed={current === "en"}
      >
        EN
      </button>
    </div>
  );
}
