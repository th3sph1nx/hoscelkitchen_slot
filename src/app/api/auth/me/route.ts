import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) {
    return NextResponse.json({ isLoggedIn: false, user: null });
  }

  return NextResponse.json({
    isLoggedIn: true,
    user: {
      roll: user.roll,
      email: user.email,
      isAdmin: user.isAdmin,
    },
  });
}
