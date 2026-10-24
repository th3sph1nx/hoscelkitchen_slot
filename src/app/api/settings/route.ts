import { NextRequest, NextResponse } from 'next/server';
import { getHostelSettings, updateHostelSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = await getHostelSettings();
    // Do not leak admin pin in public response
    const { admin_pin, ...publicSettings } = settings;
    return NextResponse.json({ settings: publicSettings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, ...updates } = body;

    const current = await getHostelSettings();
    if (pin !== current.admin_pin && pin !== process.env.ADMIN_PIN) {
      return NextResponse.json({ error: 'Invalid Representative PIN' }, { status: 401 });
    }

    const updated = await updateHostelSettings(updates);
    const { admin_pin, ...publicSettings } = updated;
    return NextResponse.json({ success: true, settings: publicSettings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update settings' },
      { status: 400 }
    );
  }
}
