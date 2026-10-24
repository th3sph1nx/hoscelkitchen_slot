import { NextRequest, NextResponse } from 'next/server';
import { getBookings, createBooking } from '@/lib/db';
import { FacilityId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facility_id = (searchParams.get('facility_id') || searchParams.get('facilityId')) as FacilityId | undefined;
    const date = searchParams.get('date') || undefined;
    const roll_number = (searchParams.get('roll_number') || searchParams.get('roll')) || undefined;
    const all = searchParams.get('all') === 'true' || Boolean(roll_number);

    const bookings = await getBookings({ facility_id, date, roll_number, all });
    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { facility_id, roll_number, attendees_count, start_time, end_time, purpose } = body;

    if (!facility_id || !roll_number || !start_time || !end_time) {
      return NextResponse.json({ error: 'Missing required booking fields' }, { status: 400 });
    }

    const booking = await createBooking({
      facility_id,
      roll_number,
      attendees_count: Number(attendees_count) || 1,
      start_time,
      end_time,
      purpose,
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (err: any) {
    const isConflict =
      err.message?.includes('already booked') ||
      err.message?.includes('Conflict') ||
      err.message?.includes('occupied');
    return NextResponse.json({ error: err.message || 'Booking failed' }, { status: isConflict ? 409 : 400 });
  }
}
