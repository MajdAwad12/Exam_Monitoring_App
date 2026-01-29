// src/pages/auth/LoginPage.jsx
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../../services/auth.service";
import { useShake } from "../../hooks/useShake";

import LoginHeader from "../../components/auth/LoginHeader";
import LoginCard from "../../components/auth/LoginCard";
import ErrorAlert from "../../components/auth/ErrorAlert";
import LoginForm from "../../components/auth/LoginForm";
import DemoAccountsBox from "../../components/auth/DemoAccountsBox";
import SupportBox from "../../components/auth/SupportBox";
import AuthFooter from "../../components/auth/AuthFooter";

export default function LoginPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("staff"); // "staff" | "student"

  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  const [studentId, setStudentId] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    () => [{ label: "Student", u: "std_3190010491096", p: "1234" }],
    []
  );

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    const u =
      tab === "staff"
        ? staffUsername.trim().toLowerCase()
        : studentId.trim().toLowerCase();

    const p = tab === "staff" ? staffPassword.trim() : studentPassword.trim();

    if (!u || !p) {
      setErrorMsg(
        tab === "staff"
          ? "Please enter username and password."
          : "Please enter Student ID and password."
      );
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);
      const user = await loginUser({ username: u, password: p });

      if (user?.role === "student") navigate("/app/student", { replace: true });
      else navigate("/app/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err?.message || "Invalid username or password. Please try again.";
      setErrorMsg(msg);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }

  function onFillDemo(d) {
    setErrorMsg("");
    if (tab === "staff") {
      setStaffUsername(d.u);
      setStaffPassword(d.p);
    } else {
      setStudentId(d.u);
      setStudentPassword(d.p);
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
                    Exam Monitoring System
                  </h1>
                  <p className="text-white/80 text-sm font-semibold">
                    Real-time supervision • Seat map • Reports • Incidents
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">What you can do here</p>
                  <ul className="mt-2 space-y-2 text-sm text-white/85">
                    <li className="flex gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>Track attendance & seat status in real time</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>Manage transfers, toilet exits & incidents</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">✅</span>
                      <span>Generate clear reports and student history</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
                  <p className="font-bold">Quick tips</p>
                  <ul className="mt-2 space-y-2 text-sm text-white/85">
                    <li className="flex gap-2">
                      <span className="mt-0.5">🔒</span>
                      <span>Your session is protected and role-based.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">⚡</span>
                      <span>
                        Use the <b>Demo Accounts</b> for fast testing.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5">🧭</span>
                      <span>
                        Staff goes to <b>Dashboard</b>, Students to{" "}
                        <b>Student Page</b>.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                    🛰 Live Updates
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                    🗺 Seat Map
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
                    📄 Reports
                  </span>
                </div>

                <div className="pt-2 text-sm text-white/80">
                  Don’t have an account?{" "}
                  <Link
                    to="/register"
                    className="font-extrabold text-white underline underline-offset-4 hover:opacity-90"
                  >
                    Create one (Staff)
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT: Login Card */}
            <div className="flex flex-col justify-center">
              <div className="mb-4 lg:mb-5">
                <LoginHeader />
              </div>

              <LoginCard shake={shake}>
                {/* Tabs */}
                <div className="mb-5">
                  <div className="rounded-2xl bg-white/85 border border-white/40 p-1 shadow-sm">
                    <div className="grid grid-cols-2 relative">
                      <div
                        className={[
                          "absolute top-0 left-0 h-full w-1/2 rounded-xl bg-indigo-600 shadow transition-transform duration-300",
                          tab === "student"
                            ? "translate-x-full"
                            : "translate-x-0",
                        ].join(" ")}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTab("staff");
                          setErrorMsg("");
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
                          setErrorMsg("");
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

                  <div className="mt-3 text-center text-xs font-semibold text-white/85">
                    {tab === "staff"
                      ? "Login as Supervisor / Lecturer / Admin"
                      : "Login as Student using your Student ID"}
                  </div>
                </div>

                {errorMsg ? <ErrorAlert message={errorMsg} /> : null}

                {/* Form container */}
                <div className="rounded-2xl bg-white border border-slate-200 p-5">
                  {tab === "staff" ? (
                    <>
                      <LoginForm
                        username={staffUsername}
                        password={staffPassword}
                        setUsername={setStaffUsername}
                        setPassword={setStaffPassword}
                        isLoading={isLoading}
                        onSubmit={onSubmit}
                        showRegister={false}
                        usernameLabel="Username"
                        usernamePlaceholder="Enter your username"
                      />

                      <div className="mt-5">
                        <DemoAccountsBox
                          demoUsers={staffDemos}
                          isLoading={isLoading}
                          onFill={onFillDemo}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <LoginForm
                        username={studentId}
                        password={studentPassword}
                        setUsername={setStudentId}
                        setPassword={setStudentPassword}
                        isLoading={isLoading}
                        onSubmit={onSubmit}
                        showRegister={false}
                        usernameLabel="Student ID"
                        usernamePlaceholder="Enter your student ID"
                      />

                      <div className="mt-5">
                        <DemoAccountsBox
                          demoUsers={studentDemos}
                          isLoading={isLoading}
                          onFill={onFillDemo}
                        />
                      </div>
                    </>
                  )}

                  <div className="mt-4 text-center text-xs text-slate-500">
                    By signing in, you agree to use this system for academic
                    exam supervision purposes.
                  </div>
                </div>

                <div className="mt-5">
                  <SupportBox />
                </div>
              </LoginCard>

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
