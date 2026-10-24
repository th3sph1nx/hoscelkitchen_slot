import { NextResponse } from 'next/server';
import { getCurrentFacilityStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getCurrentFacilityStatus();
    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch status' }, { status: 500 });
  }
}
