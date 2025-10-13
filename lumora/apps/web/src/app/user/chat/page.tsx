import { ChatInterface } from '@/components/ChatInterface';
import { UserShell } from '@/components/UserShell';

export default function ChatPage() {
  return (
    <UserShell activeView="chat">
      <ChatInterface />
    </UserShell>
  );
}
