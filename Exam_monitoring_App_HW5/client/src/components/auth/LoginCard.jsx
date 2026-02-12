// client/src/components/auth/LoginCard.jsx
export default function LoginCard({ shake, children }) {
  return (
    <div
      className={[
        "bg-white/95 dark:bg-slate-950/70 backdrop-blur rounded-3xl shadow-2xl border border-white/30 dark:border-slate-800/60",
        "p-8 sm:p-6 sm:p-8 lg:p-10",
        shake ? "shake" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
