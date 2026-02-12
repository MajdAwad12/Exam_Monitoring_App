// client/src/components/auth/RegisterForm.jsx
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReCAPTCHA from "react-google-recaptcha";

export default function RegisterForm({
  onSubmit,
  captchaLabel = null, // נשאר, אבל לא חובה עכשיו
  isLoading = false,
}) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    password2: "",
    role: "",
  });

  const captchaRef = useRef(null);

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const busy = isLoading || isSubmitting;

  const siteKey = useMemo(() => {
    // Vite exposes only VITE_* vars
    return import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";
  }, []);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    // Require captcha
    if (!siteKey) {
      setCaptchaError(
        t(
          "auth.register.captchaMissingKey",
          "Captcha is not configured (missing site key)."
        )
      );
      return;
    }

    if (!captchaToken) {
      setCaptchaError(
        t("auth.register.captchaRequired", "Please complete the captcha.")
      );
      return;
    }

    setCaptchaError("");
    setIsSubmitting(true);
    try {
      await onSubmit({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        password2: form.password2,
        role: form.role,
        captchaToken, // ✅ NEW: send token to server
      });
    } finally {
      setIsSubmitting(false);
      // avoid 'timeout-or-duplicate' by forcing a new token next time
      try { captchaRef.current?.reset(); } catch {}
      setCaptchaToken("");
    }
  }

  const inputBase =
    "w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 " +
    "text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
    "focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 dark:focus:ring-sky-500/20 dark:focus:border-sky-400/50 transition";

  const input = `${inputBase} ${isRtl ? "text-right" : "text-left"}`;

  const roleBtnBase =
    "w-full py-2.5 rounded-xl text-sm font-extrabold transition " +
    "focus:outline-none focus:ring-4 focus:ring-indigo-100 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("auth.register.fullName", "Full Name")}
        </label>
        <input
          className={input}
          type="text"
          value={form.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          placeholder={t(
            "auth.register.fullNamePlaceholder",
            "Enter your full name"
          )}
          disabled={busy}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("auth.register.email", "Email")}
        </label>
        <input
          className={input}
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder={t("auth.register.emailPlaceholder", "Enter your email")}
          disabled={busy}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("auth.register.username", "Username")}
        </label>
        <input
          className={input}
          type="text"
          value={form.username}
          onChange={(e) => setField("username", e.target.value)}
          placeholder={t(
            "auth.register.usernamePlaceholder",
            "Choose a username"
          )}
          disabled={busy}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t("auth.register.password", "Password")}
          </label>
          <input
            className={input}
            type="password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder={t(
              "auth.register.passwordPlaceholder",
              "Create a password"
            )}
            disabled={busy}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t("auth.register.password2", "Confirm password")}
          </label>
          <input
            className={input}
            type="password"
            value={form.password2}
            onChange={(e) => setField("password2", e.target.value)}
            placeholder={t(
              "auth.register.password2Placeholder",
              "Confirm password"
            )}
            disabled={busy}
            required
          />
        </div>
      </div>

      {/* Role selector */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("auth.register.role", "Role")}
        </label>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2">
          <button
            type="button"
            onClick={() => setField("role", "supervisor")}
            disabled={busy}
            className={[
              roleBtnBase,
              form.role === "supervisor"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100",
            ].join(" ")}
          >
            {t("roles.supervisor", "Supervisor")}
          </button>

          <button
            type="button"
            onClick={() => setField("role", "lecturer")}
            disabled={busy}
            className={[
              roleBtnBase,
              form.role === "lecturer"
                ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100",
            ].join(" ")}
          >
            {t("roles.lecturer", "Lecturer")}
          </button>
        </div>

        {/* required "real" field (hidden but named) */}
        <input
          type="text"
          name="role"
          value={form.role}
          readOnly
          required
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* ✅ Google reCAPTCHA */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("auth.register.captcha", "Security check")}
        </label>

        <div
          className={[
            "rounded-2xl border border-slate-200 dark:border-slate-800",
            "bg-white dark:bg-slate-950 p-3",
            isRtl ? "flex justify-end" : "flex justify-start",
          ].join(" ")}
        >
          <ReCAPTCHA
            ref={captchaRef}
            sitekey={siteKey}
            onChange={(token) => {
              setCaptchaToken(token || "");
              setCaptchaError("");
              
            }}
              onExpired={() => { setCaptchaToken(""); setCaptchaError(t("auth.register.captchaExpired","Captcha expired. Try again.")); }}

          />
        </div>

        {!!captchaError && (
          <p className="mt-2 text-sm font-semibold text-rose-600">
            {captchaError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className={[
          "w-full rounded-xl bg-indigo-600 text-white dark:bg-sky-600 py-3.5 font-extrabold",
          "hover:bg-indigo-700 dark:hover:bg-sky-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-sky-500/30 transition",
          "shadow-sm hover:shadow-md",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {busy
          ? t("auth.register.creating", "Creating...")
          : t("auth.register.submit", "Create account")}
      </button>
    </form>
  );
}
