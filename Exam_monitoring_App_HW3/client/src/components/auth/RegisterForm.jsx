// client/src/components/auth/RegisterForm.jsx
import { useState } from "react";

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

  const input =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white " +
    "focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Full name
        </label>
        <input
          className={input}
          type="text"
          value={form.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          placeholder="e.g. Rina Cohen"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Email
        </label>
        <input
          className={input}
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="name@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Username
        </label>
        <input
          className={input}
          type="text"
          value={form.username}
          onChange={(e) => setField("username", e.target.value)}
          placeholder="Choose a username"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Password
          </label>
          <input
            className={input}
            type="password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            placeholder="Enter password"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Confirm password
          </label>
          <input
            className={input}
            type="password"
            value={form.password2}
            onChange={(e) => setField("password2", e.target.value)}
            placeholder="Repeat password"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Role
        </label>

        <div className="flex items-center gap-4 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="supervisor"
              checked={form.role === "supervisor"}
              onChange={(e) => setField("role", e.target.value)}
              required
            />
            Supervisor
          </label>

          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="role"
              value="lecturer"
              checked={form.role === "lecturer"}
              onChange={(e) => setField("role", e.target.value)}
              required
            />
            Lecturer
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Security check
        </label>

        <div className="flex items-center gap-3">
          <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold">
            {captchaLabel}
          </span>
          <input
            className="w-28 px-3 py-3 rounded-xl border border-slate-200 bg-white
                       focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
            type="number"
            value={form.captchaAnswer}
            onChange={(e) => setField("captchaAnswer", e.target.value)}
            placeholder="Answer"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-indigo-600 text-white py-3 font-extrabold
                   hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition
                   disabled:opacity-60"
      >
        {isSubmitting ? "Creating..." : "Create account"}
      </button>
    </form>
  );
}
