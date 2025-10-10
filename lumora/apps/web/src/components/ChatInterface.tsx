import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Loader2, MessageSquare, PenLine, Plus, Send, Trash2, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useAuth } from '@/contexts/AuthContext';
import {
  addMessage,
  createSession,
  deleteSession,
  listSessions,
  renameSession,
  subscribeMessages,
  type MessageRecord,
  type SessionRecord,
} from '@/lib/chatStore';

interface DisplayMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  pending?: boolean;
}

const welcomeMessage: DisplayMessage = {
  id: 'lumora-welcome',
  content:
    "Hello! I'm Lumora, your AI companion for mental health support. I'm here to listen, provide guidance, and help you navigate your thoughts and feelings. How are you doing today?",
  sender: 'assistant',
  timestamp: new Date(),
};

let guestMessageCache: DisplayMessage[] | null = null;

function formatTimestamp(date?: Date) {
  if (!date) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function mapRecordToDisplay(messages: MessageRecord[]): DisplayMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    sender: msg.role === 'system' ? 'assistant' : msg.role,
    timestamp: msg.createdAt ?? new Date(),
  }));
}

export function ChatInterface() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLimit, setSessionsLimit] = useState(20);

  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesLimit, setMessagesLimit] = useState(50);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [guestMessages, setGuestMessages] = useState<DisplayMessage[]>(() => {
    if (guestMessageCache && guestMessageCache.length) {
      return guestMessageCache;
    }
    guestMessageCache = [welcomeMessage];
    return guestMessageCache;
  });
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!uid) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    setSessionsLoading(true);
    const unsubscribe = listSessions(
      uid,
      {
        limit: sessionsLimit,
        onError: () => setSessionsLoading(false),
      },
      (records) => {
        setSessions(records);
        setSessionsLoading(false);
        setActiveSessionId((prev) => prev ?? (records[0]?.id ?? null));
      }
    );

    return () => {
      unsubscribe();
      setSessions([]);
    };
  }, [uid, sessionsLimit]);

  useEffect(() => {
    if (!uid || !activeSessionId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);

    const unsubscribe = subscribeMessages(
      uid,
      activeSessionId,
      {
        limit: messagesLimit,
        onError: () => setMessagesLoading(false),
      },
      (records) => {
        setMessages(records);
        setMessagesLoading(false);
      }
    );

    return () => {
      unsubscribe();
      setMessages([]);
    };
  }, [uid, activeSessionId, messagesLimit]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const MIN_HEIGHT = 48;
    const MAX_HEIGHT = 240;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, guestMessages, isTyping]);

  useEffect(() => {
    if (uid) {
      guestMessageCache = [welcomeMessage];
      return;
    }

    setGuestMessages((prev) => {
      if (prev.length) {
        return prev;
      }
      const initial = guestMessageCache && guestMessageCache.length ? guestMessageCache : [welcomeMessage];
      guestMessageCache = initial;
      return initial;
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      guestMessageCache = guestMessages;
    }
  }, [guestMessages, uid]);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    if (!uid || !activeSessionId) {
      return guestMessages;
    }
    if (!messages.length) {
      return [welcomeMessage];
    }
    return mapRecordToDisplay(messages);
  }, [uid, activeSessionId, messages, guestMessages]);

  const handleCreateSession = async () => {
    if (!uid) {
      return;
    }
    try {
      const sessionId = await createSession(uid);
      setActiveSessionId(sessionId);
      setMessagesLimit(50);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create session', error);
    }
  };

  const handleRenameSession = async (session: SessionRecord) => {
    if (!uid) return;
    const currentTitle = session.title ?? '';
    const nextTitle = window.prompt('Rename conversation', currentTitle);
    if (nextTitle === null) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    try {
      await renameSession(uid, session.id, trimmed);
    } catch (error) {
      console.error('Failed to rename session', error);
    }
  };

  const handleDeleteSession = async (session: SessionRecord) => {
    if (!uid) return;
    const confirmed = window.confirm('Delete this conversation? This will remove all messages.');
    if (!confirmed) return;
    try {
      await deleteSession(uid, session.id);
      if (activeSessionId === session.id) {
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session', error);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (!uid) {
      const userMessage: DisplayMessage = {
        id: `guest-${Date.now()}`,
        content: trimmed,
        sender: 'user',
        timestamp: new Date(),
      };
      const nextMessages = [...guestMessages, userMessage];
      setGuestMessages(nextMessages);
      setInputValue('');
      setIsTyping(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'guest',
            messages: nextMessages.map((message) => ({
              role: message.sender,
              content: message.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('chat_request_failed');
        }

        const data: { reply?: string } = await response.json();
        const reply = data.reply?.trim();

        const assistantMessage: DisplayMessage = {
          id: `guest-${Date.now() + 1}`,
          content:
            reply || 'Thank you for sharing. I am here to listen and support you.',
          sender: 'assistant',
          timestamp: new Date(),
        };

        setGuestMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Guest chat request failed', error);
        const fallbackMessage: DisplayMessage = {
          id: `guest-${Date.now() + 1}`,
          content: 'I had trouble reaching our support service. Please try again in a moment.',
          sender: 'assistant',
          timestamp: new Date(),
        };
        setGuestMessages((prev) => [...prev, fallbackMessage]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    setInputValue('');
    setIsTyping(true);

    let sessionId = activeSessionId ?? null;

    try {
      if (!sessionId) {
        sessionId = await createSession(uid);
        setActiveSessionId(sessionId);
        setMessages([]);
        setMessagesLimit(50);
      }

      if (!sessionId) {
        throw new Error('Unable to resolve session.');
      }

      await addMessage(uid, sessionId, 'user', trimmed);

      const optimisticMessage: DisplayMessage = {
        id: `pending-${Date.now()}`,
        content: trimmed,
        sender: 'user',
        timestamp: new Date(),
      };

      const outgoingHistory = [...mapRecordToDisplay(messages), optimisticMessage];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          messages: outgoingHistory.map((message) => ({
            role: message.sender,
            content: message.content,
          })),
        }),
      });

      let reply: string | undefined;
      if (response.ok) {
        const data: { reply?: string } = await response.json();
        reply = data.reply?.trim();
      }

      await addMessage(
        uid,
        sessionId,
        'assistant',
        reply || 'Thank you for sharing. I am here to listen and support you.'
      );
    } catch (error) {
      console.error('Failed to send message', error);
      const fallback = 'I had trouble reaching our support service. Please try again in a moment.';
      if (uid && sessionId) {
        await addMessage(uid, sessionId, 'assistant', fallback);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const loadMoreSessions = () => {
    setSessionsLimit((prev) => prev + 20);
  };

  const loadMoreMessages = () => {
    setMessagesLimit((prev) => prev + 50);
  };

  const SessionsPane = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-gray-700">Conversations</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              handleCreateSession();
              onClose?.();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Close conversations"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {sessionsLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            Loading conversations…
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg bg-indigo-50 p-4 text-xs text-indigo-700">
            Start a new conversation to save your progress.
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`group rounded-xl px-3 py-2 transition ${
                  isActive ? 'bg-indigo-100/80 border border-indigo-200' : 'hover:bg-gray-100/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setMessagesLimit(50);
                    onClose?.();
                  }}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {session.title || session.lastMessagePreview || 'Untitled conversation'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {session.lastMessagePreview || 'No messages yet'}
                    </p>
                  </div>
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                    {formatTimestamp(session.updatedAt ?? session.createdAt)}
                  </span>
                </button>
                <div className="mt-1 hidden items-center justify-end gap-2 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => handleRenameSession(session)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-1.5 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
                  >
                    <PenLine className="h-3 w-3" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(session)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-1.5 py-1 text-[11px] text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {sessions.length >= sessionsLimit && (
        <div className="border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={loadMoreSessions}
            className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full bg-gradient-to-br from-white to-blue-50/40">
      {uid ? (
        <aside className="hidden w-72 border-r border-gray-200 bg-white/70 backdrop-blur-sm lg:flex lg:flex-col">
          <SessionsPane />
        </aside>
      ) : null}

      <div className="flex flex-1 flex-col">
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-800">Chat</h3>
              <p className="text-sm text-green-600">Online • Always here for you</p>
            </div>
            {uid ? (
              <button
                type="button"
                onClick={() => setMobileSessionsOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 lg:hidden"
              >
                <MessageSquare className="h-4 w-4" />
                Conversations
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-3 max-w-3xl ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {message.sender === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.30)] ring-1 ring-white/20" />
                )}

                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      a: ({ children, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" className="underline">
                          {children}
                        </a>
                      ),
                    }}
                    className={`prose prose-sm max-w-none break-words ${
                      message.sender === 'user'
                        ? 'prose-invert prose-headings:text-white prose-strong:text-white prose-em:text-white'
                        : 'prose-headings:text-gray-800 prose-p:text-gray-800'
                    } prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-1`}
                  >
                    {message.content}
                  </ReactMarkdown>
                  <p
                    className={`text-xs mt-2 ${
                      message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {messagesLoading && uid ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Loading messages…
            </div>
          ) : null}

          {uid && messages.length >= messagesLimit ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={loadMoreMessages}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                <Clock className="h-3.5 w-3.5" />
                Load previous messages
              </button>
            </div>
          ) : null}

          {isTyping ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Lumora is thinking…
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 bg-white/90 backdrop-blur-sm px-6 py-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Share how you're feeling, ask a question, or tell Lumora what's on your mind…"
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
              <p className="text-xs text-gray-400">Shift + Enter for a new line</p>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-indigo-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {uid && mobileSessionsOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40 backdrop-blur-sm lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close conversations overlay"
            onClick={() => setMobileSessionsOpen(false)}
          />
          <div className="relative z-10 h-full w-full max-w-xs bg-white shadow-2xl">
            <SessionsPane onClose={() => setMobileSessionsOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
