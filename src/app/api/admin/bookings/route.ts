import { NextRequest, NextResponse } from 'next/server';
import { getBookings } from '@/lib/db';
import { verifyAdminAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Enforce backend cryptographic admin session verification
  const auth = verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const roll_number = searchParams.get('roll_number') || searchParams.get('roll') || undefined;
    const bookings = await getBookings({ all: true, roll_number });

    return NextResponse.json({
      bookings,
      count: bookings.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
