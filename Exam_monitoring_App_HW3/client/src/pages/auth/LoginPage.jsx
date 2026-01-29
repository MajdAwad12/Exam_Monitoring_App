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
      setErrorMsg(err?.message || "Invalid credentials. Please try again.");
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
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
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
          <LoginHeader />

          <LoginCard shake={shake}>
            {/* Tabs */}
            <div className="mb-5">
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab("staff");
                    setErrorMsg("");
                  }}
                  className={[
                    "py-2 rounded-lg text-sm font-extrabold transition",
                    tab === "staff"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900",
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
                    "py-2 rounded-lg text-sm font-extrabold transition",
                    tab === "student"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900",
                  ].join(" ")}
                  disabled={isLoading}
                >
                  Student
                </button>
              </div>
            </div>

            {errorMsg ? <ErrorAlert message={errorMsg} /> : null}

            <LoginForm
              username={tab === "staff" ? staffUsername : studentId}
              password={tab === "staff" ? staffPassword : studentPassword}
              setUsername={tab === "staff" ? setStaffUsername : setStudentId}
              setPassword={tab === "staff" ? setStaffPassword : setStudentPassword}
              isLoading={isLoading}
              onSubmit={onSubmit}
              showRegister={false}
              usernameLabel={tab === "staff" ? "Username" : "Student ID"}
              usernamePlaceholder={
                tab === "staff" ? "Enter your username" : "Enter your student ID"
              }
            />

            <div className="mt-5">
              <DemoAccountsBox
                demoUsers={tab === "staff" ? staffDemos : studentDemos}
                isLoading={isLoading}
                onFill={onFillDemo}
              />
            </div>
          </LoginCard>

          <div className="mt-4">
            <AuthFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
