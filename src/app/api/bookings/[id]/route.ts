import { NextRequest, NextResponse } from 'next/server';
import { getBookings, getBookingByCode, updateBooking } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    // Check if ID is a booking code or UUID
    let booking = await getBookingByCode(id);
    if (!booking) {
      const all = await getBookings();
      booking = all.find((b) => b.id === id) || null;
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error fetching booking' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const allowedUpdates = [
      'status',
      'key_status',
      'key_collected_at',
      'key_returned_at',
      'notes',
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Auto set timestamps for key status transitions if not provided
    if (body.key_status === 'collected' && !updates.key_collected_at) {
      updates.key_collected_at = new Date().toISOString();
    } else if (body.key_status === 'returned' && !updates.key_returned_at) {
      updates.key_returned_at = new Date().toISOString();
    }

    const updated = await updateBooking(id, updates);
    return NextResponse.json({ success: true, booking: updated });
  } catch (err: any) {
    console.error('Error updating booking in /api/bookings/[id]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update booking' },
      { status: 400 }
    );
  }
}
