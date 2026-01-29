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

  // ✅ Tabs
  const [tab, setTab] = useState("staff"); // "staff" | "student"

  // ✅ Separate state per tab (clean UX)
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
      setErrorMsg(tab === "staff" ? "Please enter username and password." : "Please enter Student ID and password.");
      triggerShake();
      return;
    }

    try {
      setIsLoading(true);

      const user = await loginUser({ username: u, password: p });

      // ✅ correct landing
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

  function onGoRegister() {
    navigate("/register");
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

        <LoginCard shake={shake}>
          {/* ✅ Tabs */}
          <div className="mb-5">
            <div className="grid grid-cols-2 rounded-xl bg-white/70 p-1 border border-white/40">
              <button
                type="button"
                onClick={() => {
                  setTab("staff");
                  setErrorMsg("");
                }}
                className={[
                  "py-2 rounded-lg text-sm font-extrabold transition",
                  tab === "staff"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-700 hover:bg-white/60",
                ].join(" ")}
                disabled={isLoading}
              >
                Admin / Supervisor / Lecturer
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("student");
                  setErrorMsg("");
                }}
                className={[
                  "py-2 rounded-lg text-sm font-extrabold transition",
                  tab === "student"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-700 hover:bg-white/60",
                ].join(" ")}
                disabled={isLoading}
              >
                Student
              </button>
            </div>

            <p className="mt-3 text-xs text-white/90">
              {tab === "staff"
                ? "Staff login for Admin, Supervisors, and Lecturers."
                : "Student login portal (separate flow)."}
            </p>
          </div>

          {errorMsg ? <ErrorAlert message={errorMsg} /> : null}

          {tab === "staff" ? (
            <>
              <LoginForm
                username={staffUsername}
                password={staffPassword}
                setUsername={setStaffUsername}
                setPassword={setStaffPassword}
                isLoading={isLoading}
                onSubmit={onSubmit}
                onGoRegister={onGoRegister}
                showRegister={true}
                usernameLabel="Username"
                usernamePlaceholder="Enter your staff username"
              />

              <DemoAccountsBox demoUsers={staffDemos} isLoading={isLoading} onFill={onFillDemo} />
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
                onGoRegister={onGoRegister}
                showRegister={false} // ✅ no register on student tab
                usernameLabel="Student ID"
                usernamePlaceholder="Enter your student ID"
              />

              <DemoAccountsBox demoUsers={studentDemos} isLoading={isLoading} onFill={onFillDemo} />
            </>
          )}

          <SupportBox />
        </LoginCard>

        <AuthFooter />
      </div>
    </div>
  );
}
