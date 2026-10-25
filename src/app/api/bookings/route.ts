import { NextRequest, NextResponse } from 'next/server';
import { getBookings, createBooking } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { FacilityId } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facility_id = (searchParams.get('facility_id') || searchParams.get('facilityId')) as FacilityId | undefined;
    const date = searchParams.get('date') || undefined;
    const requestedRoll = (searchParams.get('roll_number') || searchParams.get('roll')) || undefined;
    const requestAll = searchParams.get('all') === 'true';

    const sessionUser = getSessionUser(req);

    // Privacy & Authorization Enforcement:
    // 1. If filtering by a specific student's roll number, user must be logged in as that student or be an admin
    if (requestedRoll) {
      if (!sessionUser) {
        return NextResponse.json({ error: 'Unauthorized: Please log in to view personal bookings.' }, { status: 401 });
      }
      if (sessionUser.roll !== requestedRoll.toUpperCase() && !sessionUser.isAdmin) {
        return NextResponse.json({ error: 'Forbidden: You can only access your own reservations.' }, { status: 403 });
      }
    }

    // 2. Only admins can query all cancelled/inactive records across all students
    const allowAll = Boolean(sessionUser?.isAdmin && requestAll) || Boolean(requestedRoll);

    const bookings = await getBookings({
      facility_id,
      date,
      roll_number: requestedRoll,
      all: allowAll,
    });

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce backend session authentication
    const user = getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in to reserve a slot.' }, { status: 401 });
    }

    const body = await req.json();
    const { facility_id, attendees_count, start_time, end_time, purpose } = body;

    // 2. Strict facility validation
    if (facility_id !== 'kitchen' && facility_id !== 'tv-room') {
      return NextResponse.json({ error: 'Invalid facility. Must be either "kitchen" or "tv-room".' }, { status: 400 });
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Missing start_time or end_time' }, { status: 400 });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid start or end date format.' }, { status: 400 });
    }

    // 3. Prevent booking past dates
    if (start.getTime() < Date.now() - 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Cannot book slots in the past.' }, { status: 400 });
    }

    // 4. Prevent booking more than 14 days in advance
    const maxAdvanceMs = 14 * 24 * 60 * 60 * 1000;
    if (start.getTime() > Date.now() + maxAdvanceMs) {
      return NextResponse.json({ error: 'Reservations can only be made up to 14 days in advance.' }, { status: 400 });
    }

    // 5. Strict duration check (maximum 3 hours)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0 || durationHours > 3.01) {
      return NextResponse.json(
        { error: `Continuous booking duration must be between 1 and 3 hours (requested: ${durationHours.toFixed(1)}h).` },
        { status: 400 }
      );
    }

    // 6. Enforce booker roll number from cryptographically verified session
    const roll_number = user.roll;

    // 7. Sanitize inputs
    const attendees = Math.min(Math.max(Number(attendees_count) || 1, 1), 25);
    const cleanPurpose = typeof purpose === 'string' ? purpose.trim().slice(0, 100) : '';

    const booking = await createBooking({
      facility_id,
      roll_number,
      attendees_count: attendees,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      purpose: cleanPurpose,
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
