// ==============================
// client/src/pages/auth/RegisterPage.jsx
// ==============================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import RegisterHeader from "../../components/auth/RegisterHeader";
import RegisterForm from "../../components/auth/RegisterForm";
import AuthFooter from "../../components/auth/AuthFooter";
import ErrorAlert from "../../components/auth/ErrorAlert";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import AccessibilityWidget from "../../components/common/AccessibilityWidget.jsx";

import { registerUser, isUsernameTaken } from "../../services/auth.service";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  const [message, setMessage] = useState({
    show: false,
    type: "success",
    text: "",
  });

  // ✅ FIX: define isLoading (was used but not declared)
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData) {
    setMessage({ show: false, type: "success", text: "" });

    if (!formData.role) {
      setMessage({
        show: true,
        type: "error",
        text: t(
          "auth.register.errors.missingRole",
          "Please select a role (Supervisor or Lecturer)."
        ),
      });
      return;
    }

    if (formData.password !== formData.password2) {
      setMessage({
        show: true,
        type: "error",
        text: t("auth.register.errors.passwordsNoMatch", "Passwords do not match."),
      });
      return;
    }

    try {
      setIsLoading(true);

      // ✅ No duplicate usernames (pre-check)
      try {
        const taken = await isUsernameTaken(formData.username);
        if (taken) {
          setMessage({
            show: true,
            type: "error",
            text: t(
              "auth.register.errors.usernameTaken",
              "This username already exists. Please choose another one."
            ),
          });
          return;
        }
      } catch (err) {
        // If check fails, continue; server-side register still blocks duplicates
      }

      await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        captchaToken: formData.captchaToken,
      });

      setMessage({
        show: true,
        type: "success",
        text: t(
          "auth.register.success.created",
          "Account created successfully! Go back to Home and login."
        ),
      });
    } catch (err) {
      const msg =
        err?.message ||
        t("auth.register.errors.registerFailed", "Registration failed. Please try again.");
      setMessage({ show: true, type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-800 via-sky-700 to-cyan-500 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 dark:bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 dark:bg-sky-400/10 blur-3xl" />

      <button
        type="button"
        onClick={() => navigate("/", { replace: true })}
        className={[
          "fixed top-3 sm:top-5 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-white/15 hover:bg-white/25 text-white text-sm font-semibold",
          "border border-white/20 backdrop-blur shadow-lg transition",
          isRtl ? "right-3 sm:right-5" : "left-3 sm:left-5",
        ].join(" ")}
      >
        {t("auth.login.backHome", "← Back to Home")}
      </button>

      {/* Top controls: Theme + Accessibility + Language (also visible on Register) */}
      <div
        className={[
        "fixed top-14 sm:top-5 z-50",
          isRtl ? "left-3 sm:left-5" : "right-3 sm:right-5",
          "flex items-center gap-2",
        ].join(" ")}
      >
        <ThemeToggle className="border-white/25 bg-white/15 text-white hover:bg-white/25 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/70" />
        <AccessibilityWidget placement="topbar" tone="inverted" />

        <div className="rounded-full border backdrop-blur shadow-lg px-3 py-2 bg-white/80 border-slate-200 dark:bg-slate-950/60 dark:border-slate-800">
          <label className="sr-only" htmlFor="register-lang">
            {t("lang.label", "Language")}
          </label>
          <select
            id="register-lang"
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-slate-900 dark:text-slate-100 text-sm font-bold outline-none cursor-pointer"
            disabled={isLoading}
          >
            <option className="text-slate-900" value="en">
              {t("lang.en", "English")}
            </option>
            <option className="text-slate-900" value="he">
              {t("lang.he", "Hebrew")}
            </option>
          </select>
        </div>
      </div>

      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 lg:p-10 items-center">
            <div className="hidden lg:block">
              <div className="max-w-md">
                <h1 className="text-white text-4xl font-extrabold tracking-tight">
                  {t("auth.register.title", "Register")}
                </h1>
                <p className="text-indigo-100 mt-3 leading-relaxed">
                  {t(
                    "auth.register.subtitle",
                    "Create a staff account for supervisors or lecturers. Students are managed by the system in this demo version."
                  )}
                </p>

                <div className="mt-6 rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6">
                  <p className="text-white font-bold mb-2">
                    {t("auth.register.afterRegistrationTitle", "After registration")}
                  </p>
                  <ul className="text-indigo-100 text-sm space-y-1">
                    <li>
                      {t(
                        "auth.register.afterRegistration.loginDashboard",
                        "• Login and access your dashboard"
                      )}
                    </li>
                    <li>
                      {t(
                        "auth.register.afterRegistration.manageExams",
                        "• Manage exams and attendance flow"
                      )}
                    </li>
                    <li>
                      {t(
                        "auth.register.afterRegistration.trackIncidents",
                        "• Track incidents and reporting"
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl mx-auto">
              <div className="lg:hidden text-center mb-4">
                <h1 className="text-white text-3xl font-extrabold tracking-tight">
                  {t("auth.register.title", "Register")}
                </h1>
              </div>

              <RegisterHeader />

              <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-white/40">
                {message.show && <ErrorAlert type={message.type} text={message.text} />}

                <RegisterForm
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
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
