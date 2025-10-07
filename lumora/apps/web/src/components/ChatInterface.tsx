import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const welcomeMessage: Message = {
  id: '1',
  content:
    "Hello! I'm Lumora, your AI companion for mental health support. I'm here to listen, provide guidance, and help you navigate your thoughts and feelings. How are you doing today?",
  sender: 'assistant',
  timestamp: new Date(),
};

/** Reusable Lumora gradient orb (glow + smooth yellow→purple→blue) */
function GradientOrb({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="
        relative rounded-full
        bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500
        shadow-[0_0_40px_10px_rgba(147,112,219,0.30)]
        ring-1 ring-white/20
        flex-shrink-0
      "
    />
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return 'anon';
    return (
      document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('lumora_session='))?.split('=')[1] ||
      'anon'
    );
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
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

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          reply ||
          'Thank you for sharing. I am here to listen and support you.',
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          'I had trouble reaching our support service. Please try again in a moment.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const MIN_TEXTAREA_HEIGHT = 48;
    const MAX_TEXTAREA_HEIGHT = 240;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, MIN_TEXTAREA_HEIGHT),
      MAX_TEXTAREA_HEIGHT
    );
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [inputValue]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-blue-50/30">
      {/* Chat header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Orb can also be shown in header if you want */}
          {/* <GradientOrb size={40} /> */}
          <div>
            <h3 className="font-semibold text-gray-800">Chat</h3>
            <p className="text-sm text-green-600">Online • Always here for you</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`flex items-start gap-3 max-w-3xl ${
                message.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              {message.sender === 'user' ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
              ) : (
                <GradientOrb size={32} />
              )}

              {/* Bubble */}
              <div
                className={`
                px-4 py-3 rounded-2xl shadow-sm
                ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }
              `}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3 max-w-3xl">
              <GradientOrb size={48} />
              <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share what's on your mind..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{ minHeight: '48px' }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Lumora provides supportive guidance but is not a replacement for professional mental health care.
        </p>
      </div>
    </div>
  );
}
