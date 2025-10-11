import type { ReactNode } from 'react';
import { TherapistShell } from '@/components/TherapistShell';

export default function TherapistLayout({ children }: { children: ReactNode }) {
  return <TherapistShell>{children}</TherapistShell>;
}
