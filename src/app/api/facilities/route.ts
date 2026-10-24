import { NextResponse } from 'next/server';
import { FACILITIES } from '@/lib/constants';

export async function GET() {
  return NextResponse.json({ facilities: FACILITIES });
}
