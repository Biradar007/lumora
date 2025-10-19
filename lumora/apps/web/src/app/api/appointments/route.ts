import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Appointment, Connection } from '@/types/domain';

export const runtime = 'nodejs';

interface CreateAppointmentPayload {
  connectionId: string;
  therapistId: string;
  start: number;
  end: number;
  location: 'video' | 'in-person';
  videoLink?: string;
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const body = (await request.json()) as CreateAppointmentPayload;
    if (!body?.connectionId || !body?.therapistId || !body?.start || !body?.end || !body?.location) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const db = getServerFirestore();
    const connectionRef = db.collection('connections').doc(body.connectionId);
    const snapshot = await connectionRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'connection_not_found' }, { status: 404 });
    }
    const connection = snapshot.data() as Connection;
    if (connection.userId !== auth.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (connection.therapistId !== body.therapistId) {
      return NextResponse.json({ error: 'invalid_therapist' }, { status: 400 });
    }
    const appointmentsCollection = db.collection('appointments');
    const appointmentRef = appointmentsCollection.doc();
    const now = Date.now();
    const appointment: Appointment = {
      id: appointmentRef.id,
      connectionId: body.connectionId,
      therapistId: body.therapistId,
      userId: auth.userId,
      start: body.start,
      end: body.end,
      status: 'PENDING',
      location: body.location,
      videoLink: body.videoLink,
      googleCalendarEventId: null,
      zoomMeetingId: null,
      createdAt: now,
      updatedAt: now,
    };
    await appointmentRef.set(sanitizeForFirestore(appointment));
    return NextResponse.json({ appointment });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const appointmentsRef = db.collection('appointments');
    const field = auth.role === 'therapist' ? 'therapistId' : 'userId';
    const snapshot = await appointmentsRef.where(field, '==', auth.userId).get();
    const appointments = snapshot.docs.map((docSnapshot) => docSnapshot.data() as Appointment);
    return NextResponse.json({ appointments });
  } catch (error) {
    return jsonError(error);
  }
}
