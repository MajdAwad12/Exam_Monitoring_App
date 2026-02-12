// client/src/components/common/AccessibilityWidget.jsx
// In-app accessibility widget (no external libraries).
// Applies preference classes on <html> and persists to localStorage.
//
// Usage:
//   <AccessibilityWidget placement="topbar" tone="default" />
//   <AccessibilityWidget placement="floating" />

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const LS_KEY = "__a11y_prefs_v2";

function getDir() {
  if (typeof document === "undefined") return "ltr";
  return document.documentElement?.dir === "rtl" ? "rtl" : "ltr";
}

function safeLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSave(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function applyHtmlClasses(prefs) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;

  // clear known classes
  el.classList.remove(
    "a11y-contrast",
    "a11y-underline-links",
    "a11y-highlight-focus",
    "a11y-reduce-motion",
    "a11y-text-lg",
    "a11y-text-xl"
  );

  if (prefs.contrast) el.classList.add("a11y-contrast");
  if (prefs.underlineLinks) el.classList.add("a11y-underline-links");
  if (prefs.highlightFocus) el.classList.add("a11y-highlight-focus");
  if (prefs.reduceMotion) el.classList.add("a11y-reduce-motion");

  if (prefs.textSize === "lg") el.classList.add("a11y-text-lg");
  if (prefs.textSize === "xl") el.classList.add("a11y-text-xl");
}

function baseBtnClasses(tone) {
  // tone="inverted" is useful on dark gradients (login/register)
  if (tone === "inverted") {
    return (
      "border border-white/25 bg-white/15 text-white " +
      "hover:bg-white/25 focus-visible:ring-white/40"
    );
  }

  return (
    "border border-slate-200 dark:border-slate-800 " +
    "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 " +
    "hover:bg-slate-50 dark:hover:bg-slate-900 focus-visible:ring-indigo-200"
  );
}

/**
 * @param {{
 *  placement?: "topbar" | "floating",
 *  tone?: "default" | "inverted",
 *  className?: string
 * }} props
 */
export default function AccessibilityWidget({ placement = "topbar", tone = "default", className = "" }) {
  const { t, i18n } = useTranslation();

  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(() =>
    safeLoad() || {
      textSize: "md", // md | lg | xl
      contrast: false,
      underlineLinks: false,
      highlightFocus: true,
      reduceMotion: false,
    }
  );

  const dir = useMemo(() => getDir(), [i18n.language]);

  useEffect(() => {
    applyHtmlClasses(prefs);
    safeSave(prefs);
  }, [prefs]);

  // close with ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function setTextSize(next) {
    setPrefs((p) => ({ ...p, textSize: next }));
  }

  function reset() {
    setPrefs({
      textSize: "md",
      contrast: false,
      underlineLinks: false,
      highlightFocus: true,
      reduceMotion: false,
    });
  }

  const wrapperClass =
    placement === "floating"
      ? "fixed bottom-6 " + (dir === "rtl" ? "left-6" : "right-6") + " z-[9998]"
      : "relative";

  const panelAlign = dir === "rtl" ? "left-0" : "right-0";

  return (
    <div className={wrapperClass + " " + className}>
      {/* Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("a11y.open")}
        title={t("a11y.open")}
        className={
          "h-10 px-4 rounded-2xl shadow-sm grid place-items-center " +
          "focus-visible:outline-none focus-visible:ring-2 " +
          baseBtnClasses(tone) +
          " active:scale-[0.98] "
        }
      >
        <span className="inline-flex items-center gap-2 font-extrabold text-sm">
          <span aria-hidden="true" className="text-lg leading-none">♿</span>
          <span className="hidden sm:inline">{t("a11y.short", "Accessibility")}</span>
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("a11y.panelTitle")}
          className={
            (placement === "floating" ? "mt-3" : "absolute mt-3 " + panelAlign) +
            " w-[340px] max-w-[90vw] rounded-2xl border shadow-2xl overflow-hidden " +
            (tone === "inverted"
              ? "bg-slate-950/95 border-white/15 backdrop-blur"
              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800")
          }
        >
          <div className={
            "px-4 py-3 border-b flex items-center justify-between " +
            (tone === "inverted"
              ? "border-white/10 text-white"
              : "border-slate-200 dark:border-slate-800")
          }>
            <div className={
              "font-extrabold " + (tone === "inverted" ? "text-white" : "text-slate-900 dark:text-slate-100")
            }>
              {t("a11y.panelTitle")}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("a11y.close")}
              className={
                "h-9 w-9 rounded-xl grid place-items-center focus-visible:outline-none focus-visible:ring-2 " +
                (tone === "inverted"
                  ? "text-white hover:bg-white/10 focus-visible:ring-white/40"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 focus-visible:ring-indigo-200")
              }
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div className={"p-4 space-y-4 " + (tone === "inverted" ? "text-white" : "") }>
            {/* Text size */}
            <div>
              <div className={
                "text-sm font-extrabold " +
                (tone === "inverted" ? "text-white" : "text-slate-800 dark:text-slate-200")
              }>
                {t("a11y.textSize")}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {[
                  { k: "md", label: t("a11y.sizeDefault") },
                  { k: "lg", label: t("a11y.sizeLarge") },
                  { k: "xl", label: t("a11y.sizeXL") },
                ].map((opt) => {
                  const active = prefs.textSize === opt.k;
                  return (
                    <button
                      key={opt.k}
                      type="button"
                      onClick={() => setTextSize(opt.k)}
                      aria-pressed={active}
                      className={
                        "px-3 py-2 rounded-xl border text-sm font-bold transition " +
                        (tone === "inverted"
                          ? (active
                              ? "bg-white text-slate-900 border-white"
                              : "bg-white/5 border-white/15 hover:bg-white/10 text-white")
                          : (active
                              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                              : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800"))
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            {[{
              key: "contrast",
              label: t("a11y.highContrast"),
            }, {
              key: "underlineLinks",
              label: t("a11y.underlineLinks"),
            }, {
              key: "highlightFocus",
              label: t("a11y.highlightFocus"),
            }, {
              key: "reduceMotion",
              label: t("a11y.reduceMotion", "Reduce motion"),
            }].map((row) => (
              <label
                key={row.key}
                className={
                  "flex items-center justify-between gap-3 text-sm font-semibold " +
                  (tone === "inverted" ? "text-white" : "text-slate-800 dark:text-slate-200")
                }
              >
                <span>{row.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[row.key])}
                  onChange={(e) => setPrefs((p) => ({ ...p, [row.key]: e.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
            ))}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={reset}
                className={
                  "text-sm px-3 py-2 rounded-xl border font-bold transition " +
                  (tone === "inverted"
                    ? "border-white/15 text-white hover:bg-white/10"
                    : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900")
                }
              >
                {t("a11y.reset")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={
                  "text-sm px-3 py-2 rounded-xl font-extrabold transition " +
                  (tone === "inverted"
                    ? "bg-white text-slate-900 hover:opacity-90"
                    : "bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90")
                }
              >
                {t("a11y.done")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
