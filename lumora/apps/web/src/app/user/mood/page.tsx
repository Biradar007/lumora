import { MoodTracker } from '@/components/MoodTracker';
import { UserShell } from '@/components/UserShell';

export default function MoodPage() {
  return (
    <UserShell activeView="mood">
      <MoodTracker />
    </UserShell>
  );
}
