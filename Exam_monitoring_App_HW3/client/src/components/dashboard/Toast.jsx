import { useEffect } from "react";

/**
 * Small auto-dismiss toast for dashboard events
 *
 * props:
 * - show: boolean
 * - message: string
 * - duration: number (ms), default 2500
 * - onClose: function
 */
export default function Toast({
  show,
  message = "New event received",
  duration = 2500,
  onClose,
}) {
  useEffect(() => {
    if (!show) return;

    const t = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => clearTimeout(t);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-600 text-white px-4 py-3 shadow-lg animate-fade-in">
        <span className="text-lg">☁️</span>
        <div className="text-sm font-extrabold">
          {message}
        </div>
      </div>
    </div>
  );
}
