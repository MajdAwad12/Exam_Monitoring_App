// client/src/components/auth/LoginHeader.jsx
export default function LoginHeader() {
  return (
    <div className="text-center mb-6">
      <img
        src="/exammonitoringPIC.png"
        alt="Exam Monitoring"
        className="w-14 h-14 mx-auto object-contain"
      />

      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
        Exam Monitoring
      </h1>

      <p className="mt-1 text-sm text-slate-600">
        Sign in to your account
      </p>
    </div>
  );
}
