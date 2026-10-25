import { NextRequest, NextResponse } from 'next/server';
import { cancelBooking, updateBookingTiming } from '@/lib/db';
import { verifyAdminAccess } from '@/lib/auth';
import { ADMIN_ROLL } from '@/lib/types';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;
    const ok = await cancelBooking(id, ADMIN_ROLL);
    if (!ok) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Booking removed by admin' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = params;
    const { start_time, end_time } = await req.json();

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'start_time and end_time are required' }, { status: 400 });
    }

    const updated = await updateBookingTiming(id, start_time, end_time);
    return NextResponse.json({ success: true, booking: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update timing' }, { status: 400 });
  }
}
