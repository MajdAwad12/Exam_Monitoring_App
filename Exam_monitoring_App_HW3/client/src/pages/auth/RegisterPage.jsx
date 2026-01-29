// client/src/pages/auth/RegisterPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import RegisterHeader from "../../components/auth/RegisterHeader";
import RegisterForm from "../../components/auth/RegisterForm";

import AuthFooter from "../../components/auth/AuthFooter";
import ErrorAlert from "../../components/auth/ErrorAlert";

import { isUsernameTaken, registerUser } from "../../services/auth.service";

function Feature({ title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
        <span className="text-lg">✓</span>
      </div>
      <div>
        <p className="text-white font-semibold leading-tight">{title}</p>
        <p className="text-white/80 text-sm">{desc}</p>
      </div>
    </div>
  );
}

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
        text: "Account created successfully! Please go back to Home and login.",
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-sky-700 to-cyan-500 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />

      {/* Back to Home (top-left, floating) */}
      <button
        type="button"
        onClick={() => navigate("/", { replace: true })}
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full
                   bg-white/15 hover:bg-white/25 text-white text-sm font-semibold
                   border border-white/20 backdrop-blur shadow-lg transition"
      >
        <span className="text-base">←</span> Back to Home
      </button>

      <div className="min-hscreen flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* LEFT */}
          <div className="text-white px-2 lg:px-6">
            <div className="mb-6">
              <RegisterHeader />
            </div>

            <div className="max-w-lg">
              <h2 className="text-3xl font-extrabold leading-tight">
                Create your staff account.
              </h2>

              <p className="mt-3 text-white/85">
                Register as a Supervisor or Lecturer to access the exam monitoring dashboard.
              </p>

              <div className="mt-6 space-y-4">
                <Feature
                  title="Professional access control"
                  desc="Roles define permissions and dashboards."
                />
                <Feature
                  title="Fast onboarding"
                  desc="Create an account in seconds with a simple form."
                />
                <Feature
                  title="Built for academic integrity"
                  desc="Monitor attendance and incident reports."
                />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-md">
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 border border-white/40">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Create Account
                  </h2>
                  <p className="text-sm text-slate-600 mt-2">
                    Register as a supervisor or lecturer
                  </p>
                </div>

                {message.show && (
                  <ErrorAlert type={message.type} text={message.text} />
                )}

                <RegisterForm
                  onSubmit={handleSubmit}
                  captchaLabel={`${captcha.a} + ${captcha.b} = ?`}
                />
              </div>

              <div className="mt-4">
                <AuthFooter />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
