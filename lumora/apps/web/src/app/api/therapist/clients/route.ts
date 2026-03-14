import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import {
  TherapistClientValidationError,
  ensureConnectionConsent,
  getExistingUserByEmail,
  getTherapistInviteDetails,
  hydrateTherapistConnections,
  parseAddTherapistClientInput,
  sendTherapistClientInviteEmail,
} from '@/lib/therapistClients';
import type { ClientRecord, Connection, TherapistClientLink } from '@/types/domain';

export const runtime = 'nodejs';

type InviteDeliveryStatus = 'sent' | 'skipped' | 'failed';

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const payload = parseAddTherapistClientInput(await request.json());
    const db = getServerFirestore();
    const therapist = await getTherapistInviteDetails(db, auth.userId);
    const existingUser = await getExistingUserByEmail(db, payload.emailLower);
    const linkedUserId = existingUser?.id ?? null;

    if (linkedUserId) {
      const duplicateSnapshot = await db
        .collection('connections')
        .where('therapistId', '==', auth.userId)
        .where('userId', '==', linkedUserId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
      if (!duplicateSnapshot.empty) {
        return NextResponse.json({ error: 'client_already_connected' }, { status: 409 });
      }
    }

    const now = Date.now();
    const clientRef = db.collection('clients').doc();
    const clientStatus = linkedUserId || !payload.email ? 'active' : 'invited';
    const client: ClientRecord = {
      id: clientRef.id,
      tenantId: auth.tenantId,
      firstName: payload.firstName,
      lastName: payload.lastName ?? null,
      email: payload.email ?? null,
      emailLower: payload.emailLower ?? null,
      phone: payload.phone ?? null,
      notes: payload.notes ?? null,
      createdByTherapistId: auth.userId,
      createdAt: now,
      updatedAt: now,
      status: clientStatus,
      linkedUserId,
      inviteEmailStatus: 'not_requested',
      inviteEmailError: null,
    };

    const connectionRef = db.collection('connections').doc();
    const connection: Connection = {
      id: connectionRef.id,
      tenantId: auth.tenantId,
      userId: linkedUserId ?? client.id,
      therapistId: auth.userId,
      status: 'ACTIVE',
      startedAt: now,
      updatedAt: now,
      clientRecordId: client.id,
      linkedUserId,
      createdByTherapistId: auth.userId,
      connectionSource: 'therapist_added',
      therapistVerifiedAtAddTime: therapist.therapistVerified,
      emailSent: false,
      inviteEmailStatus: 'not_requested',
      clientStatus,
    };

    const therapistClientLink: TherapistClientLink = {
      clientId: client.id,
      connectionId: connection.id,
      connectedAt: now,
      connectionSource: 'therapist_added',
      therapistVerifiedAtAddTime: therapist.therapistVerified,
      emailSent: false,
      inviteEmailStatus: 'not_requested',
      clientStatus,
      linkedUserId,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(clientRef, sanitizeForFirestore(client));
    batch.set(connectionRef, sanitizeForFirestore(connection));
    batch.set(
      db.collection('therapistProfiles').doc(auth.userId).collection('clients').doc(client.id),
      sanitizeForFirestore(therapistClientLink)
    );
    batch.set(db.collection('chats').doc(connection.id), {
      id: connection.id,
      connectionId: connection.id,
      lastMessageAt: null,
    });
    await batch.commit();

    if (linkedUserId) {
      await ensureConnectionConsent({
        db,
        connectionId: connection.id,
        userId: linkedUserId,
        therapistId: auth.userId,
        now,
      });
    }

    let inviteDeliveryStatus: InviteDeliveryStatus = 'skipped';

    if (payload.email) {
      try {
        await sendTherapistClientInviteEmail({
          to: payload.email,
          lumoraBaseUrl: new URL('/', request.url).toString(),
          therapist: {
            therapistName: therapist.therapistName,
            therapistEmail: therapist.therapistEmail,
            credentials: therapist.credentials,
          },
        });

        inviteDeliveryStatus = 'sent';
        const sentAt = Date.now();
        await Promise.all([
          clientRef.set(
            sanitizeForFirestore({
              inviteEmailStatus: 'sent',
              inviteEmailSentAt: sentAt,
              inviteEmailFailedAt: null,
              inviteEmailError: null,
              updatedAt: sentAt,
            }),
            { merge: true }
          ),
          db
            .collection('therapistProfiles')
            .doc(auth.userId)
            .collection('clients')
            .doc(client.id)
            .set(
              sanitizeForFirestore({
                emailSent: true,
                inviteEmailStatus: 'sent',
                inviteEmailSentAt: sentAt,
                inviteEmailFailedAt: null,
                updatedAt: sentAt,
              }),
              { merge: true }
            ),
          connectionRef.set(
            sanitizeForFirestore({
              emailSent: true,
              inviteEmailStatus: 'sent',
              updatedAt: sentAt,
            }),
            { merge: true }
          ),
        ]);
      } catch (error) {
        console.error('Failed to send therapist client invite email', error);
        inviteDeliveryStatus = 'failed';
        const failedAt = Date.now();
        const errorMessage = error instanceof Error ? error.message : 'invite_send_failed';
        await Promise.all([
          clientRef.set(
            sanitizeForFirestore({
              inviteEmailStatus: 'failed',
              inviteEmailFailedAt: failedAt,
              inviteEmailError: errorMessage,
              updatedAt: failedAt,
            }),
            { merge: true }
          ),
          db
            .collection('therapistProfiles')
            .doc(auth.userId)
            .collection('clients')
            .doc(client.id)
            .set(
              sanitizeForFirestore({
                emailSent: false,
                inviteEmailStatus: 'failed',
                inviteEmailFailedAt: failedAt,
                updatedAt: failedAt,
              }),
              { merge: true }
            ),
          connectionRef.set(
            sanitizeForFirestore({
              emailSent: false,
              inviteEmailStatus: 'failed',
              updatedAt: failedAt,
            }),
            { merge: true }
          ),
        ]);
      }
    }

    const [hydratedConnection] = await hydrateTherapistConnections({
      db,
      therapistId: auth.userId,
      connections: [
        {
          ...connection,
          emailSent: inviteDeliveryStatus === 'sent',
          inviteEmailStatus:
            inviteDeliveryStatus === 'skipped' ? 'not_requested' : inviteDeliveryStatus,
        },
      ],
    });

    const refreshedClientSnapshot = await clientRef.get();
    const refreshedClient = refreshedClientSnapshot.data() as ClientRecord;

    return NextResponse.json(
      {
        client: refreshedClient,
        connection: hydratedConnection,
        invite: {
          requested: Boolean(payload.email),
          status: inviteDeliveryStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof TherapistClientValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return jsonError(error);
  }
}
