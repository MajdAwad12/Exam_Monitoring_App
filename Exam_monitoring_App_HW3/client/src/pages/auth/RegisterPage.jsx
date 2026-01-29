// src/pages/auth/RegisterPage.jsx
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
    const a = Math.floor(Math.random() * 8) + 2;
    const b = Math.floor(Math.random() * 9) + 1;
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
          text: "This username already exists.",
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
        text: "Account created successfully. You can login now.",
      });
    } catch (err) {
      setMessage({
        show: true,
        type: "error",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Registration failed. Please try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 pt-6">
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          ← Back to Home
        </button>
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <RegisterHeader />

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-7">
            {message.show ? (
              <ErrorAlert type={message.type} text={message.text} />
            ) : null}

            <RegisterForm
              onSubmit={handleSubmit}
              captchaLabel={`${captcha.a} + ${captcha.b} = ?`}
            />

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5
                         text-sm font-extrabold text-slate-800 hover:bg-slate-50 transition"
            >
              Back to Login
            </button>
          </div>

          <div className="mt-4">
            <AuthFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
