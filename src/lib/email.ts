/*
 * Email Utilities
 * Sends transactional emails via Resend
 */

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || 'Octonix Training <noreply@octonix.local>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Email send failed: ${details}`);
  }
}
