// client/src/pages/auth/LoginPage.jsx
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
      const msg = err?.message || "Invalid username or password. Please try again.";
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-sky-700 to-cyan-500 relative overflow-hidden">
      {/* soft background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />

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
        {/* wider layout on desktop */}
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* LEFT: simple text (desktop only) */}
            <div className="hidden lg:block">
              <div className="max-w-md">
                <h1 className="text-white text-4xl font-extrabold tracking-tight">
                  Login Page
                </h1>
                <p className="text-indigo-100 mt-3 leading-relaxed">
                  Access the system using your role. The platform provides real-time
                  exam monitoring, attendance tracking, and supervisor tools in one place.
                </p>

                <div className="mt-6 rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6">
                  <p className="text-white font-bold mb-2">What you can do after login</p>
                  <ul className="text-indigo-100 text-sm space-y-1">
                    <li>• Monitor attendance in real time</li>
                    <li>• Manage incidents and actions</li>
                    <li>• View reports and history</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* RIGHT: the actual login box */}
            <div className="w-full max-w-xl mx-auto">
              {/* small page title (mobile/tablet) */}
              <div className="lg:hidden text-center mb-4">
                <h1 className="text-white text-3xl font-extrabold tracking-tight">
                  Login Page
                </h1>
              </div>

              <LoginHeader />

              <LoginCard shake={shake}>
                {/* tabs - clearer active */}
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
                </div>

                {errorMsg ? <ErrorAlert message={errorMsg} /> : null}

                <div className="rounded-2xl bg-white border border-slate-200 p-6">
                  {tab === "staff" ? (
                    <>
                      <LoginForm
                        username={staffUsername}
                        password={staffPassword}
                        setUsername={setStaffUsername}
                        setPassword={setStaffPassword}
                        isLoading={isLoading}
                        onSubmit={onSubmit}
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
