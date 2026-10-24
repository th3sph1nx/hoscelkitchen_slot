/**
 * Email dispatcher for college OTP verification
 * Supports Gmail SMTP (Nodemailer), Resend API, or local dev bypass
 */

import nodemailer from 'nodemailer';

interface SendOtpParams {
  email: string;
  rollNumber: string;
  code: string;
}

export async function sendOtpEmail({
  email,
  rollNumber,
  code,
}: SendOtpParams): Promise<{ success: boolean; devOtp?: string; sentVia?: string; error?: string }> {
  const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_PASS || '')
    .trim()
    .replace(/\s+/g, '');
  const resendApiKey = process.env.RESEND_API_KEY;

  console.log(`\n======================================================`);
  console.log(`🔑 [OTP DISPATCH] To: ${email} (Roll: ${rollNumber})`);
  console.log(`🔢 Verification Code: ${code}`);
  console.log(`⏱️  Valid for: 10 minutes`);
  console.log(`======================================================\n`);

  // 1. Prioritize Gmail SMTP
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"Ganga Hostel Amenities" <${gmailUser}>`,
        to: email,
        subject: `${code} is your Ganga Hostel Amenities Login Code`,
        text: `Your one-time login verification code for NIT Puducherry Ganga Hostel Amenities (Roll: ${rollNumber}) is: ${code}\n\nValid for 10 minutes.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 32px 24px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #27272a;">
            <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
              <span style="font-weight: 800; font-size: 16px; letter-spacing: 1px; color: #f4f4f5;">GANGA AMENITIES</span>
              <p style="margin: 4px 0 0; color: #71717a; font-size: 12px;">NIT Puducherry • Kitchen &amp; TV Room Portal</p>
            </div>
            
            <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px;">
              Hello student (<strong style="color: #fafafa;">${rollNumber}</strong>),
            </p>
            <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 20px;">
              Here is your one-time verification passcode to access the booking system:
            </p>
            
            <div style="background-color: #18181b; border: 1px solid #3f3f46; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">
                ${code}
              </span>
            </div>
            
            <p style="color: #71717a; font-size: 12px; margin: 0; line-height: 1.5;">
              ⏱️ This code will expire in <strong>10 minutes</strong>.<br>
              If you did not request this login, please ignore this email.
            </p>
          </div>
        `,
      });

      console.log(`[Gmail SMTP] Dispatched to ${email}, messageId: ${info.messageId}`);
      return { success: true, sentVia: 'gmail-smtp' };
    } catch (err: any) {
      console.error('[Gmail SMTP] Failed to send email:', err.message);
      return { success: false, devOtp: code, error: err.message };
    }
  }

  // 2. Resend API (if configured)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'NITPy Hostel <onboarding@resend.dev>',
          to: [email],
          subject: `${code} is your Ganga Hostel Login Code`,
          html: `<div style="padding: 20px; font-family: monospace;">Your code is: <strong>${code}</strong></div>`,
        }),
      });

      if (response.ok) {
        return { success: true, sentVia: 'resend' };
      }
    } catch (err) {}
  }

  // 3. Fallback dev mode
  return {
    success: true,
    devOtp: code,
    sentVia: 'local-dispatch',
  };
}
