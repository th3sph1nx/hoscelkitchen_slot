/**
 * Email dispatcher for college OTP verification
 * Supports Resend API (free tier: 3000 emails/mo) or custom SMTP
 * Falls back to console log for testing if not configured
 */

interface SendOtpParams {
  email: string;
  rollNumber: string;
  code: string;
}

export async function sendOtpEmail({ email, rollNumber, code }: SendOtpParams): Promise<{ success: boolean; devOtp?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;

  console.log(`\n======================================================`);
  console.log(`🔑 [OTP DISPATCH] To: ${email} (Roll: ${rollNumber})`);
  console.log(`🔢 Verification Code: ${code}`);
  console.log(`⏱️  Valid for: 10 minutes`);
  console.log(`======================================================\n`);

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
          subject: `${code} is your Hostel Amenity Login OTP`,
          html: `
            <div style="font-family: monospace, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 24px; border-radius: 8px;">
              <h2 style="color: #fafafa; margin-top: 0;">NIT Puducherry Hostel Booking</h2>
              <p style="color: #a1a1aa; font-size: 14px;">Your one-time login verification code for roll number <strong>${rollNumber}</strong> is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8; padding: 16px 0;">
                ${code}
              </div>
              <p style="color: #71717a; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send email via Resend:', errorText);
      }
    } catch (err) {
      console.error('Resend email error:', err);
    }
  }

  // If no production Resend API key is provided, return devOtp to allow frictionless local/demo testing
  const isDevOrDemo = !resendApiKey;
  return {
    success: true,
    ...(isDevOrDemo ? { devOtp: code } : {}),
  };
}
