import { UserShell } from '@/components/UserShell';
import { InsightReports } from '@/components/InsightReports';

export default function ReportsPage() {
  return (
    <UserShell activeView="reports">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <InsightReports mode="full" />
      </div>
    </UserShell>
  );
}

