'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Loader2, MessageSquare, PenLine, Plus, Send, Trash2, User, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { useApiHeaders } from '@/hooks/useApiHeaders';
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
const typingDotDelays = [0, 0.18, 0.36];

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
  const apiHeaders = useApiHeaders();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLimit, setSessionsLimit] = useState(20);

  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesLimit, setMessagesLimit] = useState(50);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [, setSessionTokens] = useState<Record<string, string>>({});
  const sessionTokensRef = useRef<Record<string, string>>({});
  const updateSessionTokens = useCallback(
    (updater: (current: Record<string, string>) => Record<string, string>) => {
      setSessionTokens((prev) => {
        const next = updater(prev);
        sessionTokensRef.current = next;
        return next;
      });
    },
    []
  );

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

  const ensureSessionToken = useCallback(
    async (sessionId: string | null): Promise<string | null> => {
      if (!uid || !sessionId) {
        return null;
      }

      const existing = sessionTokensRef.current[sessionId];
      if (existing) {
        return existing;
      }

      try {
        const response = await fetch('/api/chat/token', {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.warn('Session token request unauthorized. Skipping token refresh.');
            return null;
          }
          const detail = await response.text().catch(() => 'token_request_failed');
          throw new Error(detail || 'token_request_failed');
        }

        const data: { token: string } = await response.json();
        updateSessionTokens((prev) => ({ ...prev, [sessionId]: data.token }));
        return data.token;
      } catch (error) {
        console.error('Failed to ensure session token', error);
        return null;
      }
    },
    [apiHeaders, uid, updateSessionTokens]
  );

  useEffect(() => {
    if (!uid) {
      setSessions([]);
      setActiveSessionId(null);
      updateSessionTokens(() => ({}));
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
      updateSessionTokens(() => ({}));
    };
  }, [uid, sessionsLimit, updateSessionTokens]);

  useEffect(() => {
    if (!uid || !activeSessionId) {
      setMessages([]);
      return;
    }
    void ensureSessionToken(activeSessionId);
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
  }, [uid, activeSessionId, messagesLimit, ensureSessionToken]);

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
    const mapped = mapRecordToDisplay(messages);
    const hasWelcome = mapped.some((message) => message.id === welcomeMessage.id);
    if (hasWelcome) {
      return mapped;
    }
    return [welcomeMessage, ...mapped];
  }, [uid, activeSessionId, messages, guestMessages]);

  const lastDisplayedMessage = displayMessages.length ? displayMessages[displayMessages.length - 1] : null;
  const showTypingIndicator = isTyping && lastDisplayedMessage?.sender === 'user';

  const handleCreateSession = async () => {
    if (!uid) {
      return;
    }
    try {
      const sessionId = await createSession(uid);
      setActiveSessionId(sessionId);
      setMessagesLimit(50);
      setMessages([]);
      await ensureSessionToken(sessionId);
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
      updateSessionTokens((prev) => {
        if (!prev[session.id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
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
          headers: apiHeaders,
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
        await ensureSessionToken(sessionId);
      }

      if (!sessionId) {
        throw new Error('Unable to resolve session.');
      }

      const token = await ensureSessionToken(sessionId);
      if (!token) {
        throw new Error('Unable to obtain secure session token.');
      }

      const currentSessionId = sessionId;

      await addMessage(uid, sessionId, 'user', trimmed);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          token,
          message: trimmed,
        }),
      });

      let reply: string | undefined;
      if (response.ok) {
        const data: { reply?: string } = await response.json();
        reply = data.reply?.trim();
      } else {
        if (response.status === 401 && currentSessionId) {
          updateSessionTokens((prev) => {
            if (!prev[currentSessionId]) {
              return prev;
            }
            const next = { ...prev };
            delete next[currentSessionId];
            return next;
          });

          const refreshedToken = await ensureSessionToken(currentSessionId);
          if (!refreshedToken) {
            throw new Error('chat_request_failed');
          }

          const retryResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({ token: refreshedToken, message: trimmed }),
          });

          if (!retryResponse.ok) {
            throw new Error('chat_request_failed');
          }

          const retryData: { reply?: string } = await retryResponse.json();
          reply = retryData.reply?.trim();
        } else {
          throw new Error('chat_request_failed');
        }
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
          <div className="p-4 text-sm text-gray-500">
            {uid ? 'No conversations yet. Start one to see it here.' : 'Create an account to save your conversations.'}
          </div>
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
                      <span className="font-semibold">
                        {session.title ?? 'New conversation'}
                      </span>
                      <span className="text-xs text-gray-400">
                        Updated {formatTimestamp(session.updatedAt)}
                      </span>
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
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/60 bg-white/70 px-6 py-5 backdrop-blur-md">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
               <div>
              <h3 className="font-semibold text-gray-800">Chat</h3>
              <p className="text-sm text-green-600">Online • Always here for you</p>
            </div>
              </div>
              <p className="text-xs text-slate-400">
                {uid
                  ? ''
                  : 'Sign in to keep your conversations safe and revisit them anytime.'}
              </p>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileSessionsOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:bg-white"
              >
                Conversations
              </button>
            </div>
          </header>

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
                  const metaClasses = isAssistant ? 'text-slate-400' : 'text-indigo-100/90';

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

          <div className="border-t border-white/60 bg-white/80 px-6 py-5 backdrop-blur-lg">
            <div className="rounded-[28px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_24px_48px_-28px_rgba(79,70,229,0.45)]">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  uid ? 'How are you feeling today?' : "Share how you're feeling - no account needed."
                }
                className="w-full resize-none rounded-2xl border-0 bg-transparent px-2 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                rows={2}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100/60 pt-3">
                <p className="text-xs text-slate-400">
                  {uid
                    ? 'Your conversation autosaves to your account.'
                    : 'Guest chats are not stored. Sign in anytime to keep a history.'}
                </p>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_32px_-24px_rgba(37,99,235,0.7)] transition hover:from-indigo-600 hover:via-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isTyping ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
