import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { validateRollNumber, generateAndSendOtp } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { rollNumber } = await req.json();
    const validation = validateRollNumber(rollNumber || '');
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { roll, email } = validation;
    const client = getSupabaseServerClient();

    let sentViaSupabase = false;
    let supabaseErrorMsg: string | undefined;

    if (client) {
      try {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          },
        });

        if (!error) {
          sentViaSupabase = true;
          console.log(`[Supabase Auth] Successfully dispatched OTP email to ${email}`);
        } else {
          console.warn('[Supabase Auth] signInWithOtp error:', error.message);
          supabaseErrorMsg = error.message;
        }
      } catch (err: any) {
        console.warn('[Supabase Auth] Exception:', err.message);
      }
    }

    // Also store in fallback memory/database in case of Supabase email rate limits
    const fallback = await generateAndSendOtp(roll);
    const isRateLimited = Boolean(
      supabaseErrorMsg &&
      (supabaseErrorMsg.toLowerCase().includes('rate limit') || supabaseErrorMsg.toLowerCase().includes('limit'))
    );

    return NextResponse.json({
      success: true,
      email,
      provider: sentViaSupabase ? 'supabase-auth' : 'local-dispatch',
      rateLimited: isRateLimited,
      devOtp: fallback.devOtp,
      note: sentViaSupabase
        ? 'OTP sent via Supabase Authentication to your college email'
        : (supabaseErrorMsg || 'Fallback OTP generated'),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send OTP' }, { status: 400 });
  }
}
