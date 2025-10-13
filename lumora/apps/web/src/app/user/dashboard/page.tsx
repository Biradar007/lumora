import { Dashboard } from '@/components/Dashboard';
import { UserShell } from '@/components/UserShell';

export default function DashboardPage() {
  return (
    <UserShell activeView="dashboard">
      <Dashboard />
    </UserShell>
  );
}
