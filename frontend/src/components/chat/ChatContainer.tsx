'use strict';
import React, { useRef, useEffect } from 'react';
import {
  Sparkles,
  Code2,
  Image as ImageIcon,
  ShieldAlert,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { ChatMessage } from '@/types';
import { MessageItem } from './MessageItem';

interface ChatContainerProps {
  messages: ChatMessage[];
  userAvatar?: string | null;
  onSpeak: (text: string) => void;
  onSendToIDE?: (code: string, language: string) => void;
  onEditMessage?: (text: string) => void;
  onRetry?: () => void;
  onSelectSuggestion: (text: string) => void;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  userAvatar,
  onSpeak,
  onSendToIDE,
  onEditMessage,
  onRetry,
  onSelectSuggestion,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = [
    {
      title: 'Analyze & Debug Code',
      desc: 'Build web sandbox apps or fix complex async code',
      icon: Code2,
      prompt: 'Can you analyze this code, explain its logic, and show optimized performance improvements?',
    },
    {
      title: 'Generate Creative Visuals',
      desc: 'Create high-contrast visuals, logos, and UI concept art',
      icon: ImageIcon,
      prompt: 'Create a high-contrast minimalist monochrome architectural concept rendering in 8k resolution',
    },
    {
      title: 'Security & Architecture Audit',
      desc: 'Evaluate API security, sanitization, and best practices',
      icon: ShieldAlert,
      prompt: 'Explain best practices for securing REST, WebSocket, and GraphQL endpoints against vulnerabilities',
    },
    {
      title: 'AI & System Architecture',
      desc: 'Deep dive into Transformer architectures & tokenization',
      icon: Compass,
      prompt: 'Explain the internal mechanics of LLM attention mechanisms and token embedding matrices in depth',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-6 space-y-4">
      {messages.length === 0 ? (
        <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center py-8 px-4 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 dark:text-white mb-2">
            How can Phantom assist you today?
          </h2>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 max-w-md mb-8">
            Next-generation multi-model AI, project code editor, and live web sandbox.
          </p>

          {/* Quick Start Suggestions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
            {suggestions.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion(s.prompt)}
                  className="group relative p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-500 text-left transition-all duration-200 shadow-lg active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Icon className="w-5 h-5 text-zinc-200 group-hover:text-white transition-colors" />
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="font-semibold text-zinc-100 group-hover:text-white text-sm mb-1">{s.title}</h3>
                  <p className="text-xs text-zinc-400 group-hover:text-zinc-300 leading-relaxed">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              userAvatar={userAvatar}
              onSpeak={onSpeak}
              onSendToIDE={onSendToIDE}
              onEditMessage={onEditMessage}
              onRetry={onRetry}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

