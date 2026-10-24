import { NextRequest, NextResponse } from 'next/server';
import { getCooldowns, setCooldown, removeCooldown, validateRollNumber } from '@/lib/db';
import { ADMIN_ROLL } from '@/lib/types';

function checkAdmin(req: NextRequest): boolean {
  const roll = req.headers.get('x-admin-roll') || req.nextUrl.searchParams.get('admin_roll');
  return roll?.trim().toUpperCase() === ADMIN_ROLL;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: `Unauthorized: Admin role required (${ADMIN_ROLL})` }, { status: 403 });
  }

  try {
    const cooldowns = await getCooldowns();
    return NextResponse.json({ cooldowns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: `Unauthorized: Admin role required (${ADMIN_ROLL})` }, { status: 403 });
  }

  try {
    const { roll_number, hours, reason } = await req.json();
    const val = validateRollNumber(roll_number);
    if (!val.isValid) return NextResponse.json({ error: val.error }, { status: 400 });

    if (val.roll === ADMIN_ROLL) {
      return NextResponse.json({ error: 'Cannot set cooldown on admin roll number' }, { status: 400 });
    }

    const h = Number(hours) || 24; // default 24h cooldown
    await setCooldown(val.roll, h, reason || `Cooldown of ${h} hours applied by Admin`);
    return NextResponse.json({ success: true, message: `Cooldown of ${h} hours applied to ${val.roll}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: `Unauthorized: Admin role required (${ADMIN_ROLL})` }, { status: 403 });
  }

  try {
    const { roll_number } = await req.json();
    if (!roll_number) return NextResponse.json({ error: 'roll_number is required' }, { status: 400 });

    await removeCooldown(roll_number);
    return NextResponse.json({ success: true, message: `Cooldown lifted for ${roll_number}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
