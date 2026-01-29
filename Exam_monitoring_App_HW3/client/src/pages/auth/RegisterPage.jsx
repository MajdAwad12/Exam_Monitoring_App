// client/src/pages/auth/RegisterPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        text: "Account created successfully! Go back to Home and login.",
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
      {/* soft background blobs (subtle) */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />

      {/* Back to Home (top-left, clean) */}
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
        <div className="w-full max-w-md">
          {/* Top title */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <img
              src="/exammonitoringPIC.png"
              alt="Exam Monitoring"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-white text-2xl sm:text-3xl font-extrabold tracking-tight">
              Register
            </h1>
          </div>

          <RegisterHeader />

          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 border border-white/40">
            {message.show && <ErrorAlert type={message.type} text={message.text} />}

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
  );
}
