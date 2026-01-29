// src/pages/auth/LoginPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-sky-600 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <LoginHeader />

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

        <LoginCard shake={shake}>
          {/* ✅ Premium Segmented Tabs */}
          <div className="mb-6">
            <div className="rounded-2xl bg-white/80 border border-white/40 p-1 shadow-sm">
              <div className="grid grid-cols-2 relative">
                {/* Active pill */}
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
                    setErrorMsg("");
                  }}
                  className={[
                    "relative z-10 py-2.5 rounded-xl text-sm font-extrabold transition",
                    tab === "staff" ? "text-white" : "text-slate-700 hover:text-slate-900",
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
                    tab === "student" ? "text-white" : "text-slate-700 hover:text-slate-900",
                  ].join(" ")}
                  disabled={isLoading}
                >
                  Student
                </button>
              </div>
            </div>

            {/* Card-like header that clearly changes */}
            <div className="mt-4 rounded-2xl bg-white/10 border border-white/20 p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <span className="text-xl">
                    {tab === "staff" ? "🧑‍🏫" : "🎓"}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-white font-extrabold text-lg leading-tight">
                    {tab === "staff" ? "Staff Portal Login" : "Student Portal Login"}
                  </h2>
                  <p className="text-white/85 text-xs mt-1">
                    {tab === "staff"
                      ? "For Admin, Supervisors and Lecturers."
                      : "Student access with separate flow (ID-based)."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {errorMsg ? <ErrorAlert message={errorMsg} /> : null}

          {/* ✅ Clear “card switch” feel */}
          <div
            className={[
              "rounded-2xl bg-white/95 backdrop-blur border border-white/60 p-5 transition-all duration-300",
              tab === "staff" ? "animate-[fadeIn_.25s_ease-out]" : "animate-[fadeIn_.25s_ease-out]",
            ].join(" ")}
          >
            {tab === "staff" ? (
              <>
                <LoginForm
                  username={staffUsername}
                  password={staffPassword}
                  setUsername={setStaffUsername}
                  setPassword={setStaffPassword}
                  isLoading={isLoading}
                  onSubmit={onSubmit}
                  showRegister={false}   // ✅ removed
                  usernameLabel="Username"
                  usernamePlaceholder="Enter your staff username"
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
                  showRegister={false}   // ✅ removed
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
          </div>

          <div className="mt-5">
            <SupportBox />
          </div>

          {/* ✅ tiny keyframes without adding files */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </LoginCard>

        <AuthFooter />
      </div>
    </div>
  );
}
