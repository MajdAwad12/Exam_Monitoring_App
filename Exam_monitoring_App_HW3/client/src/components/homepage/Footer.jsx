// client/src/components/homepage/Footer.jsx
export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-extrabold text-white">
              Exam Monitoring App
            </h3>
          </div>

          <p className="text-sm text-slate-400 max-w-xs">
            A smart web platform for real-time exam supervision, attendance tracking,
            and academic integrity management.
          </p>
        </div>

        {/* Helpdesk */}
        <div>
          <h4 className="text-white font-semibold mb-4">Help Desk</h4>
          <ul className="space-y-2 text-sm">
            <li>
              📧{" "}
              <a
                href="mailto:helpdesk@exam-monitoring.com"
                className="hover:underline"
              >
                helpdesk@exam-monitoring.com
              </a>
            </li>
            <li>
              ☎{" "}
              <a href="tel:+97231234567" className="hover:underline">
                +972-3-123-4567
              </a>
            </li>
            <li className="text-slate-400 text-xs pt-2">
              For any defect, issue, or support request — contact us anytime.
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="text-white font-semibold mb-4">Social</h4>
          <div className="flex flex-col gap-2 text-sm">
            <a href="#" className="hover:underline">Instagram</a>
            <a href="#" className="hover:underline">Facebook</a>
            <a href="mailto:helpdesk@exam-monitoring.com" className="hover:underline">
              Gmail
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 text-center text-xs text-slate-500 py-4">
        © {new Date().getFullYear()} Exam Monitoring App. All rights reserved.
      </div>
    </footer>
  );
}
