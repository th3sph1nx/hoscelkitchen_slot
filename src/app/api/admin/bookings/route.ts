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
    const bookings = await getBookings({ all: true });
    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
