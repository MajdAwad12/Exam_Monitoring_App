// client/src/pages/auth/LoginPage.jsx
import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  loginUser,
  requestStudentOtp,
  verifyStudentOtp,
  staffForgotPassword,
} from "../../services/auth.service";
import { useShake } from "../../hooks/useShake";

import LoginHeader from "../../components/auth/LoginHeader";
import LoginCard from "../../components/auth/LoginCard";
import ErrorAlert from "../../components/auth/ErrorAlert";
import LoginForm from "../../components/auth/LoginForm";
import AuthFooter from "../../components/auth/AuthFooter";
import ThemeToggle from "../../components/common/ThemeToggle.jsx";
import AccessibilityWidget from "../../components/common/AccessibilityWidget.jsx";
import LanguageSwitcherButton from "../../components/navigation/LanguageSwitcherButton.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  // keep the page direction consistent with the selected language
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRtl ? "rtl" : "ltr";
    }
  }, [isRtl]);

  const [tab, setTab] = useState("staff"); // "staff" | "student"

  // tab slider: in RTL the second tab is visually on the left
  const sliderClass =
    tab === "student"
      ? isRtl
        ? "-translate-x-full"
        : "translate-x-full"
      : "translate-x-0";

  // staff
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // student OTP flow
  const [studentId, setStudentId] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [studentStep, setStudentStep] = useState(1); // 1=request, 2=verify

  const [isLoading, setIsLoading] = useState(false);

  // one unified notice
  const [notice, setNotice] = useState(null); // { type: "success"|"error"|"info"|"warning", text: string }
  const { shake, triggerShake } = useShake(500);

  // (kept for later use - demo fill buttons)
  const staffDemos = useMemo(
    () => [
      { label: "Admin", u: "admin", p: "1234" },
      { label: "Supervisor1", u: "supervisor1", p: "1234" },
      { label: "Supervisor2", u: "supervisor2", p: "1234" },
      { label: "Supervisor3", u: "supervisor3", p: "1234" },
      { label: "Lecturer", u: "lecturer1", p: "1234" },
    ],
    []
  );

  const studentDemos = useMemo(
    () => [{ label: "Student", id: "3190010491096", email: "majdawad86@gmail.com" }],
    []
  );

  function showNotice(type, text, { autoHideMs = 0 } = {}) {
    setNotice({ type, text });
    if (autoHideMs > 0) {
      window.clearTimeout(showNotice._t);
      showNotice._t = window.setTimeout(() => setNotice(null), autoHideMs);
    }
  }

  useEffect(() => {
    return () => window.clearTimeout(showNotice._t);
  }, []);

  async function onSubmitStaff(e) {
    e.preventDefault();
    setNotice(null);

    const u = staffUsername.trim().toLowerCase();
    const p = staffPassword.trim();

    if (!u || !p) {
      showNotice("warning", t("auth.login.errors.missingStaff"));
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      const user = await loginUser({ username: u, password: p });
      if (user?.role === "student") navigate("/app/student", { replace: true });
      else navigate("/app/dashboard", { replace: true });
    } catch (err) {
      showNotice("error", err?.message || t("auth.login.errors.loginFailed", "Login failed."));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  async function onRequestOtp(e) {
    e?.preventDefault();
    setNotice(null);

    const id = studentId.trim();
    const em = studentEmail.trim().toLowerCase();

    if (!id || !em) {
      showNotice("warning", t("auth.login.errors.missingStudent"));
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      const r = await requestStudentOtp({ email: em, studentId: id });

      setStudentStep(2);
      showNotice(
        "success",
        (r?.message || t("auth.login.otpSentShort", "OTP sent.")) +
          " ✅ " +
          t("auth.login.checkInboxSpam", "Please check your Inbox and also Spam/Junk."),
        { autoHideMs: 12000 }
      );
    } catch (err) {
      showNotice("error", err?.message || t("auth.login.errors.otpSend", "Failed to send OTP."));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  async function onVerifyOtp(e) {
    e.preventDefault();
    setNotice(null);

    const id = studentId.trim();
    const em = studentEmail.trim().toLowerCase();
    const code = otp.trim();

    if (!id || !em || !code) {
      showNotice("warning", t("auth.login.errors.missingOtp"));
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      await verifyStudentOtp({ email: em, studentId: id, otp: code });

      showNotice("success", t("auth.login.otpVerifiedLoggingIn", "OTP verified. Logging you in…"), {
        autoHideMs: 2500,
      });
      navigate("/app/student", { replace: true });
    } catch (err) {
      showNotice("error", err?.message || t("auth.login.errors.invalidOtp", "Invalid OTP."));
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  async function onStaffForgot() {
    setNotice(null);

    const em = forgotEmail.trim().toLowerCase();
    if (!em) {
      showNotice("warning", t("auth.login.errors.missingEmail"));
      return;
    }

    try {
      setIsLoading(true);
      const r = await staffForgotPassword(em);

      // show it as success even if email not found (server returns generic)
      showNotice(
        "success",
        r?.message || t("auth.login.forgotSuccess", "If this email exists, we sent your login details."),
        { autoHideMs: 12000 }
      );
    } catch (err) {
      showNotice("error", err?.message || t("auth.login.errors.emailSend", "Failed to send email."));
    } finally {
      setIsLoading(false);
    }
  }

  function onFillDemoStaff(d) {
    setNotice(null);
    setStaffUsername(d.u);
    setStaffPassword(d.p);
  }

  function onFillDemoStudent(d) {
    setNotice(null);
    setStudentId(d.id);
    setStudentEmail(d.email);
    setOtp("");
    setStudentStep(1);
  }

  const backBtnPos = isRtl ? "right-5" : "left-5";
  const langPos = isRtl ? "left-5" : "right-5";

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-indigo-800 via-sky-700 to-cyan-500 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 dark:bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 dark:bg-sky-400/10 blur-3xl" />

      {/* Back to home */}
      <button
        type="button"
        onClick={() => navigate("/", { replace: true })}
        className={[
          "fixed top-5 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-white/15 hover:bg-white/25 text-white text-sm font-semibold",
          "border border-white/20 backdrop-blur shadow-lg transition",
          backBtnPos,
        ].join(" ")}
      >
        {t("auth.login.backHome", "← Back to Home")}
      </button>

      {/* Top controls: Theme + Accessibility + Language (also visible on Login) */}
      <div
        className={[
          "fixed top-5 z-50",
          langPos,
          "flex items-center gap-2",
        ].join(" ")}
      >
        <ThemeToggle className="border-white/25 bg-white/15 text-white hover:bg-white/25 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:bg-slate-800/70" />
        <AccessibilityWidget placement="topbar" tone="inverted" />

        <div className="rounded-full bg-white/15 border border-white/20 backdrop-blur shadow-lg px-3 py-2">
          <label className="sr-only" htmlFor="login-lang">
            {t("lang.label", "Language")}
          </label>
          <select
            id="login-lang"
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer"
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

      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:p-6 lg:p-10 items-center">
            <div className="hidden lg:block">
              <div className="max-w-md">
                <h1 className="text-white text-4xl font-extrabold tracking-tight">
                  {t("auth.login.title", "Login")}
                </h1>
              </div>
            </div>

            <div className="w-full max-w-xl mx-auto">
              <div className="lg:hidden text-center mb-4">
                <h1 className="text-white text-3xl font-extrabold tracking-tight">
                  {t("auth.login.title", "Login")}
                </h1>
              </div>

              <LoginHeader />

              <LoginCard shake={shake}>
                <div className="mb-5">
               <div className="rounded-2xl bg-white/90 dark:bg-slate-900/60 border border-white/40 dark:border-slate-700/60 p-1 shadow-sm backdrop-blur">
  <div className="grid grid-cols-2 relative">
    <div
      className={[
        "absolute top-0 h-full w-1/2 rounded-xl shadow transition-transform duration-300",
        "bg-indigo-600 dark:bg-slate-800 ring-1 ring-indigo-500/20 dark:ring-slate-700/40",
        sliderClass,
      ].join(" ")}
    />

    <button
      type="button"
      onClick={() => {
        setTab("staff");
        setNotice(null);
        setStudentStep(1);
        setOtp("");
      }}
      className={[
        "relative z-10 py-2.5 rounded-xl text-sm font-extrabold transition whitespace-nowrap",
        tab === "staff"
          ? "text-white"
          : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white",
      ].join(" ")}
      disabled={isLoading}
    >
      {t("auth.login.staffTab", "Staff")}
    </button>

    <button
      type="button"
      onClick={() => {
        setTab("student");
        setNotice(null);
        setShowForgot(false);
      }}
      className={[
        "relative z-10 py-2.5 rounded-xl text-sm font-extrabold transition whitespace-nowrap",
        tab === "student"
          ? "text-white"
          : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white",
      ].join(" ")}
      disabled={isLoading}
    >
      {t("auth.login.studentTab", "Student")}
    </button>
  </div>
</div>

                </div>

                {notice ? (
                  <ErrorAlert type={notice.type} text={notice.text} onClose={() => setNotice(null)} />
                ) : null}

                <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6">
                  {tab === "staff" ? (
                    <>
                      <LoginForm
                        username={staffUsername}
                        password={staffPassword}
                        setUsername={setStaffUsername}
                        setPassword={setStaffPassword}
                        isLoading={isLoading}
                        onSubmit={onSubmitStaff}
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setShowForgot((v) => !v)}
                          className="text-sm font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          {t("auth.login.forgotCta", "Forgot username or password? (email will be sent)")}
                        </button>
                      </div>

                      {showForgot ? (
                        <div className="relative mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
                          {/* ❌ Close */}
                          <button
                            type="button"
                            aria-label={t("common.close", "Close")}
                            onClick={() => {
                              setShowForgot(false);
                              setForgotEmail("");
                              setNotice(null);
                            }}
                            className="absolute top-2 right-2 rounded-lg p-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:bg-slate-800 transition"
                          >
                            ✕
                          </button>

                          <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                            {t("auth.login.staffForgotTitle", "Staff Forgot Password")}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                            {t(
                              "auth.login.staffForgotSubtitle",
                              "Enter your staff email. We will send your username + password."
                            )}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className={"flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" + (isRtl ? " text-right" : " text-left")}
                              placeholder={t("auth.login.staffEmailPlaceholder", "your.email@...")}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={onStaffForgot}
                              disabled={isLoading}
                              className="rounded-xl px-4 py-2 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              {isLoading ? t("auth.login.sending", "Sending...") : t("auth.login.send", "Send")}
                            </button>
                          </div>

                          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                            {t("auth.login.spamTip", "Tip: check Spam/Junk too.")}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {studentStep === 1 ? (
                        <form onSubmit={onRequestOtp} className="space-y-3">
                          <div>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                              {t("auth.login.studentId", "Student ID")}
                            </div>
                            <input
                              value={studentId}
                              onChange={(e) => setStudentId(e.target.value)}
                              className={"w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" + (isRtl ? " text-right" : " text-left")}
                              placeholder={t("auth.login.studentIdPlaceholder", "Enter your student ID")}
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                              {t("auth.login.email", "Email")}
                            </div>
                            <input
                              value={studentEmail}
                              onChange={(e) => setStudentEmail(e.target.value)}
                              className={"w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" + (isRtl ? " text-right" : " text-left")}
                              placeholder={t("auth.login.emailPlaceholder", "Enter your email")}
                              disabled={isLoading}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-full px-6 py-3 text-white text-base font-extrabold bg-indigo-600 hover:bg-indigo-700 shadow-lg transition"
                          >
                            {isLoading ? t("auth.login.requestingOtp", "Requesting OTP...") : t("auth.login.requestOtp", "Request OTP")}
                          </button>

                          <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                            {t(
                              "auth.login.afterOtpNotice",
                              "After sending OTP, please check your Inbox and also Spam/Junk."
                            )}
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={onVerifyOtp} className="space-y-3">
                          <div>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-1">
                              {t("auth.login.otpCode", "OTP Code")}
                            </div>
                            <input
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className={"w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tracking-widest" + (isRtl ? " text-right" : " text-left")}
                              placeholder={t("auth.login.otpPlaceholder", "6 digits")}
                              disabled={isLoading}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-full px-6 py-3 text-white text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 shadow-lg transition"
                          >
                            {isLoading ? t("auth.login.verifying", "Verifying...") : t("auth.login.verifyAndLogin", "Verify & Login")}
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => {
                                setStudentStep(1);
                                setOtp("");
                                setNotice(null);
                              }}
                              className="w-full rounded-full px-6 py-2 text-sm font-extrabold bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800"
                            >
                              {t("auth.login.back", "Back")}
                            </button>

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={onRequestOtp}
                              className="w-full rounded-full px-6 py-2 text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              {t("auth.login.resendOtp", "Resend OTP")}
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </LoginCard>

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
