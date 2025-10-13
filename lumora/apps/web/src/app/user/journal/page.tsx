import { Journal } from '@/components/Journal';
import { UserShell } from '@/components/UserShell';

export default function JournalPage() {
  return (
    <UserShell activeView="journal">
      <Journal />
    </UserShell>
  );
}
