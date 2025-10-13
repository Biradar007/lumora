'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CrisisSupport } from '@/components/CrisisSupport';
import { UserShell } from '@/components/UserShell';
import { VIEW_TO_PATH } from '@/components/user/viewTypes';

export default function CrisisPage() {
  const router = useRouter();

  const handleReturnToChat = useCallback(() => {
    router.push(VIEW_TO_PATH.chat);
  }, [router]);

  return (
    <UserShell activeView="crisis">
      <CrisisSupport onReturnToChat={handleReturnToChat} />
    </UserShell>
  );
}
