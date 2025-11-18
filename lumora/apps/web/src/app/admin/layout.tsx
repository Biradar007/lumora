import { Suspense, type ReactNode } from 'react';
import { AdminShell } from '@/components/AdminShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
