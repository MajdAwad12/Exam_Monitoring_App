// client/src/components/auth/LoginCard.jsx
export default function LoginCard({ shake, children }) {
  return (
    <div
      className={[
        "bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/30",
        "p-8 sm:p-10",
        shake ? "shake" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
