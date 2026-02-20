'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare, PenLine, Plus, Send, Trash2, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { createCheckoutSessionUrl, getBillingErrorMessage } from '@/lib/billingClient';
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

interface ChatUsage {
  plan: 'free' | 'pro';
  messagesUsed: number;
  messagesRemaining?: number;
  periodEnd: string;
  cooldownUntil?: string;
  retryAfterSeconds?: number;
}

interface MeResponse {
  user: {
    plan: 'free' | 'pro';
  };
  usage: {
    messagesUsed: number;
    messagesRemaining?: number;
    periodEnd: string;
    cooldownUntil?: string;
    retryAfterSeconds?: number;
  };
}

interface AiChatSuccessResponse {
  reply: string;
  usage: ChatUsage;
}

interface AiChatErrorResponse {
  code?: 'LIMIT_REACHED' | 'COOLDOWN';
  retryAfterSeconds?: number;
  usage?: Partial<ChatUsage>;
}

const FREE_MONTHLY_MESSAGE_LIMIT = 30;

const welcomeMessage: DisplayMessage = {
  id: 'lumora-welcome',
  content:
    "Hello! I'm Lumora, your AI companion for mental health support. I'm here to listen, provide guidance, and help you navigate your thoughts and feelings. How are you doing today?",
  sender: 'assistant',
  timestamp: new Date(),
};

const typingDotDelays = [0, 0.18, 0.36];
const MOBILE_CONVERSATIONS_EVENT = 'lumora:toggle-mobile-conversations';

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

function normalizeUsage(usage: ChatUsage): ChatUsage {
  if (usage.plan === 'free' && usage.messagesRemaining === undefined) {
    return {
      ...usage,
      messagesRemaining: Math.max(0, FREE_MONTHLY_MESSAGE_LIMIT - usage.messagesUsed),
    };
  }
  return usage;
}

function parseRetryAfterSeconds(usage: ChatUsage): number {
  if (typeof usage.retryAfterSeconds === 'number' && usage.retryAfterSeconds > 0) {
    return Math.ceil(usage.retryAfterSeconds);
  }
  if (!usage.cooldownUntil) {
    return 0;
  }
  const diffMs = new Date(usage.cooldownUntil).getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
}

export function ChatInterface() {
  const { user } = useAuth();
  const router = useRouter();
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
  const [chatError, setChatError] = useState<string | null>(null);

  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyUsage = useCallback((nextUsage: ChatUsage) => {
    const normalized = normalizeUsage(nextUsage);
    setUsage(normalized);
    setCooldownRemaining(parseRetryAfterSeconds(normalized));
    if (normalized.plan === 'free') {
      setLimitReached((normalized.messagesRemaining ?? 0) <= 0);
    } else {
      setLimitReached(false);
    }
  }, []);

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
    if (!user) {
      setUsage(null);
      setCooldownRemaining(0);
      setLimitReached(false);
      return;
    }

    let cancelled = false;

    const loadUsage = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/me', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as MeResponse;
        if (cancelled) {
          return;
        }

        applyUsage({
          plan: payload.user.plan,
          messagesUsed: payload.usage.messagesUsed,
          messagesRemaining: payload.usage.messagesRemaining,
          periodEnd: payload.usage.periodEnd,
          cooldownUntil: payload.usage.cooldownUntil,
          retryAfterSeconds: payload.usage.retryAfterSeconds,
        });
      } catch (error) {
        console.error('Failed to load chat usage', error);
      }
    };

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, [applyUsage, user]);

  const cooldownActive = cooldownRemaining > 0;

  useEffect(() => {
    if (!cooldownActive) {
      return;
    }
    const interval = window.setInterval(() => {
      setCooldownRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [cooldownActive]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const MIN_HEIGHT = 36;
    const MAX_HEIGHT = 240;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handler = () => {
      setMobileSessionsOpen((prev) => !prev);
    };
    window.addEventListener(MOBILE_CONVERSATIONS_EVENT, handler);
    return () => {
      window.removeEventListener(MOBILE_CONVERSATIONS_EVENT, handler);
    };
  }, []);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    if (!uid || !activeSessionId) {
      return [welcomeMessage];
    }
    const mapped = mapRecordToDisplay(messages);
    const hasWelcome = mapped.some((message) => message.id === welcomeMessage.id);
    if (hasWelcome) {
      return mapped;
    }
    return [welcomeMessage, ...mapped];
  }, [uid, activeSessionId, messages]);

  const lastDisplayedMessage = displayMessages.length ? displayMessages[displayMessages.length - 1] : null;
  const showTypingIndicator = isTyping && lastDisplayedMessage?.sender === 'user';

  const usageSummary = useMemo(() => {
    if (!usage) {
      return null;
    }
    if (usage.plan === 'pro') {
      return 'Pro: unlimited';
    }
    return `Remaining messages this month: ${usage.messagesRemaining ?? 0}`;
  }, [usage]);

  const periodResetLabel = useMemo(() => {
    if (!usage?.periodEnd) {
      return null;
    }
    const date = new Date(usage.periodEnd);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [usage?.periodEnd]);

  const sendDisabled = !inputValue.trim() || isTyping || cooldownActive || limitReached;

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

  const handleUpgradeToPro = useCallback(async () => {
    if (upgradeLoading) {
      return;
    }
    if (!user) {
      router.push(`/login?next=${encodeURIComponent('/billing/upgrade')}`);
      return;
    }

    setUpgradeLoading(true);
    setChatError(null);
    try {
      const token = await user.getIdToken();
      const checkoutUrl = await createCheckoutSessionUrl({
        idToken: token,
        returnPath: '/user/chat',
      });
      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error('Failed to start checkout from chat', error);
      const errorCode = error instanceof Error ? error.message : 'billing_session_failed';
      setChatError(getBillingErrorMessage(errorCode));
      setUpgradeLoading(false);
    }
  }, [router, upgradeLoading, user]);

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !uid || !user || cooldownActive || limitReached) {
      return;
    }

    setInputValue('');
    setIsTyping(true);
    setChatError(null);

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

      const token = await user.getIdToken();
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId: sessionId,
          message: trimmed,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as AiChatErrorResponse;
        if (errorPayload.usage && typeof errorPayload.usage.messagesUsed === 'number' && typeof errorPayload.usage.periodEnd === 'string') {
          applyUsage(
            normalizeUsage({
              plan: errorPayload.usage.plan === 'pro' ? 'pro' : usage?.plan ?? 'free',
              messagesUsed: errorPayload.usage.messagesUsed,
              messagesRemaining: errorPayload.usage.messagesRemaining,
              periodEnd: errorPayload.usage.periodEnd,
              cooldownUntil: errorPayload.usage.cooldownUntil,
              retryAfterSeconds: errorPayload.usage.retryAfterSeconds ?? errorPayload.retryAfterSeconds,
            })
          );
        } else if (response.status === 429 && typeof errorPayload.retryAfterSeconds === 'number') {
          setCooldownRemaining(Math.max(0, Math.ceil(errorPayload.retryAfterSeconds)));
        }

        if (response.status === 402 || errorPayload.code === 'LIMIT_REACHED') {
          setLimitReached(true);
          setChatError("You've used 30 messages this month. Upgrade to continue.");
          return;
        }

        if (response.status === 429 || errorPayload.code === 'COOLDOWN') {
          const retryAfter =
            errorPayload.retryAfterSeconds ??
            (errorPayload.usage && typeof errorPayload.usage.retryAfterSeconds === 'number'
              ? errorPayload.usage.retryAfterSeconds
              : cooldownRemaining);
          setChatError(`Cooldown active. Try again in ${Math.max(1, Math.ceil(retryAfter || 1))}s.`);
          return;
        }

        if (response.status === 401) {
          setChatError('Your session expired. Please sign in again.');
          return;
        }

        throw new Error('chat_request_failed');
      }

      const data = (await response.json()) as AiChatSuccessResponse;
      if (data.usage) {
        applyUsage(data.usage);
      }

      await addMessage(
        uid,
        sessionId,
        'assistant',
        data.reply?.trim() || 'Thank you for sharing. I am here to listen and support you.'
      );
    } catch (error) {
      console.error('Failed to send message', error);
      setChatError('I had trouble reaching our support service. Please try again in a moment.');
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

  const SessionsPane = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-gray-700">Conversations</span>
        </div>
        <div className="flex items-center gap-2">
          {uid ? (
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
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Close conversations"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessionsLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            <span className="mt-2">Loading conversations…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No conversations yet. Start one to see it here.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <li key={session.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setActiveSessionId(session.id);
                      onClose?.();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setActiveSessionId(session.id);
                        onClose?.();
                      }
                    }}
                    className={`group flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{session.title ?? 'New conversation'}</span>
                      <span className="text-xs text-gray-400">Updated {formatTimestamp(session.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 transition-opacity duration-150 lg:opacity-0 lg:hover:opacity-100 lg:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRenameSession(session);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1 text-xs text-indigo-500 hover:border-indigo-200"
                      >
                        <PenLine className="h-3 w-3" />
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteSession(session);
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-transparent p-1 text-red-400 hover:border-red-200"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {sessions.length >= sessionsLimit ? (
        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={loadMoreSessions}
            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border border-white/70 bg-gradient-to-br from-white via-indigo-50/40 to-purple-100/40 shadow-[0_30px_60px_-24px_rgba(79,70,229,0.4)]">
      <div className="flex flex-1 min-h-0 flex-col backdrop-blur-sm lg:flex-row">
        <aside
          className={`w-full min-h-0 border-b border-gray-200 lg:w-72 lg:border-r ${mobileSessionsOpen ? 'block' : 'hidden lg:block'}`}
        >
          <SessionsPane onClose={() => setMobileSessionsOpen(false)} />
        </aside>

        <section className="flex flex-1 min-h-0 flex-col">
          <header className="hidden flex-wrap items-center justify-between gap-4 border-b border-white/60 bg-white/70 px-6 py-5 backdrop-blur-md md:flex">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-800">Chat</h3>
              <p className="text-sm text-green-600">Online • Always here for you</p>
              {usageSummary ? <p className="text-xs text-slate-500">{usageSummary}</p> : null}
              {/* {usage?.plan === 'free' && periodResetLabel ? (
                <p className="text-xs text-slate-500">Resets on: {periodResetLabel}</p>
              ) : null} */}
              {/* {cooldownActive ? <p className="text-xs font-medium text-amber-600">Cooldown: {cooldownRemaining}s</p> : null} */}
            </div>
            {usage?.plan === 'free' ? (
              <button
                type="button"
                onClick={() => void handleUpgradeToPro()}
                disabled={upgradeLoading}
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {upgradeLoading ? 'Redirecting…' : 'Upgrade to Pro'}
              </button>
            ) : null}
          </header>

          {limitReached ? (
            <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">You&apos;ve used 30 messages this month.</p>
              <button
                type="button"
                onClick={() => void handleUpgradeToPro()}
                disabled={upgradeLoading}
                className="mt-1 inline-flex text-sm font-semibold text-amber-800 underline disabled:cursor-not-allowed disabled:opacity-70"
              >
                Upgrade to Pro
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white/40 via-indigo-50/40 to-indigo-100/40 px-6 py-8">
            {messagesLoading && uid ? (
              <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <span className="mt-2">Loading conversation…</span>
              </div>
            ) : (
              <div className="space-y-8">
                {displayMessages.map((message) => {
                  const isAssistant = message.sender === 'assistant';
                  const bubbleClasses = isAssistant
                    ? 'bg-white/90 text-slate-700 border border-white/80 shadow-[0_30px_60px_-30px_rgba(79,70,229,0.35)]'
                    : 'bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 text-white shadow-[0_35px_65px_-30px_rgba(37,99,235,0.65)]';

                  return (
                    <div key={message.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex w-full max-w-2xl flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                        <div className={`flex w-full items-end gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
                          {isAssistant ? (
                            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.30)] ring-1 ring-white/20" />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 text-white shadow-[0_18px_34px_-18px_rgba(37,99,235,0.55)]">
                              <User className="h-5 w-5" />
                            </div>
                          )}
                          <div className={`w-fit max-w-xl rounded-[26px] px-5 py-4 text-sm leading-relaxed backdrop-blur-sm ${bubbleClasses}`}>
                            <div className="prose prose-sm mt-0 max-w-none text-current prose-p:my-0 prose-ul:my-0 prose-ol:my-0">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            {message.pending ? (
                              <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400">
                                {typingDotDelays.map((delay) => (
                                  <span
                                    key={delay}
                                    className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
                                    style={{ animationDelay: `${delay}s` }}
                                  />
                                ))}
                                <span>Thinking…</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {showTypingIndicator ? (
                  <div className="flex justify-start">
                    <div className="flex w-full max-w-2xl items-end gap-3">
                      <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.30)] ring-1 ring-white/20" />
                      <div className="w-fit max-w-xl rounded-[26px] border border-white/70 bg-white/90 px-5 py-3 text-sm text-slate-500 shadow-[0_30px_60px_-30px_rgba(79,70,229,0.35)] backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-xs text-indigo-400">
                          {typingDotDelays.map((delay) => (
                            <span
                              key={delay}
                              className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
                              style={{ animationDelay: `${delay}s` }}
                            />
                          ))}
                          <span>Typing…</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-white/60 bg-white/80 px-3 py-3 backdrop-blur-lg sm:px-6 sm:py-4">
            <div className="rounded-[20px] border border-white/70 bg-white/90 px-3 py-2.5 shadow-[0_20px_40px_-28px_rgba(79,70,229,0.45)]">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  limitReached ? 'Monthly limit reached. Upgrade to continue.' : 'How are you feeling today?'
                }
                className="w-full resize-none rounded-2xl border-0 bg-transparent px-2 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none sm:text-base"
                rows={1}
                disabled={limitReached || cooldownActive}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-100/60 pt-2 sm:justify-between">
                <p className="text-xs text-slate-400 flex-1">Your conversation autosaves to your account.</p>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sendDisabled}
                  className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 text-white shadow-[0_16px_32px_-24px_rgba(37,99,235,0.7)] transition hover:from-indigo-600 hover:via-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto sm:w-auto sm:px-5 sm:py-2 sm:text-sm sm:font-semibold"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isTyping ? 'Sending...' : cooldownActive ? `Wait ${cooldownRemaining}s` : limitReached ? 'Limit reached' : 'Send'}
                  </span>
                </button>
              </div>
              {chatError ? <p className="mt-2 text-xs text-rose-600">{chatError}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
