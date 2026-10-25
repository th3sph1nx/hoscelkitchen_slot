import { NextRequest, NextResponse } from 'next/server';
import { validateRollNumber, verifyOtp } from '@/lib/db';

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
    const token = String(code).trim();
    const cookieTicket = req.cookies.get('ganga_otp_ticket')?.value;
    const ticket = bodyTicket || cookieTicket;

    const verified = await verifyOtp(roll, token, ticket);
    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please check your email and try again.' },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ success: true, rollNumber: roll, email });
    // Clear ticket cookie after successful verification
    res.cookies.delete('ganga_otp_ticket');
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OTP verification failed' }, { status: 400 });
  }
}
