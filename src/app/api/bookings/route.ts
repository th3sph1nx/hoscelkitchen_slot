import { NextRequest, NextResponse } from 'next/server';
import { getBookings, createBooking } from '@/lib/db';
import { FacilityId, BookingStatus, KeyStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get('facilityId') as FacilityId | undefined;
    const date = searchParams.get('date') || undefined;
    const roll = searchParams.get('roll') || undefined;
    const code = searchParams.get('code') || undefined;
    const status = searchParams.get('status') as BookingStatus | undefined;
    const keyStatus = searchParams.get('keyStatus') as KeyStatus | undefined;

    const bookings = await getBookings({
      facilityId,
      date,
      roll,
      code,
      status,
      keyStatus,
    });

    return NextResponse.json({ bookings });
  } catch (err: any) {
    console.error('Error in GET /api/bookings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      facility_id,
      student_name,
      student_roll,
      student_room,
      student_phone,
      purpose,
      attendees_count,
      start_time,
      end_time,
      notes,
    } = body;

    // Call atomic createBooking which performs BACKEND slot free checking
    const booking = await createBooking({
      facility_id,
      student_name,
      student_roll,
      student_room,
      student_phone,
      purpose,
      attendees_count,
      start_time,
      end_time,
      notes,
    });

    return NextResponse.json(
      { success: true, booking, message: 'Time slot booked successfully!' },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating booking in /api/bookings:', err);
    const isConflict =
      err.message?.includes('already booked') ||
      err.message?.includes('Conflict') ||
      err.message?.includes('overlaps');

    return NextResponse.json(
      { error: err.message || 'Failed to create booking' },
      { status: isConflict ? 409 : 400 }
    );
  }
}
