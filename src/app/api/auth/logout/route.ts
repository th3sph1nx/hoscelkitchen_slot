import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.cookies.delete(SESSION_COOKIE_NAME);
  res.cookies.delete('ganga_otp_ticket');
  return res;
}
