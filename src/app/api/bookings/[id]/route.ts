import { NextRequest, NextResponse } from 'next/server';
import { cancelBooking } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { ADMIN_ROLL } from '@/lib/types';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to cancel a booking.' }, { status: 401 });
    }

    const { id } = params;
    // If admin, pass ADMIN_ROLL so it can cancel any slot. If regular student, pass user.roll so they can only cancel their own slot!
    const authorizedRoll = user.isAdmin ? ADMIN_ROLL : user.roll;

    const ok = await cancelBooking(id, authorizedRoll);
    if (!ok) {
      return NextResponse.json({ error: 'Booking not found or you are not authorized to cancel this slot.' }, { status: 403 });
    }
    return NextResponse.json({ success: true, message: 'Booking cancelled' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel booking' }, { status: 400 });
  }
}
