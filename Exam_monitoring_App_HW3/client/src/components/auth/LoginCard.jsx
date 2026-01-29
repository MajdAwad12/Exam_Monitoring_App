// client/src/components/auth/LoginCard.jsx
export default function LoginCard({ shake, children }) {
  return (
    <div
      className={[
        "bg-white rounded-2xl shadow-sm border border-slate-200",
        "p-6 sm:p-7",
        shake ? "shake" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
