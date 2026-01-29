// client/src/pages/auth/LoginPage.jsx
import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("staff"); // "staff" | "student"

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
      showNotice("warning", "Please enter username and password.");
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      const user = await loginUser({ username: u, password: p });
      if (user?.role === "student") navigate("/app/student", { replace: true });
      else navigate("/app/dashboard", { replace: true });
    } catch (err) {
      showNotice("error", err?.message || "Login failed.");
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
      showNotice("warning", "Please enter Student ID and Email.");
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      const r = await requestStudentOtp({ email: em, studentId: id });

      setStudentStep(2);
      showNotice(
        "success",
        (r?.message || "OTP sent.") + " ✅ Please check your Inbox and also Spam/Junk.",
        { autoHideMs: 12000 }
      );
    } catch (err) {
      showNotice("error", err?.message || "Failed to send OTP.");
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
      showNotice("warning", "Please enter OTP code.");
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      await verifyStudentOtp({ email: em, studentId: id, otp: code });

      showNotice("success", "OTP verified. Logging you in…", { autoHideMs: 2500 });
      navigate("/app/student", { replace: true });
    } catch (err) {
      showNotice("error", err?.message || "Invalid OTP.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  async function onStaffForgot() {
    setNotice(null);

    const em = forgotEmail.trim().toLowerCase();
    if (!em) {
      showNotice("warning", "Please enter your staff email.");
      return;
    }

    try {
      setIsLoading(true);
      const r = await staffForgotPassword(em);

      // show it as success even if email not found (server returns generic)
      showNotice(
        "success",
        r?.message || "If this email exists, we sent your login details.",
        { autoHideMs: 12000 }
      );
    } catch (err) {
      showNotice("error", err?.message || "Failed to send email.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-sky-700 to-cyan-500 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />

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
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="hidden lg:block">
              <div className="max-w-md">
                <h1 className="text-white text-4xl font-extrabold tracking-tight">
                  Login Page
                </h1>
                <p className="text-indigo-100 mt-3 leading-relaxed">
                  Staff: username + password. Students: Student ID + Email + OTP.
                </p>

                <div className="mt-6 rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6">
                  <p className="text-white font-bold mb-2">Tip</p>
                  <p className="text-indigo-100 text-sm">
                    OTP emails may arrive in Spam/Junk. Move it to Inbox once.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-xl mx-auto">
              <div className="lg:hidden text-center mb-4">
                <h1 className="text-white text-3xl font-extrabold tracking-tight">
                  Login Page
                </h1>
              </div>

              <LoginHeader />

              <LoginCard shake={shake}>
                <div className="mb-5">
                  <div className="rounded-2xl bg-white/90 border border-white/40 p-1 shadow-sm">
                    <div className="grid grid-cols-2 relative">
                      <div
                        className={[
                          "absolute top-0 left-0 h-full w-1/2 rounded-xl bg-indigo-600 shadow transition-transform duration-300",
                          tab === "student" ? "translate-x-full" : "translate-x-0",
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
                          "relative z-10 py-2.5 rounded-xl text-sm font-extrabold transition",
                          tab === "staff"
                            ? "text-white"
                            : "text-slate-700 hover:text-slate-900",
                        ].join(" ")}
                        disabled={isLoading}
                      >
                        Staff
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTab("student");
                          setNotice(null);
                          setShowForgot(false);
                        }}
                        className={[
                          "relative z-10 py-2.5 rounded-xl text-sm font-extrabold transition",
                          tab === "student"
                            ? "text-white"
                            : "text-slate-700 hover:text-slate-900",
                        ].join(" ")}
                        disabled={isLoading}
                      >
                        Student
                      </button>
                    </div>
                  </div>
                </div>

                {notice ? (
                  <ErrorAlert
                    type={notice.type}
                    text={notice.text}
                    onClose={() => setNotice(null)}
                  />
                ) : null}

                <div className="rounded-2xl bg-white border border-slate-200 p-6">
                  {tab === "staff" ? (
                    <>
                      <LoginForm
                        username={staffUsername}
                        password={staffPassword}
                        setUsername={setStaffUsername}
                        setPassword={setStaffPassword}
                        isLoading={isLoading}
                        onSubmit={onSubmitStaff}
                        usernameLabel="Username"
                        usernamePlaceholder="Enter your username"
                      />

                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => setShowForgot((v) => !v)}
                          className="text-sm font-bold text-indigo-700 hover:text-indigo-900"
                        >
                          Forgot password?
                        </button>

                        <span className="text-xs text-slate-500">(email will be sent)</span>
                      </div>

                      {showForgot ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm font-extrabold text-slate-800">
                            Staff Forgot Password
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            Enter your staff email. We will send your username + password.
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                              placeholder="your.email@..."
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={onStaffForgot}
                              disabled={isLoading}
                              className="rounded-xl px-4 py-2 text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              {isLoading ? "Sending..." : "Send"}
                            </button>
                          </div>

                          {/* Professional hint always visible */}
                          <div className="mt-3 text-xs text-slate-600">
                            Tip: check <span className="font-extrabold">Spam/Junk</span> too.
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {studentStep === 1 ? (
                        <form onSubmit={onRequestOtp} className="space-y-3">
                          <div>
                            <div className="text-sm font-extrabold text-slate-800 mb-1">
                              Student ID
                            </div>
                            <input
                              value={studentId}
                              onChange={(e) => setStudentId(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Enter your student ID"
                              disabled={isLoading}
                            />
                          </div>

                          <div>
                            <div className="text-sm font-extrabold text-slate-800 mb-1">
                              Email
                            </div>
                            <input
                              value={studentEmail}
                              onChange={(e) => setStudentEmail(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Enter your email"
                              disabled={isLoading}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-full px-6 py-3 text-white text-base font-extrabold
                                       bg-indigo-600 hover:bg-indigo-700 shadow-lg transition"
                          >
                            {isLoading ? "Sending..." : "Send OTP"}
                          </button>

                          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                            ✅ After sending OTP, please check your Inbox and also{" "}
                            <span className="font-extrabold">Spam/Junk</span>.
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={onVerifyOtp} className="space-y-3">
                          <div>
                            <div className="text-sm font-extrabold text-slate-800 mb-1">
                              OTP Code
                            </div>
                            <input
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tracking-widest"
                              placeholder="6 digits"
                              disabled={isLoading}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-full px-6 py-3 text-white text-base font-extrabold
                                       bg-emerald-600 hover:bg-emerald-700 shadow-lg transition"
                          >
                            {isLoading ? "Verifying..." : "Verify & Login"}
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
                              className="w-full rounded-full px-6 py-2 text-sm font-extrabold
                                         bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                            >
                              Back
                            </button>

                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={onRequestOtp}
                              className="w-full rounded-full px-6 py-2 text-sm font-extrabold
                                         bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              Resend OTP
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
