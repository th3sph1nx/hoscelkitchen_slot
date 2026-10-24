import { NextRequest, NextResponse } from 'next/server';
import { checkSlotAvailability } from '@/lib/db';
import { FacilityId } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get('facilityId') || searchParams.get('facility_id');
    const startTime = searchParams.get('startTime') || searchParams.get('start_time');
    const endTime = searchParams.get('endTime') || searchParams.get('end_time');
    const excludeBookingId = searchParams.get('excludeBookingId') || undefined;

    if (!facilityId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'facilityId, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    if (facilityId !== 'kitchen' && facilityId !== 'tv-room') {
      return NextResponse.json({ error: 'Invalid facilityId' }, { status: 400 });
    }

    const result = await checkSlotAvailability(
      facilityId as FacilityId,
      startTime,
      endTime,
      excludeBookingId
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in GET /api/check-availability:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while checking availability' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { facilityId, startTime, endTime, excludeBookingId } = body;

    if (!facilityId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'facilityId, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    if (facilityId !== 'kitchen' && facilityId !== 'tv-room') {
      return NextResponse.json({ error: 'Invalid facilityId' }, { status: 400 });
    }

    const result = await checkSlotAvailability(
      facilityId as FacilityId,
      startTime,
      endTime,
      excludeBookingId
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/check-availability:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while checking availability' },
      { status: 500 }
    );
  }
}
