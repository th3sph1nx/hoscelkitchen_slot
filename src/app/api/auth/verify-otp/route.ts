import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp, validateRollNumber } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { rollNumber, code } = await req.json();
    if (!rollNumber || !code) {
      return NextResponse.json({ error: 'Roll number and OTP are required' }, { status: 400 });
    }

    const isValid = await verifyOtp(rollNumber, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired OTP. Please try again.' }, { status: 401 });
    }

    const { roll, email } = validateRollNumber(rollNumber);
    return NextResponse.json({ success: true, rollNumber: roll, email });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OTP verification failed' }, { status: 400 });
  }
}
