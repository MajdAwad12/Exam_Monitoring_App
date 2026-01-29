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

  const [message, setMessage] = useState({ show: false, type: "success", text: "" });

  async function handleSubmit(formData) {
    setMessage({ show: false, type: "success", text: "" });

    if (!formData.role) {
      setMessage({ show: true, type: "error", text: "Please select a role (Supervisor or Lecturer)." });
      return;
    }

    if (formData.password !== formData.password2) {
      setMessage({ show: true, type: "error", text: "Passwords do not match." });
      return;
    }

    if (Number(formData.captchaAnswer) !== captcha.answer) {
      setMessage({ show: true, type: "error", text: "Security check failed. Please try again." });
      return;
    }

    try {
      const taken = await isUsernameTaken(formData.username);
      if (taken) {
        setMessage({ show: true, type: "error", text: "This username already exists. Please choose another one." });
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-sky-600 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <RegisterHeader />

        {/* Back to Home */}
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold backdrop-blur transition"
          >
            ← Back to Home
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
            <p className="text-sm text-gray-600 mt-2">Register as a supervisor or lecturer</p>
          </div>

          {message.show && <ErrorAlert type={message.type} text={message.text} />}

          <RegisterForm
            onSubmit={handleSubmit}
            captchaLabel={`${captcha.a} + ${captcha.b} = ?`}
          />

          {/* Extra helper CTA (no login link) */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
            >
              Back to Home to Login
            </button>
          </div>
        </div>

        <AuthFooter />
      </div>
    </div>
  );
}
