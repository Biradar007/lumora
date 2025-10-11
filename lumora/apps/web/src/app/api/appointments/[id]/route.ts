import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Appointment } from '@/types/domain';

type MutableFields = Partial<Pick<Appointment, 'status' | 'start' | 'end' | 'videoLink'>>;
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const { id } = await context.params;
    const body = (await request.json()) as MutableFields;
    if (!body) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const db = getServerFirestore();
    const appointmentRef = db.collection('appointments').doc(id);
    const snapshot = await appointmentRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 });
    }
    const appointment = snapshot.data() as Appointment;
    if (appointment.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const updates: Record<string, unknown> = {};
    if (body.status) {
      if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(body.status)) {
        return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.start) {
      updates.start = body.start;
    }
    if (body.end) {
      updates.end = body.end;
    }
    if (body.videoLink !== undefined) {
      updates.videoLink = body.videoLink;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'no_updates' }, { status: 400 });
    }
    await appointmentRef.set(updates, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
