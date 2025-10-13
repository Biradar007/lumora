'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage } from '@/types/domain';

interface ChatProps {
  connectionId: string;
  disabled?: boolean;
}

export function Chat({ connectionId, disabled }: ChatProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const headers = useMemo(() => {
    const next: HeadersInit = {
      'content-type': 'application/json',
    };
    if (user?.uid) {
      next['x-user-id'] = user.uid;
    }
    if (profile?.role) {
      next['x-user-role'] = profile.role;
    }
    return next;
  }, [profile?.role, user?.uid]);

  useEffect(() => {
    let active = true;
    const loadMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/chats/${connectionId}/messages`, { headers });
        if (!response.ok) {
          throw new Error('Failed to load messages');
        }
        const data = (await response.json()) as { messages: ChatMessage[] };
        if (!active) {
          return;
        }
        setMessages(data.messages ?? []);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void loadMessages();
    const interval = setInterval(loadMessages, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [connectionId, headers]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) {
      return;
    }
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      chatId: connectionId,
      senderId: user?.uid ?? 'me',
      content: input.trim(),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    try {
      const response = await fetch(`/api/chats/${connectionId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: optimistic.content }),
      });
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      const data = (await response.json()) as { message: ChatMessage };
      setMessages((prev) => prev.map((msg) => (msg.id === optimistic.id ? data.message : msg)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => prev.filter((msg) => msg.id !== optimistic.id));
    }
  };

  if (!user) {
    return <p className="text-sm text-slate-500">Sign in to access chat.</p>;
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading && <p className="text-sm text-slate-500">Loading messages…</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {!loading && messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        {messages.map((message) => {
          const mine = message.senderId === user.uid;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm ${
                  mine ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p>{message.content}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={disabled}
            placeholder={disabled ? 'Chat disabled' : 'Type a message…'}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
