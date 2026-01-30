// client/src/components/auth/RegisterHeader.jsx
export default function RegisterHeader() {
  return (
    <div className="text-center mb-7">
      <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 overflow-hidden">
        <img
          src="/exammonitoringPIC.png"
          alt="Exam Monitoring"
          className="w-14 h-14 object-contain"
        />
      </div>

      <h2 className="text-2xl font-extrabold text-white tracking-tight">
        Exam Monitoring APP
      </h2>

      <p className="text-sm text-indigo-100 mt-2">
        Create a new account – Supervisor / Lecturer
      </p>
    </div>
  );
}
