import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { ForbiddenError, jsonError, requireAuth } from '@/lib/apiAuth';
import type { Appointment } from '@/types/domain';
import {
  createOrUpdateGoogleEvent,
  deleteGoogleEvent,
  getTherapistGoogleIntegration,
} from '@/lib/googleCalendar';
import { createZoomMeeting, deleteZoomMeeting as removeZoomMeeting, updateZoomMeeting } from '@/lib/zoom';
import type { Firestore } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

interface UpdateAppointmentPayload {
  action: 'CONFIRM' | 'DECLINE' | 'RESCHEDULE' | 'CANCEL';
  start?: number;
  end?: number;
  location?: 'video' | 'in-person';
  videoLink?: string;
  notes?: string;
  reason?: string;
}

function assertTherapist(appointment: Appointment, userId: string) {
  if (appointment.therapistId !== userId) {
    throw new ForbiddenError('forbidden');
  }
}

function assertParticipant(appointment: Appointment, userId: string) {
  if (appointment.therapistId !== userId && appointment.userId !== userId) {
    throw new ForbiddenError('forbidden');
  }
}

async function syncGoogleEvent(db: Firestore, appointment: Appointment, timezoneHint?: string): Promise<string | null> {
  const integration = await getTherapistGoogleIntegration(appointment.therapistId);
  if (!integration) {
    return null;
  }
  let timezone = timezoneHint;
  if (!timezone) {
    const therapistProfileSnapshot = await db.collection('therapistProfiles').doc(appointment.therapistId).get();
    const therapistProfile = therapistProfileSnapshot.data() as { timezone?: string } | undefined;
    timezone = therapistProfile?.timezone ?? 'UTC';
  }
  const resolvedTimezone = timezone ?? 'UTC';

  const usersCollection = db.collection('users');
  const [userSnapshot, therapistSnapshot] = await Promise.all([
    usersCollection.doc(appointment.userId).get(),
    usersCollection.doc(appointment.therapistId).get(),
  ]);
  const userData = userSnapshot.data() as { displayName?: string; name?: string; email?: string } | undefined;
  const therapistData = therapistSnapshot.data() as { email?: string; displayName?: string; name?: string } | undefined;

  const attendeeEmail = userData?.email;
  const therapistEmail = therapistData?.email;

  const summary =
    therapistData?.displayName && userData?.displayName
      ? `Session: ${therapistData.displayName} × ${userData.displayName}`
      : 'Lumora therapy session';

  const descriptionParts = [
    appointment.location === 'video'
      ? 'Virtual therapy session'
      : 'In-person therapy session',
  ];
  if (appointment.notes) {
    descriptionParts.push(`Notes: ${appointment.notes}`);
  }
  if (appointment.videoLink) {
    descriptionParts.push(`Video link: ${appointment.videoLink}`);
  }

  const attendees: { email: string; displayName?: string }[] = [];
  if (therapistEmail) {
    attendees.push({ email: therapistEmail, displayName: therapistData?.displayName ?? therapistData?.name });
  }
  if (attendeeEmail) {
    attendees.push({ email: attendeeEmail, displayName: userData?.displayName ?? userData?.name });
  }

  const eventId = await createOrUpdateGoogleEvent(appointment.therapistId, {
    eventId: appointment.googleCalendarEventId,
    summary,
    description: descriptionParts.join('\n'),
    start: new Date(appointment.start).toISOString(),
    end: new Date(appointment.end).toISOString(),
    timeZone: resolvedTimezone,
    location: appointment.location === 'video' ? undefined : 'In-person session',
    meetingLink: appointment.location === 'video' ? appointment.videoLink : undefined,
    attendees,
  });

  return eventId;
}

async function syncZoom(appointment: Appointment, timezone: string): Promise<{ videoLink?: string; zoomMeetingId?: string | null }> {
  if (appointment.location !== 'video') {
    if (appointment.zoomMeetingId) {
      try {
        await removeZoomMeeting(appointment.zoomMeetingId);
      } catch (error) {
        console.error('Failed to remove Zoom meeting', error);
      }
    }
    return { zoomMeetingId: null };
  }

  const durationMinutes = Math.max(15, Math.round((appointment.end - appointment.start) / (60 * 1000)));
  const startTime = new Date(appointment.start).toISOString();
  const topic = 'Lumora therapy session';

  try {
    if (appointment.zoomMeetingId) {
      await updateZoomMeeting(appointment.zoomMeetingId, {
        topic,
        startTime,
        durationMinutes,
        timezone,
      });
      return { zoomMeetingId: appointment.zoomMeetingId, videoLink: appointment.videoLink };
    }

    const meeting = await createZoomMeeting({
      topic,
      startTime,
      durationMinutes,
      timezone,
    });
    return { zoomMeetingId: meeting.meetingId, videoLink: meeting.joinUrl };
  } catch (error) {
    console.error('Failed to sync Zoom meeting', error);
    return {};
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const payload = (await request.json()) as UpdateAppointmentPayload;
    if (!payload?.action) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const db = getServerFirestore();
    const appointmentRef = db.collection('appointments').doc(id);
    const snapshot = await appointmentRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 });
    }
    const appointment = snapshot.data() as Appointment;
    assertParticipant(appointment, auth.userId);

    const therapistProfileSnapshot = await db.collection('therapistProfiles').doc(appointment.therapistId).get();
    const therapistProfile = therapistProfileSnapshot.data() as { timezone?: string } | undefined;
    const timezone = therapistProfile?.timezone ?? 'UTC';

    const now = Date.now();
    let updatedAppointment: Partial<Appointment> = { updatedAt: now };

    switch (payload.action) {
      case 'CONFIRM': {
        assertTherapist(appointment, auth.userId);
        updatedAppointment.status = 'CONFIRMED';
        updatedAppointment.videoLink = payload.videoLink ?? appointment.videoLink;
        updatedAppointment.location = payload.location ?? appointment.location;
        updatedAppointment.notes = payload.notes ?? appointment.notes;
        updatedAppointment.proposedStart = undefined;
        updatedAppointment.proposedEnd = undefined;
        updatedAppointment.proposedBy = undefined;
        updatedAppointment.cancelledBy = undefined;
        break;
      }
      case 'DECLINE': {
        assertTherapist(appointment, auth.userId);
        updatedAppointment.status = 'DECLINED';
        updatedAppointment.notes = payload.reason ?? payload.notes ?? appointment.notes;
        updatedAppointment.googleCalendarEventId = null;
        await deleteGoogleEvent(appointment.therapistId, appointment.googleCalendarEventId);
        if (appointment.zoomMeetingId) {
          try {
            await removeZoomMeeting(appointment.zoomMeetingId);
          } catch (error) {
            console.error('Failed to remove Zoom meeting', error);
          }
          updatedAppointment.zoomMeetingId = null;
        }
        break;
      }
      case 'RESCHEDULE': {
        assertTherapist(appointment, auth.userId);
        if (!payload.start || !payload.end) {
          return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
        }
        updatedAppointment.start = payload.start;
        updatedAppointment.end = payload.end;
        updatedAppointment.status = 'CONFIRMED';
        updatedAppointment.location = payload.location ?? appointment.location;
        updatedAppointment.videoLink = payload.videoLink ?? appointment.videoLink;
        updatedAppointment.notes = payload.notes ?? appointment.notes;
        updatedAppointment.proposedStart = undefined;
        updatedAppointment.proposedEnd = undefined;
        updatedAppointment.proposedBy = undefined;
        updatedAppointment.cancelledBy = undefined;
        break;
      }
      case 'CANCEL': {
        assertParticipant(appointment, auth.userId);
        updatedAppointment.status = 'CANCELLED';
        updatedAppointment.notes = payload.reason ?? payload.notes ?? appointment.notes;
        updatedAppointment.cancelledBy = auth.role === 'therapist' ? 'therapist' : 'user';
        updatedAppointment.googleCalendarEventId = null;
        await deleteGoogleEvent(appointment.therapistId, appointment.googleCalendarEventId);
        if (appointment.zoomMeetingId) {
          try {
            await removeZoomMeeting(appointment.zoomMeetingId);
          } catch (error) {
            console.error('Failed to remove Zoom meeting', error);
          }
          updatedAppointment.zoomMeetingId = null;
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'unsupported_action' }, { status: 400 });
    }

    const nextAppointment = { ...appointment, ...updatedAppointment } as Appointment;
    if (['CONFIRM', 'RESCHEDULE'].includes(payload.action)) {
      const shouldSyncZoom =
        nextAppointment.location === 'video' && (!nextAppointment.videoLink || nextAppointment.zoomMeetingId);
      if (shouldSyncZoom) {
        try {
          const zoomResult = await syncZoom(nextAppointment, timezone);
          if (zoomResult.videoLink) {
            nextAppointment.videoLink = zoomResult.videoLink;
            updatedAppointment.videoLink = zoomResult.videoLink;
          }
          if (typeof zoomResult.zoomMeetingId !== 'undefined') {
            nextAppointment.zoomMeetingId = zoomResult.zoomMeetingId ?? null;
            updatedAppointment.zoomMeetingId = zoomResult.zoomMeetingId ?? null;
          }
        } catch (error) {
          console.error('Zoom integration failed', error);
        }
      } else if (appointment.zoomMeetingId) {
        try {
          await removeZoomMeeting(appointment.zoomMeetingId);
          nextAppointment.zoomMeetingId = null;
          updatedAppointment.zoomMeetingId = null;
        } catch (error) {
          console.error('Failed to clean up Zoom meeting', error);
        }
      }
      try {
        const eventId = await syncGoogleEvent(db, nextAppointment, timezone);
        if (eventId) {
          nextAppointment.googleCalendarEventId = eventId;
          updatedAppointment.googleCalendarEventId = eventId;
        }
      } catch (integrationError) {
        console.error('Failed to sync Google Calendar event', integrationError);
      }
    }

    await appointmentRef.set(sanitizeForFirestore(updatedAppointment), { merge: true });
    return NextResponse.json({ appointment: nextAppointment });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const appointmentRef = db.collection('appointments').doc(id);
    const snapshot = await appointmentRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'appointment_not_found' }, { status: 404 });
    }
    const appointment = snapshot.data() as Appointment;
    assertParticipant(appointment, auth.userId);
    await deleteGoogleEvent(appointment.therapistId, appointment.googleCalendarEventId);
    if (appointment.zoomMeetingId) {
      try {
        await removeZoomMeeting(appointment.zoomMeetingId);
      } catch (error) {
        console.error('Failed to remove Zoom meeting', error);
      }
    }
    await appointmentRef.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
