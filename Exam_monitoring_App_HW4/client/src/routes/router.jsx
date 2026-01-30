// client/src/routes/router.jsx
import { createBrowserRouter, Navigate, useOutletContext } from "react-router-dom";

import AppLayout from "../components/layout/AppLayout.jsx";

import HomePage from "../pages/homepage/HomePage.jsx";

import LoginPage from "../pages/auth/LoginPage.jsx";
import RegisterPage from "../pages/auth/RegisterPage.jsx";

import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import ExamsPage from "../pages/exams/ExamsPage.jsx";
import ReportsPage from "../pages/reports/ReportsPage.jsx";
import ManageExamsPage from "../pages/admin/ManageExamsPage.jsx";

import StudentMyExamReportPage from "../pages/student/StudentMyExamReportPage.jsx";

import RoleGate from "./RoleGate.jsx";
import RouteError from "./RouteError.jsx";

/** ✅ Smart fallback inside /app */
function AppFallback() {
  const ctx = useOutletContext() || {};
  const me = ctx.me;

  if (!me) return <Navigate to="/login" replace />;

  if (me.role === "student") return <Navigate to="/app/student" replace />;

  return <Navigate to="/app/dashboard" replace />;
}

const router = createBrowserRouter([
  // ✅ NEW: Home page as the first entry point
  { path: "/", element: <HomePage /> },

  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },

  {
    path: "/app",
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <AppFallback /> },

      {
        path: "dashboard",
        element: (
          <RoleGate allow={["supervisor", "lecturer", "admin"]}>
            <DashboardPage />
          </RoleGate>
        ),
      },

      {
        path: "exams",
        element: (
          <RoleGate allow={["supervisor", "lecturer", "admin"]}>
            <ExamsPage />
          </RoleGate>
        ),
      },

      {
        path: "reports",
        element: (
          <RoleGate allow={["lecturer", "admin"]}>
            <ReportsPage />
          </RoleGate>
        ),
      },

      {
        path: "manage-exams",
        element: (
          <RoleGate allow={["admin"]}>
            <ManageExamsPage />
          </RoleGate>
        ),
      },

      {
        path: "student",
        element: (
          <RoleGate allow={["student"]} fallback="/app/student">
            <StudentMyExamReportPage />
          </RoleGate>
        ),
      },

      { path: "*", element: <AppFallback /> },
    ],
  },

  // ✅ IMPORTANT: global fallback now goes to Home (not login)
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default router;
