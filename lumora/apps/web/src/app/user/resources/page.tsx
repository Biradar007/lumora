'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Resources } from '@/components/Resources';
import { UserShell } from '@/components/UserShell';
import { VIEW_TO_PATH } from '@/components/user/viewTypes';

export default function ResourcesPage() {
  const router = useRouter();

  const handleNavigateToCrisis = useCallback(() => {
    router.push(VIEW_TO_PATH.crisis);
  }, [router]);

  return (
    <UserShell activeView="resources">
      <Resources onNavigateToCrisis={handleNavigateToCrisis} />
    </UserShell>
  );
}
