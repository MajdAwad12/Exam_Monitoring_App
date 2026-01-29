// server/src/mailer/mailer.js
import nodemailer from "nodemailer";

function isTrue(v) {
  return String(v || "").toLowerCase() === "true";
}

let _cachedTransport = null;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // If missing -> DEV MODE
  if (!host || !port || !user || !pass) return null;

  // ✅ For SendGrid on 587: secure MUST be false, use STARTTLS
  const secure = isTrue(process.env.SMTP_SECURE); // should be false for 587

  if (_cachedTransport) return _cachedTransport;

  _cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure, // false for 587
    auth: { user, pass },

    // ✅ Important: STARTTLS settings (helps on some providers)
    requireTLS: port === 587, // force TLS upgrade on 587
    tls: {
      // do not fail on invalid certs (safe for SMTP providers)
      rejectUnauthorized: true,
      servername: host,
    },

    // ✅ avoid hanging forever
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  return _cachedTransport;
}

export async function sendOtpEmail({ to, code, purpose = "otp", minutes = 10 }) {
  const from = process.env.SMTP_FROM || "Exam Monitoring App <no-reply@example.com>";
  const transport = getTransport();

  // DEV MODE fallback
  if (!transport) {
    console.log(`[MAIL DEV MODE] To: ${to} | Purpose: ${purpose} | OTP: ${code}`);
    return { ok: true, dev: true };
  }

  const subject = `Your OTP code: ${code}`;
  const text =
    `Your one-time code is: ${code}\n` +
    `Purpose: ${purpose}\n` +
    `Expires in: ${minutes} minutes\n\n` +
    `If you did not request this, ignore this email.`;

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text,
    });

    console.log(`[MAIL SENT] to=${to} messageId=${info?.messageId || "n/a"}`);
    return { ok: true };
  } catch (err) {
    console.error("[MAIL ERROR]", err);
    throw err;
  }
}
