//server/src/mailer/mailer.js
// server/src/services/mailer.js
import nodemailer from "nodemailer";

let _transporter = null;

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587
    auth: { user, pass },
  });
}

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = buildTransporter();
  return _transporter;
}

function purposeTitle(purpose) {
  if (purpose === "student_login") return "Student Login Verification Code";
  if (purpose === "reset_password") return "Password Reset Verification Code";
  return "Verification Code";
}

export async function sendOtpEmail({ to, code, purpose = "student_login", minutes = 10 }) {
  const transporter = getTransporter();

  // ✅ Dev-safe mode: if SMTP not configured, don't crash server
  if (!transporter) {
    console.log(`[MAIL DEV MODE] To: ${to} | Purpose: ${purpose} | OTP: ${code}`);
    return { ok: true, devMode: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const title = purposeTitle(purpose);
  const subject = `${title} - ${code}`;

  const text = [
    `${title}`,
    ``,
    `Your one-time code is: ${code}`,
    `This code expires in ${minutes} minutes.`,
    ``,
    `If you did not request this, you can ignore this email.`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 12px 0">${title}</h2>
      <p style="margin:0 0 8px 0">Your one-time code is:</p>
      <div style="display:inline-block;padding:10px 16px;border:1px solid #ddd;border-radius:10px;font-size:22px;letter-spacing:2px;font-weight:700">
        ${code}
      </div>
      <p style="margin:12px 0 0 0">This code expires in <b>${minutes} minutes</b>.</p>
      <p style="margin:12px 0 0 0;color:#666">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return { ok: true, devMode: false };
}
