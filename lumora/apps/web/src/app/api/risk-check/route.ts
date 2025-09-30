import { NextResponse } from 'next/server';
import { assessRisk } from '@lumora/services';

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as { text?: string };
    const { tier, reasons } = assessRisk(text || '');
    return NextResponse.json({ tier, reasons });
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}


