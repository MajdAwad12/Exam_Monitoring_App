// client/src/components/auth/LoginForm.jsx
import { useEffect, useMemo, useState } from "react";

export default function LoginForm({
  username,
  password,
  setUsername,
  setPassword,
  isLoading,
  onSubmit,

  usernameLabel = "Username",
  usernamePlaceholder = "Enter your username",
  showRegister = false,
  onGoRegister,
}) {
  const [showPass, setShowPass] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const userIcon = useMemo(() => {
    const l = String(usernameLabel || "").toLowerCase();
    return l.includes("student") ? "🎓" : "👤";
  }, [usernameLabel]);

  useEffect(() => {
    // reset caps hint if password cleared
    if (!password) setCapsOn(false);
  }, [password]);

  return (
    <form className="space-y-5" autoComplete="off" onSubmit={onSubmit}>
      {/* Username */}
      <div>
        <label className="block text-sm font-extrabold text-slate-900 mb-2">
          {usernameLabel}
        </label>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {userIcon}
          </span>

          <input
            type="text"
            id="username"
            name="login-username"
            placeholder={usernamePlaceholder}
            autoComplete="off"
            className={[
              "w-full pl-10 pr-4 py-3 rounded-xl",
              "border border-slate-200 bg-white",
              "text-slate-900 placeholder:text-slate-400",
              "focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500",
              "transition shadow-sm",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            required
            disabled={isLoading}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <p className="mt-1 text-[11px] text-slate-500">
          Tip: usernames are usually lowercase (e.g. <b>supervisor1</b>).
        </p>
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-extrabold text-slate-900 mb-2">
          Password
        </label>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔒
          </span>

          <input
            type={showPass ? "text" : "password"}
            id="password"
            name="login-password"
            placeholder="Enter your password"
            autoComplete="off"
            className={[
              "w-full pl-10 pr-14 py-3 rounded-xl",
              "border border-slate-200 bg-white",
              "text-slate-900 placeholder:text-slate-400",
              "focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500",
              "transition shadow-sm",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={(e) => {
              // CapsLock hint (best-effort)
              if (typeof e.getModifierState === "function") {
                setCapsOn(e.getModifierState("CapsLock"));
              }
            }}
          />

          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            disabled={isLoading}
            className={[
              "absolute right-2 top-1/2 -translate-y-1/2",
              "px-3 py-1.5 rounded-lg text-xs font-extrabold",
              "bg-slate-100 text-slate-700 border border-slate-200",
              "hover:bg-slate-200 transition",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? "Hide" : "Show"}
          </button>
        </div>

        {capsOn ? (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 font-semibold">
            ⚠️ Caps Lock is ON
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Use the demo accounts for quick testing.</span>
            <span className="font-bold text-slate-600">Secure session</span>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={[
          "w-full rounded-full px-5 py-3 font-extrabold",
          "text-white text-sm",
          "bg-gradient-to-r from-indigo-600 to-sky-600",
          "hover:from-indigo-700 hover:to-sky-700",
          "focus:outline-none focus:ring-4 focus:ring-indigo-200",
          "shadow-lg hover:shadow-xl transition",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
        disabled={isLoading}
      >
        {isLoading ? "Signing In..." : "Sign In"}
      </button>

      {showRegister ? (
        <p className="text-xs text-slate-600 text-center">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={onGoRegister}
            className="font-extrabold text-indigo-700 hover:text-indigo-900 hover:underline"
            disabled={isLoading}
          >
            Create one
          </button>
        </p>
      ) : null}
    </form>
  );
}
