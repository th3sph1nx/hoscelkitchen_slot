import { NextRequest, NextResponse } from 'next/server';
import { getBookings } from '@/lib/db';
import { ADMIN_ROLL } from '@/lib/types';

export const dynamic = 'force-dynamic';

function checkAdmin(req: NextRequest): boolean {
  const roll = req.headers.get('x-admin-roll') || req.nextUrl.searchParams.get('admin_roll');
  return roll?.trim().toUpperCase() === ADMIN_ROLL;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: `Unauthorized: Admin role required (${ADMIN_ROLL})` }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const roll_number = searchParams.get('roll_number') || searchParams.get('roll') || undefined;
    const bookings = await getBookings({ all: true, roll_number });
    return NextResponse.json({ bookings, count: bookings.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
