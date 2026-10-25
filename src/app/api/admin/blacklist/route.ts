import { NextRequest, NextResponse } from 'next/server';
import { getBlacklist, addToBlacklist, removeFromBlacklist, validateRollNumber } from '@/lib/db';
import { verifyAdminAccess } from '@/lib/auth';
import { ADMIN_ROLL } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Forbidden' }, { status: 403 });
  }

  try {
    const blacklist = await getBlacklist();
    return NextResponse.json({ blacklist });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Forbidden' }, { status: 403 });
  }

  try {
    const { roll_number, reason } = await req.json();
    const val = validateRollNumber(roll_number);
    if (!val.isValid) return NextResponse.json({ error: val.error }, { status: 400 });

    if (val.roll === ADMIN_ROLL) {
      return NextResponse.json({ error: 'Cannot blacklist admin roll number' }, { status: 400 });
    }

    await addToBlacklist(val.roll, reason || 'Blacklisted by Admin');
    return NextResponse.json({ success: true, message: `Roll ${val.roll} added to blacklist` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = verifyAdminAccess(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Forbidden' }, { status: 403 });
  }

  try {
    const { roll_number } = await req.json();
    if (!roll_number) return NextResponse.json({ error: 'roll_number is required' }, { status: 400 });

    await removeFromBlacklist(roll_number);
    return NextResponse.json({ success: true, message: `Roll ${roll_number} removed from blacklist` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
