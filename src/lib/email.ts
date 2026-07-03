/**
 * Transactional email via Gmail SMTP (nodemailer).
 *
 * Configured with a Gmail address + App Password (NOT the account password):
 *   GMAIL_USER=someone@gmail.com
 *   GMAIL_APP_PASSWORD=<16-char app password>
 *
 * `emailConfigured` reflects whether both are present — the OTP sign-in option
 * stays hidden until they are, so the app never offers a code it can't send.
 * Server-only.
 */
import nodemailer from "nodemailer";

export const emailConfigured = Boolean(
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD,
);

let transporter: nodemailer.Transporter | null = null;
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

const BRAND = "#192890";

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const from = `iVi Forum <${process.env.GMAIL_USER}>`;
  const spaced = code.split("").join(" ");
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:8px">
    <p style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#525252;margin:0 0 4px">I-Venture @ ISB · iVi Forum</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND};margin:0 0 16px">Your sign-in code</h1>
    <p style="font-size:15px;color:#1d252a;margin:0 0 20px">Enter this code to sign in to the iVi Forum. It expires in 10 minutes.</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND};background:#f4f8fa;border:1px solid #cfdbe2;border-radius:6px;padding:18px;text-align:center">${spaced}</div>
    <p style="font-size:13px;color:#525252;margin:20px 0 0">If you didn't request this, you can ignore this email — no one can sign in without the code.</p>
    <p style="font-size:12px;color:#95a9b4;margin:24px 0 0">Built by the iVi community — not an official ISB product.</p>
  </div>`;

  await getTransport().sendMail({
    from,
    to,
    subject: `${code} is your iVi Forum sign-in code`,
    text: `Your iVi Forum sign-in code is ${code}. It expires in 10 minutes.`,
    html,
  });
}
