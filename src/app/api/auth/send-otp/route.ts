import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendOtp } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { rollNumber } = await req.json();
    if (!rollNumber) {
      return NextResponse.json({ error: 'Roll number is required' }, { status: 400 });
    }

    const result = await generateAndSendOtp(rollNumber);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send OTP' }, { status: 400 });
  }
}
