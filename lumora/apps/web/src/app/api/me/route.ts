import { NextResponse } from 'next/server';
import {
  buildUsageResponse,
  createUsageState,
  normalizeUsageState,
  resolvePlan,
  resetUsageForCurrentMonth,
  serializeUsageState,
  shouldResetUsagePeriod,
  type UserPlan,
} from '@/lib/aiUsage';
import { jsonError, requireFirebaseAuth } from '@/lib/apiAuth';
import { getServerFirestore } from '@/lib/firestoreServer';

export const runtime = 'nodejs';

type UserDoc = {
  plan?: UserPlan;
};

export async function GET(request: Request) {
  try {
    const auth = await requireFirebaseAuth(request);
    const now = new Date();
    const db = getServerFirestore();
    const userRef = db.collection('users').doc(auth.userId);
    const usageRef = db.collection('usage').doc(auth.userId);

    const result = await db.runTransaction(async (tx) => {
      const [userSnapshot, usageSnapshot] = await Promise.all([tx.get(userRef), tx.get(usageRef)]);

      const userData = (userSnapshot.data() ?? {}) as UserDoc;
      let plan = resolvePlan(userData.plan);

      if (!userSnapshot.exists) {
        plan = 'free';
        tx.set(
          userRef,
          {
            plan,
            createdAt: now,
          },
          { merge: true }
        );
      } else if (userData.plan !== 'free' && userData.plan !== 'pro') {
        plan = 'free';
        tx.set(
          userRef,
          {
            plan,
          },
          { merge: true }
        );
      }

      let usage = usageSnapshot.exists ? normalizeUsageState(usageSnapshot.data(), now) : createUsageState(now);

      if (!usageSnapshot.exists || shouldResetUsagePeriod(usage, now)) {
        usage = resetUsageForCurrentMonth(now);
        tx.set(usageRef, serializeUsageState(usage), { merge: true });
      }

      return { plan, usage };
    });

    return NextResponse.json({
      user: {
        plan: result.plan,
      },
      usage: buildUsageResponse(result.plan, result.usage, now),
    });
  } catch (error) {
    return jsonError(error);
  }
}
