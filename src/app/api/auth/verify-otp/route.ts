import { NextRequest, NextResponse } from 'next/server';
import { validateRollNumber, verifyOtp } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { checkVerifyOtpAttempts, recordFailedOtpAttempt, clearFailedOtpAttempts } from '@/lib/rateLimit';
import { ADMIN_ROLL } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rollNumber, code, ticket: bodyTicket } = body;
    if (!rollNumber || !code) {
      return NextResponse.json({ error: 'Roll number and verification code are required' }, { status: 400 });
    }

    const validation = validateRollNumber(rollNumber);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { roll, email } = validation;

    // Check brute-force lockout status
    const attemptCheck = checkVerifyOtpAttempts(roll);
    if (!attemptCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. For security, verification is locked for 10 minutes. Please request a new code.' },
        { status: 429 }
      );
    }

    const token = String(code).trim();
    const cookieTicket = req.cookies.get('ganga_otp_ticket')?.value;
    const ticket = bodyTicket || cookieTicket;

    const verified = await verifyOtp(roll, token, ticket);
    if (!verified) {
      const fail = recordFailedOtpAttempt(roll);
      if (fail.isLocked) {
        return NextResponse.json(
          { error: 'Maximum verification attempts exceeded. Verification locked for 10 minutes. Please request a new code.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Invalid verification code. ${fail.remainingAttempts} attempt(s) remaining.` },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful verification
    clearFailedOtpAttempts(roll);

    // Determine admin status
    const isAdmin = roll.toUpperCase() === ADMIN_ROLL;

    // Issue cryptographically signed session token
    const sessionToken = createSessionToken({ roll, email, isAdmin });

    const res = NextResponse.json({
      success: true,
      rollNumber: roll,
      email,
      isAdmin,
    });

    // Set HttpOnly session cookie (inaccessible to browser JS, sent automatically with API requests)
    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Clear one-time ticket cookie
    res.cookies.delete('ganga_otp_ticket');
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OTP verification failed' }, { status: 400 });
  }
}
