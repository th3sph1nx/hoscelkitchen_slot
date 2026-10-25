import { NextRequest, NextResponse } from 'next/server';
import { validateRollNumber, generateAndSendOtp } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { rollNumber } = await req.json();
    const validation = validateRollNumber(rollNumber || '');
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { roll, email } = validation;

    // Dispatch 6-digit OTP passcode via Gmail SMTP
    const dispatchResult = await generateAndSendOtp(roll);

    const res = NextResponse.json({
      success: true,
      email,
      ticket: dispatchResult.ticket,
      note: 'Verification passcode dispatched to your college email.',
    });

    // Set signed cookie for ticket
    res.cookies.set('ganga_otp_ticket', dispatchResult.ticket, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send verification code' }, { status: 400 });
  }
}
