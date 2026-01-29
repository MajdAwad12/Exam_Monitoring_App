// server/src/mailer/mailer.js
export async function sendOtpEmail({ to, code, purpose = "otp", minutes = 10 }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM || "no-reply@example.com";

  // DEV MODE fallback
  if (!apiKey) {
    console.log(`[MAIL DEV MODE] To: ${to} | Purpose: ${purpose} | OTP: ${code}`);
    return { ok: true, dev: true };
  }

  const subject = `Your OTP code: ${code}`;
  const text =
    `Your one-time code is: ${code}\n` +
    `Purpose: ${purpose}\n` +
    `Expires in: ${minutes} minutes\n\n` +
    `If you did not request this, ignore this email.`;

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: "Exam Monitoring App" },
    subject,
    content: [{ type: "text/plain", value: text }],
  };

  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    console.error("[SENDGRID ERROR]", resp.status, body);
    throw new Error(`SendGrid failed: ${resp.status}`);
  }

  console.log(`[MAIL SENT] to=${to} via=sendgrid_api`);
  return { ok: true };
}
