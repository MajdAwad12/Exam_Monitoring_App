// client/src/components/auth/LoginCard.jsx
export default function LoginCard({ shake, children }) {
  return (
    <div
      className={[
        "bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-white/30",
        "p-7 sm:p-9",
        shake ? "shake" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
