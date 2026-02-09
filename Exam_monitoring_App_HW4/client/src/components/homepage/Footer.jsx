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
            <li className="flex items-center gap-2">
              <a
                href="mailto:helpdesk@exam-monitoring.com"
                className="hover:underline"
              >
                helpdesk@exam-monitoring.com
              </a>
            </li>

            <li className="flex items-center gap-2">
              <span className="text-base">☎</span>
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

          <div className="flex flex-col gap-3 text-sm">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <img
                src="/instgramICON.jpg"
                alt="Instagram"
                className="w-5 h-5 object-contain"
                draggable={false}
              />
              Instagram
            </a>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <img
                src="/facebookICON.jpg"
                alt="Facebook"
                className="w-5 h-5 object-contain"
                draggable={false}
              />
              Facebook
            </a>

            <a
              href="mailto:helpdesk@exam-monitoring.com"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <img
                src="/gmailICON.png"
                alt="Gmail"
                className="w-5 h-5 object-contain"
                draggable={false}
              />
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
