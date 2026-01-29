export async function sendOtpEmail({ to, code, purpose = "otp", minutes = 10 }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM;

  if (!apiKey || !fromEmail) {
    console.log(`[MAIL DEV MODE] OTP: ${code}`);
    return;
  }

  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: "Exam Monitoring App" },
    subject: `Your OTP code: ${code}`,
    content: [
      {
        type: "text/plain",
        value:
          `Your one-time code is: ${code}\n` +
          `Expires in 10 minutes\n\n` +
          `If you did not request this, ignore this email.`,
      },
    ],
  };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  console.log(`[MAIL SENT] to=${to} via sendgrid_api`);
}
