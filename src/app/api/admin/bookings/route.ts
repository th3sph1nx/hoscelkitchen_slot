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
    const client = (await import('@/lib/supabase')).getSupabaseServerClient();
    
    // Direct test query
    const directRes = client ? await client.from('bookings').select('*').order('start_time', { ascending: true }) : null;
    const bookings = await getBookings({ all: true, roll_number });

    let keyPayload = null;
    try {
      const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (k && k.includes('.')) {
        keyPayload = JSON.parse(Buffer.from(k.split('.')[1], 'base64').toString());
      }
    } catch {}

    return NextResponse.json({
      bookings,
      count: bookings.length,
      directCount: directRes?.data?.length,
      directError: directRes?.error,
      hasClient: Boolean(client),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'default',
      keyPayload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
