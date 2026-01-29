// client/src/components/homepage/Footer.jsx
export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/system_logo.png"
                alt="Exam Monitoring"
                className="w-12 h-12 rounded-2xl border border-slate-200 bg-white object-contain"
              />
              <div>
                <div className="text-lg font-extrabold text-slate-900 leading-tight">
                  Exam Monitoring App
                </div>
                <div className="text-xs text-slate-500">
                  Real-time supervision • Attendance • Integrity
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-600 max-w-sm">
              A modern platform for exam supervision, attendance tracking, and incident reporting
              with a clean production-style UI.
            </p>
          </div>

          {/* Helpdesk */}
          <div>
            <div className="text-sm font-extrabold text-slate-900">Help Desk</div>

            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>📧</span>
                <a className="hover:underline" href="mailto:helpdesk@exam-monitoring.com">
                  helpdesk@exam-monitoring.com
                </a>
              </div>

              <div className="flex items-center gap-2">
                <span>☎</span>
                <a className="hover:underline" href="tel:+97231234567">
                  +972-3-123-4567
                </a>
              </div>

              <div className="text-xs text-slate-500 pt-2">
                For any issue or support request, contact us anytime.
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="text-sm font-extrabold text-slate-900">Social</div>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm font-bold text-slate-700"
                aria-label="Facebook"
              >
                📘 Facebook
              </a>

              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm font-bold text-slate-700"
                aria-label="Instagram"
              >
                📷 Instagram
              </a>

              <a
                href="mailto:helpdesk@exam-monitoring.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition text-sm font-bold text-slate-700"
                aria-label="Gmail"
              >
                ✉ Gmail
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} Exam Monitoring App. All rights reserved.
          </div>

          <div className="text-xs text-slate-500">
            Built for academic integrity & real-time supervision.
          </div>
        </div>
      </div>
    </footer>
  );
}
