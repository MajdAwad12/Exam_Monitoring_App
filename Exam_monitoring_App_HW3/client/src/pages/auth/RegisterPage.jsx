// src/pages/auth/RegisterPage.jsx
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import RegisterHeader from "../../components/auth/RegisterHeader";
import RegisterForm from "../../components/auth/RegisterForm";

import AuthFooter from "../../components/auth/AuthFooter";
import ErrorAlert from "../../components/auth/ErrorAlert";

import { isUsernameTaken, registerUser } from "../../services/auth.service";

export default function RegisterPage() {
  const navigate = useNavigate();

  const captcha = useMemo(() => {
    const a = Math.floor(Math.random() * (9 - 2 + 1)) + 2;
    const b = Math.floor(Math.random() * (9 - 1 + 1)) + 1;
    return { a, b, answer: a + b };
  }, []);

  const [message, setMessage] = useState({
    show: false,
    type: "success",
    text: "",
  });

  async function handleSubmit(formData) {
    setMessage({ show: false, type: "success", text: "" });

    if (!formData.role) {
      setMessage({
        show: true,
        type: "error",
        text: "Please select a role (Supervisor or Lecturer).",
      });
      return;
    }

    if (formData.password !== formData.password2) {
      setMessage({ show: true, type: "error", text: "Passwords do not match." });
      return;
    }

    if (Number(formData.captchaAnswer) !== captcha.answer) {
      setMessage({
        show: true,
        type: "error",
        text: "Security check failed. Please try again.",
      });
      return;
    }

    try {
      const taken = await isUsernameTaken(formData.username);
      if (taken) {
        setMessage({
          show: true,
          type: "error",
          text: "This username already exists. Please choose another one.",
        });
        return;
      }
    } catch {
      // ignore
    }

    try {
      await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
      });

      setMessage({
        show: true,
        type: "success",
        text: "Account created successfully! You can login now.",
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again.";
      setMessage({ show: true, type: "error", text: msg });
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-sky-800 to-cyan-700">
      {/* Subtle background */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[34rem] h-[34rem] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_0)] [background-size:26px_26px] opacity-25" />

      {/* Back to Home */}
      <button
        type="button"
        onClick={() => navigate("/", { replace: true })}
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-white/15 hover:bg-white/25 text-white text-sm font-semibold
                   border border-white/20 backdrop-blur shadow-lg transition"
      >
        ← Back to Home
      </button>

      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
            {/* LEFT: Brand / Info */}
            <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl p-7 lg:p-9 text-white">
              <div className="flex items-center gap-4">
                <img
                  src="/exammonitoringPIC.png"
                  alt="Exam Monitoring"
                  className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 p-2 shadow"
                />
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    Create a Staff Account
                  </h1>
                  <p className="text-white/80 text-sm font-semibold">
                    Supervisor / Lecturer registration (role-based access)
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">Why register?</p>
                  <ul className="mt-2 space-y-2 text-sm text-white/85">
                    <li className="flex gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>Access the live Dashboard & classroom monitoring</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>Manage incidents, transfers, and supervision flow</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>Generate reports & track exam history</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">Security</p>
                  <p className="mt-2 text-sm text-white/85 leading-relaxed">
                    We use a small verification question and username validation
                    to reduce accidental registrations. Choose a strong password.
                  </p>
                </div>

                <div className="pt-2 text-sm text-white/80">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-extrabold text-white underline underline-offset-4 hover:opacity-90"
                  >
                    Go to Login
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT: Register Card */}
            <div className="flex flex-col justify-center">
              <div className="mb-4 lg:mb-5">
                <RegisterHeader />
              </div>

              <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-7 lg:p-8 border border-white/40">
                {/* keep your existing ErrorAlert API usage */}
                {message.show && (
                  <ErrorAlert type={message.type} text={message.text} />
                )}

                <RegisterForm
                  onSubmit={handleSubmit}
                  captchaLabel={`${captcha.a} + ${captcha.b} = ?`}
                />

                <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full
                               bg-slate-900 text-white font-extrabold text-sm
                               hover:bg-slate-800 shadow-md transition"
                  >
                    ← Back to Login
                  </button>

                  <div className="text-xs text-slate-500 text-center sm:text-right">
                    Tip: Use a professional username (e.g. lecturer1 / supervisor2)
                  </div>
                </div>

                <div className="mt-4 text-center text-xs text-slate-500">
                  By creating an account, you agree to use this system responsibly
                  for academic exam supervision.
                </div>
              </div>

              <div className="mt-4">
                <AuthFooter />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/70">
            © {new Date().getFullYear()} Exam Monitoring • Built with React +
            Node + MongoDB
          </div>
        </div>
      </div>
    </div>
  );
}
