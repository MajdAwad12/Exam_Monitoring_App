// server/src/mailer/mailer.js

export async function sendOtpEmail({ to, code, purpose = "otp", minutes = 10 }) {
  // ✅ Always trim env values (Render can sometimes keep hidden spaces/newlines)
  const apiKey = String(process.env.SENDGRID_API_KEY || "").trim();
  const fromEmail = String(process.env.SENDGRID_FROM || "").trim();

  // ✅ Debug: show exactly what FROM is (including hidden chars)
  console.log("[SENDGRID DEBUG] fromEmail:", JSON.stringify(fromEmail));
  console.log("[SENDGRID DEBUG] to:", JSON.stringify(String(to || "").trim()));

  // DEV MODE fallback (if env missing)
  if (!apiKey || !fromEmail) {
    console.log(`[MAIL DEV MODE] To: ${to} | Purpose: ${purpose} | OTP: ${code}`);
    return { ok: true, dev: true };
  }

  const safeTo = String(to || "").trim();

  const subject = `Your OTP code: ${code}`;
  const text =
    `Your one-time code is: ${code}\n` +
    `Purpose: ${purpose}\n` +
    `Expires in ${minutes} minutes\n\n` +
    `If you did not request this, ignore this email.`;

  const payload = {
    personalizations: [{ to: [{ email: safeTo }] }],
    from: { email: fromEmail, name: "Exam Monitoring App" },
    reply_to: { email: fromEmail },
    subject,
    content: [{ type: "text/plain", value: text }],
  };

  // ✅ Debug: what we actually send
  console.log("[SENDGRID DEBUG] payload.from:", JSON.stringify(payload.from));

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[SENDGRID ERROR]", res.status, body);
    throw new Error(body || `SendGrid failed: ${res.status}`);
  }

  console.log(`[MAIL SENT] to=${safeTo} via=sendgrid_api`);
  return { ok: true };
}
