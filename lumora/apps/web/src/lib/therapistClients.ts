import type { Firestore } from 'firebase-admin/firestore';
import { sanitizeForFirestore } from '@/lib/firestoreServer';
import { sendMail } from '@/lib/mailer';
import type { ClientRecord, ClientStatus, Connection, Consent, InviteEmailStatus, TherapistClientLink } from '@/types/domain';

export class TherapistClientValidationError extends Error {
  status = 400;
}

export interface AddTherapistClientInput {
  firstName: string;
  lastName?: string;
  email?: string;
  emailLower?: string;
  phone?: string;
  notes?: string;
}

interface TherapistInviteDetails {
  therapistName: string;
  therapistEmail?: string | null;
  credentials?: string[];
}

interface BasicUserProfile {
  id: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
}

function normalizeOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, maxLength);
}

function normalizeEmail(value: unknown): { email: string; emailLower: string } | undefined {
  const normalized = normalizeOptionalString(value, 320);
  if (!normalized) {
    return undefined;
  }
  const emailLower = normalized.toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(emailLower)) {
    throw new TherapistClientValidationError('invalid_email');
  }
  return {
    email: emailLower,
    emailLower,
  };
}

function splitDisplayName(value?: string | null): { firstName?: string; lastName?: string } {
  const normalized = normalizeOptionalString(value, 160);
  if (!normalized) {
    return {};
  }
  const [firstName, ...rest] = normalized.split(/\s+/);
  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(' ') : undefined,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getClientDisplayName({
  firstName,
  lastName,
  displayName,
  email,
  fallbackId,
}: {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  fallbackId: string;
}): string {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }
  const normalizedDisplayName = normalizeOptionalString(displayName, 160);
  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }
  const normalizedEmail = normalizeOptionalString(email, 320);
  if (normalizedEmail) {
    return normalizedEmail;
  }
  return fallbackId;
}

export function parseAddTherapistClientInput(payload: unknown): AddTherapistClientInput {
  const value = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const firstName = normalizeOptionalString(value.firstName, 80);
  if (!firstName) {
    throw new TherapistClientValidationError('first_name_required');
  }
  const email = normalizeEmail(value.email);
  return {
    firstName,
    lastName: normalizeOptionalString(value.lastName, 80),
    email: email?.email,
    emailLower: email?.emailLower,
    phone: normalizeOptionalString(value.phone, 40),
    notes: normalizeOptionalString(value.notes, 2000),
  };
}

export async function getExistingUserByEmail(
  db: Firestore,
  emailLower?: string
): Promise<BasicUserProfile | null> {
  if (!emailLower) {
    return null;
  }
  const snapshot = await db.collection('users').where('emailLower', '==', emailLower).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  const docSnapshot = snapshot.docs[0];
  const data = docSnapshot.data() as { email?: string; displayName?: string; name?: string; role?: string } | undefined;
  if (data?.role === 'therapist' || data?.role === 'admin') {
    return null;
  }
  return {
    id: docSnapshot.id,
    email: data?.email ?? emailLower,
    displayName: data?.displayName ?? null,
    name: data?.name ?? null,
  };
}

export async function ensureConnectionConsent({
  db,
  connectionId,
  userId,
  therapistId,
  now,
}: {
  db: Firestore;
  connectionId: string;
  userId: string;
  therapistId: string;
  now: number;
}): Promise<void> {
  const existingSnapshot = await db
    .collection('consents')
    .where('connectionId', '==', connectionId)
    .where('userId', '==', userId)
    .limit(1)
    .get();
  if (!existingSnapshot.empty) {
    return;
  }

  const consentRef = db.collection('consents').doc();
  const consent: Consent = {
    id: consentRef.id,
    connectionId,
    userId,
    therapistId,
    scopes: {
      chatSummary: false,
      moodTrends: false,
      journals: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  await consentRef.set(sanitizeForFirestore(consent));
}

export async function sendTherapistClientInviteEmail({
  to,
  lumoraBaseUrl,
  therapist,
}: {
  to: string;
  lumoraBaseUrl: string;
  therapist: TherapistInviteDetails;
}): Promise<void> {
  const registerUrl = new URL('/register', lumoraBaseUrl).toString();
  const loginUrl = new URL('/', lumoraBaseUrl).toString();
  const therapistLine = therapist.credentials?.length
    ? `${therapist.therapistName} (${therapist.credentials.join(', ')})`
    : therapist.therapistName;
  const escapedTherapistLine = escapeHtml(therapistLine);
  const escapedTherapistEmail = therapist.therapistEmail ? escapeHtml(therapist.therapistEmail) : null;
  const subject = 'Your therapist invited you to join Lumora';
  const text = [
    `Hello,`,
    '',
    `${therapistLine} has added you to Lumora.`,
    'Lumora is a secure space where you can stay connected with your therapist and manage what you choose to share.',
    '',
    `Create your account: ${registerUrl}`,
    `Already have an account? Sign in here: ${loginUrl}`,
    '',
    therapist.therapistEmail ? `Therapist contact: ${therapist.therapistEmail}` : undefined,
    'Once you join, you can review your connection and decide what data to share.',
  ]
    .filter(Boolean)
    .join('\n');
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">',
    '<p>Hello,</p>',
    `<p><strong>${escapedTherapistLine}</strong> has added you to Lumora.</p>`,
    '<p>Lumora is a secure space where you can stay connected with your therapist and manage what you choose to share.</p>',
    `<p><a href="${registerUrl}" style="display:inline-block;padding:10px 16px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;">Create your account</a></p>`,
    `<p>Already have an account? <a href="${loginUrl}" style="color:#4f46e5;">Sign in here</a>.</p>`,
    escapedTherapistEmail ? `<p>Therapist contact: ${escapedTherapistEmail}</p>` : '',
    '<p>Once you join, you can review your connection and decide what data to share.</p>',
    '</div>',
  ].join('');

  await sendMail({
    to,
    subject,
    text,
    html,
  });
}

export async function getTherapistInviteDetails(
  db: Firestore,
  therapistId: string
): Promise<TherapistInviteDetails & { therapistVerified: boolean }> {
  const [userSnapshot, profileSnapshot] = await Promise.all([
    db.collection('users').doc(therapistId).get(),
    db.collection('therapistProfiles').doc(therapistId).get(),
  ]);
  const userData = userSnapshot.data() as { email?: string; displayName?: string; name?: string } | undefined;
  const profileData = profileSnapshot.data() as { credentials?: string[]; status?: string } | undefined;

  return {
    therapistName:
      userData?.displayName?.trim() ||
      userData?.name?.trim() ||
      userData?.email?.trim() ||
      'Your therapist',
    therapistEmail: userData?.email ?? null,
    credentials: Array.isArray(profileData?.credentials) ? profileData?.credentials.filter(Boolean) : [],
    therapistVerified: profileData?.status === 'VERIFIED',
  };
}

export async function hydrateTherapistConnections({
  db,
  therapistId,
  connections,
}: {
  db: Firestore;
  therapistId: string;
  connections: Connection[];
}): Promise<Connection[]> {
  if (connections.length === 0) {
    return [];
  }

  const linkSnapshotPromise = db.collection('therapistProfiles').doc(therapistId).collection('clients').get();
  const clientIds = Array.from(new Set(connections.map((connection) => connection.clientRecordId).filter(Boolean) as string[]));
  const userIds = Array.from(
    new Set(connections.filter((connection) => !connection.clientRecordId).map((connection) => connection.userId).filter(Boolean))
  );

  const [linksSnapshot, clientSnapshots, userSnapshots] = await Promise.all([
    linkSnapshotPromise,
    Promise.all(clientIds.map((clientId) => db.collection('clients').doc(clientId).get())),
    Promise.all(userIds.map((userId) => db.collection('users').doc(userId).get())),
  ]);

  const linkMap = new Map<string, TherapistClientLink>();
  linksSnapshot.docs.forEach((docSnapshot) => {
    linkMap.set(docSnapshot.id, docSnapshot.data() as TherapistClientLink);
  });

  const clientMap = new Map<string, ClientRecord>();
  clientSnapshots.forEach((snapshot) => {
    if (snapshot.exists) {
      clientMap.set(snapshot.id, snapshot.data() as ClientRecord);
    }
  });

  const userMap = new Map<string, BasicUserProfile>();
  userSnapshots.forEach((snapshot) => {
    if (!snapshot.exists) {
      return;
    }
    const data = snapshot.data() as { email?: string; displayName?: string; name?: string } | undefined;
    userMap.set(snapshot.id, {
      id: snapshot.id,
      email: data?.email ?? null,
      displayName: data?.displayName ?? null,
      name: data?.name ?? null,
    });
  });

  return connections
    .map((connection) => {
      const clientRecordId = connection.clientRecordId;
      const client = clientRecordId ? clientMap.get(clientRecordId) : undefined;
      const link = clientRecordId ? linkMap.get(clientRecordId) : undefined;
      const userProfile = !clientRecordId ? userMap.get(connection.userId) : undefined;
      const displayNameSource = userProfile?.displayName ?? userProfile?.name ?? null;
      const fallbackNameParts = splitDisplayName(displayNameSource);
      const linkedUserId = connection.linkedUserId ?? link?.linkedUserId ?? client?.linkedUserId ?? null;
      const clientStatus: ClientStatus = client?.status ?? link?.clientStatus ?? 'active';
      const inviteEmailStatus: InviteEmailStatus =
        link?.inviteEmailStatus ?? client?.inviteEmailStatus ?? connection.inviteEmailStatus ?? 'not_requested';
      const clientDisplayName = getClientDisplayName({
        firstName: client?.firstName ?? fallbackNameParts.firstName ?? undefined,
        lastName: client?.lastName ?? fallbackNameParts.lastName ?? undefined,
        displayName: displayNameSource,
        email: client?.email ?? userProfile?.email ?? undefined,
        fallbackId: linkedUserId ?? connection.userId,
      });

      return {
        ...connection,
        linkedUserId,
        connectionSource: connection.connectionSource ?? (clientRecordId ? 'therapist_added' : 'request_accepted'),
        therapistVerifiedAtAddTime: connection.therapistVerifiedAtAddTime ?? link?.therapistVerifiedAtAddTime,
        emailSent: connection.emailSent ?? link?.emailSent ?? false,
        inviteEmailStatus,
        clientStatus,
        clientDisplayName,
        clientFirstName: client?.firstName ?? fallbackNameParts.firstName ?? displayNameSource ?? undefined,
        clientLastName: client?.lastName ?? fallbackNameParts.lastName ?? null,
        clientEmail: client?.email ?? userProfile?.email ?? null,
        clientPhone: client?.phone ?? null,
        clientNotes: client?.notes ?? null,
        requiresRegistration: Boolean(clientRecordId && !linkedUserId),
      } satisfies Connection;
    })
    .sort((left, right) => right.startedAt - left.startedAt);
}

export async function linkInvitedClientsToUserAccount({
  db,
  userId,
  email,
}: {
  db: Firestore;
  userId: string;
  email: string;
}): Promise<number> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return 0;
  }

  const clientsSnapshot = await db
    .collection('clients')
    .where('emailLower', '==', normalizedEmail)
    .get();

  if (clientsSnapshot.empty) {
    return 0;
  }

  const now = Date.now();
  let linkedCount = 0;

  for (const clientSnapshot of clientsSnapshot.docs) {
    const client = clientSnapshot.data() as ClientRecord;
    const connectionsSnapshot = await db
      .collection('connections')
      .where('clientRecordId', '==', clientSnapshot.id)
      .get();

    const batch = db.batch();
    batch.set(
      clientSnapshot.ref,
      sanitizeForFirestore({
        linkedUserId: userId,
        status: 'active',
        updatedAt: now,
      }),
      { merge: true }
    );

    connectionsSnapshot.docs.forEach((connectionSnapshot) => {
      const connection = connectionSnapshot.data() as Connection;
      batch.set(
        connectionSnapshot.ref,
        sanitizeForFirestore({
          userId,
          linkedUserId: userId,
          updatedAt: now,
        }),
        { merge: true }
      );
      batch.set(
        db.collection('therapistProfiles').doc(connection.therapistId).collection('clients').doc(clientSnapshot.id),
        sanitizeForFirestore({
          linkedUserId: userId,
          clientStatus: 'active',
          updatedAt: now,
        }),
        { merge: true }
      );
      batch.set(
        db.collection('chats').doc(connection.id),
        {
          id: connection.id,
          connectionId: connection.id,
          lastMessageAt: null,
        },
        { merge: true }
      );
    });

    await batch.commit();

    await Promise.all(
      connectionsSnapshot.docs.map(async (connectionSnapshot) => {
        const connection = connectionSnapshot.data() as Connection;
        await ensureConnectionConsent({
          db,
          connectionId: connection.id,
          userId,
          therapistId: connection.therapistId,
          now,
        });
      })
    );

    if (client.linkedUserId !== userId || client.status !== 'active') {
      linkedCount += 1;
    }
  }

  return linkedCount;
}
