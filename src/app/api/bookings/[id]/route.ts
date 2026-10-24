import { NextRequest, NextResponse } from 'next/server';
import { cancelBooking } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const rollNumber = searchParams.get('roll_number') || undefined;

    const ok = await cancelBooking(id, rollNumber);
    if (!ok) {
      return NextResponse.json({ error: 'Booking not found or not authorized' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Booking cancelled' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel booking' }, { status: 400 });
  }
}
