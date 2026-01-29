// client/src/components/auth/LoginHeader.jsx
export default function LoginHeader() {
  return (
    <div className="text-center">
      {/* Brand */}
      <div className="flex items-center justify-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 backdrop-blur shadow-lg flex items-center justify-center overflow-hidden">
          <img
            src="/exammonitoringPIC.png"
            alt="Exam Monitoring"
            className="w-full h-full object-contain p-2"
          />
        </div>

        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Exam Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-semibold">
            Smart Supervision & Attendance System
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="mt-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Sign in to continue
        </h2>
        <p className="mt-1 text-sm text-white/75">
          Choose your role and access your dashboard securely.
        </p>
      </div>
    </div>
  );
}
