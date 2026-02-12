// client/src/components/auth/LoginForm.jsx
import { useTranslation } from "react-i18next";

export default function LoginForm({
  username,
  password,
  setUsername,
  setPassword,
  isLoading,
  onSubmit,
  usernameLabel,
  usernamePlaceholder,
}) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  const finalUsernameLabel = usernameLabel ?? t("auth.login.username", "Username");
  const finalUsernamePlaceholder =
    usernamePlaceholder ?? t("auth.login.usernamePlaceholder", "Enter your username");

  const inputClass =
    "w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 " +
    "text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
    "focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 dark:focus:ring-sky-500/20 dark:focus:border-sky-400/50 transition " +
    "disabled:opacity-70";

  return (
    <form className="space-y-4" autoComplete="off" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {finalUsernameLabel}
        </label>
        <input
          type="text"
          placeholder={finalUsernamePlaceholder}
          autoComplete="off"
          className={inputClass + (isRtl ? " text-right" : " text-left")}
          required
          disabled={isLoading}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          {t("auth.login.password", "Password")}
        </label>
        <input
          type="password"
          placeholder={t("auth.login.passwordPlaceholder", "Enter your password")}
          autoComplete="off"
          className={inputClass + (isRtl ? " text-right" : " text-left")}
          required
          disabled={isLoading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={[
          "w-full rounded-xl bg-indigo-600 text-white py-3.5 font-extrabold dark:bg-sky-600",
          "hover:bg-indigo-700 dark:hover:bg-sky-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-sky-500/30 transition",
          "shadow-sm hover:shadow-md",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {isLoading ? t("auth.login.loggingIn", "Logging in...") : t("auth.login.submit", "Login")}
      </button>
    </form>
  );
}
