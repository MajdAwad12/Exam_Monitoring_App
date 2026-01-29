// client/src/components/auth/RegisterForm.jsx
import { useMemo, useState } from "react";

export default function RegisterForm({ onSubmit, captchaLabel }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    password2: "",
    role: "",
    captchaAnswer: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const passwordStrength = useMemo(() => {
    const p = String(form.password || "");
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Weak", cls: "text-rose-700 bg-rose-50 border-rose-200" };
    if (score === 2) return { label: "Okay", cls: "text-amber-800 bg-amber-50 border-amber-200" };
    return { label: "Strong", cls: "text-emerald-800 bg-emerald-50 border-emerald-200" };
  }, [form.password]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        password2: form.password2,
        role: form.role,
        captchaAnswer: form.captchaAnswer,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputBase =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 " +
    "focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition shadow-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      {/* Full name */}
      <div>
        <label className="block text-sm font-extrabold text-slate-900 mb-2">
          Full name
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🪪
          </span>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setField("fullName", e.target.value)}
            placeholder="e.g. Rina Cohen"
            className={`pl-10 ${inputBase}`}
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-extrabold text-slate-900 mb-2">
          Email
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            ✉️
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="name@example.com"
            className={`pl-10 ${inputBase}`}
            required
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          We use email for contact and account verification (demo-friendly).
        </p>
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-extrabold text-slate-900 mb-2">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            👤
          </span>
          <input
            type="text"
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            placeholder="e.g. lecturer2 / supervisor3"
            className={`pl-10 ${inputBase}`}
            required
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Use a simple and professional username (no spaces).
        </p>
      </div>

      {/* Passwords */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="Create a password"
              className={`pl-10 pr-14 ${inputBase}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition"
              disabled={isSubmitting}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>

          <div className="mt-2">
            <span
              className={[
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border",
                passwordStrength.cls,
              ].join(" ")}
            >
              ⚙️ Password strength: {passwordStrength.label}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-2">
            Confirm password
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              ✅
            </span>
            <input
              type={showPass2 ? "text" : "password"}
              value={form.password2}
              onChange={(e) => setField("password2", e.target.value)}
              placeholder="Repeat password"
              className={`pl-10 pr-14 ${inputBase}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass2((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition"
              disabled={isSubmitting}
            >
              {showPass2 ? "Hide" : "Show"}
            </button>
          </div>

          {form.password2 && form.password !== form.password2 ? (
            <div className="mt-2 text-[12px] font-semibold text-rose-700">
              ❌ Passwords do not match
            </div>
          ) : form.password2 ? (
            <div className="mt-2 text-[12px] font-semibold text-emerald-700">
              ✅ Passwords match
            </div>
          ) : null}
        </div>
      </div>

      {/* Role */}
      <div>
        <p className="block text-sm font-extrabold text-slate-900 mb-2">Role</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="role"
                value="supervisor"
                checked={form.role === "supervisor"}
                onChange={(e) => setField("role", e.target.value)}
                className="text-indigo-600 border-slate-300"
                required
              />
              <div>
                <div className="font-extrabold text-slate-900">Supervisor</div>
                <div className="text-xs text-slate-500">
                  Monitor seats, manage incidents & transfers
                </div>
              </div>
            </div>
          </label>

          <label className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="role"
                value="lecturer"
                checked={form.role === "lecturer"}
                onChange={(e) => setField("role", e.target.value)}
                className="text-indigo-600 border-slate-300"
                required
              />
              <div>
                <div className="font-extrabold text-slate-900">Lecturer</div>
                <div className="text-xs text-slate-500">
                  Manage exams, view reports & student history
                </div>
              </div>
            </div>
          </label>
        </div>

        <p className="text-[11px] text-slate-500 mt-2">
          Students are created by the system only (demo rule).
        </p>
      </div>

      {/* Captcha */}
      <div>
        <label className="block text-sm font-extrabold text-slate-900 mb-2">
          Quick security check
        </label>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-extrabold border border-indigo-100">
            {captchaLabel}
          </span>

          <input
            type="number"
            value={form.captchaAnswer}
            onChange={(e) => setField("captchaAnswer", e.target.value)}
            className="w-28 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm
                       focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition"
            placeholder="Answer"
            required
          />
        </div>

        <p className="text-[11px] text-slate-500 mt-1">
          Demo captcha (simple simulation).
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={[
          "w-full rounded-full px-5 py-3 font-extrabold text-sm",
          "text-white",
          "bg-gradient-to-r from-indigo-600 to-sky-600",
          "hover:from-indigo-700 hover:to-sky-700",
          "focus:outline-none focus:ring-4 focus:ring-indigo-200",
          "shadow-lg hover:shadow-xl transition",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        ].join(" ")}
      >
        {isSubmitting ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
