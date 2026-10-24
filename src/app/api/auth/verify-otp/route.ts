import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { validateRollNumber, verifyOtp } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { rollNumber, code } = await req.json();
    if (!rollNumber || !code) {
      return NextResponse.json({ error: 'Roll number and OTP are required' }, { status: 400 });
    }

    const validation = validateRollNumber(rollNumber);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { roll, email } = validation;
    const token = String(code).trim();
    const client = getSupabaseServerClient();

    let verified = false;

    // 1. Try Supabase Auth verification
    if (client) {
      try {
        const { data, error } = await client.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });

        if (!error && data?.user) {
          verified = true;
          console.log(`[Supabase Auth] Verified session for ${email}`);
        }
      } catch (err: any) {
        console.warn('[Supabase Auth] verifyOtp failed, trying fallback:', err.message);
      }
    }

    // 2. Try fallback verification if Supabase Auth didn't verify (e.g. rate limit or demo code)
    if (!verified) {
      const fallbackOk = await verifyOtp(roll, token);
      if (fallbackOk) {
        verified = true;
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired OTP token. Please check your email and try again.' }, { status: 401 });
    }

    return NextResponse.json({ success: true, rollNumber: roll, email });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'OTP verification failed' }, { status: 400 });
  }
}
