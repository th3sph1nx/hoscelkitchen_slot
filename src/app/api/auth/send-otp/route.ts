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

    // Dispatch via Gmail SMTP (or local fallback if Gmail credentials not yet set)
    const dispatchResult = await generateAndSendOtp(roll);
    const isRateLimited = Boolean(
      supabaseErrorMsg &&
      (supabaseErrorMsg.toLowerCase().includes('rate limit') || supabaseErrorMsg.toLowerCase().includes('limit'))
    );

    const isGmailConfigured = dispatchResult.sentVia === 'gmail-smtp';

    const res = NextResponse.json({
      success: true,
      email,
      provider: isGmailConfigured ? 'gmail-smtp' : (sentViaSupabase ? 'supabase-auth' : 'local-dispatch'),
      rateLimited: isRateLimited,
      devOtp: isGmailConfigured ? undefined : dispatchResult.devOtp, // Only expose bypass code if Gmail is not sending real email
      ticket: dispatchResult.ticket,
      sentVia: dispatchResult.sentVia,
      note: isGmailConfigured
        ? 'Passcode sent directly to your college email via Gmail SMTP.'
        : (sentViaSupabase
          ? 'OTP sent via Supabase Authentication to your college email.'
          : (supabaseErrorMsg || 'Fallback OTP generated.')),
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
    return NextResponse.json({ error: err.message || 'Failed to send OTP' }, { status: 400 });
  }
}
