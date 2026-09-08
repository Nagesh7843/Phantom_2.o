'use strict';
import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowRight,
  RefreshCw,
  Sparkles,
  Code2,
  ShieldCheck,
  Zap,
  Database,
  Palette,
  Globe,
  Compass,
} from 'lucide-react';
import { ChatMessage } from '@/types';
import { MessageItem } from './MessageItem';
import { api } from '@/lib/api';

interface DynamicSuggestion {
  id: string;
  category: string;
  title: string;
  desc: string;
  icon?: string;
  prompt: string;
}

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
  const [suggestions, setSuggestions] = useState<DynamicSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch real dynamic suggestions from backend (live web search + trending news)
  const fetchSuggestions = async (newOffset = 0) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await api.getDynamicSuggestions(newOffset);
      if (res?.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch (err) {
      console.warn('Failed to load dynamic suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (messages.length === 0) {
      fetchSuggestions(offset);
    }
  }, [messages.length]);

  const handleShuffle = () => {
    const nextOffset = offset + 1;
    setOffset(nextOffset);
    fetchSuggestions(nextOffset);
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'code':
        return Code2;
      case 'shield':
        return ShieldCheck;
      case 'zap':
        return Zap;
      case 'database':
        return Database;
      case 'palette':
        return Palette;
      case 'globe':
        return Globe;
      case 'sparkles':
        return Sparkles;
      default:
        return Compass;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-6 py-6 space-y-4">
      {messages.length === 0 ? (
        <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center py-8 px-4 animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 dark:text-white mb-2">
            How can Phantom assist you today?
          </h2>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 max-w-md mb-6">
            Next-generation multi-model AI, project code editor, and live web sandbox.
          </p>

          {/* Dynamic Suggestions Grid Header */}
          <div className="w-full flex items-center justify-between px-1 mb-3">
            <span className="text-[11px] font-semibold text-zinc-400 font-mono uppercase tracking-wider">
              Suggested Topics
            </span>
            <button
              type="button"
              onClick={handleShuffle}
              disabled={isLoadingSuggestions}
              className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-850 border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1.5 active:scale-95 group disabled:opacity-50"
              title="Fetch fresh dynamic suggestions"
            >
              <RefreshCw
                className={`w-3 h-3 transition-transform ${
                  isLoadingSuggestions
                    ? 'animate-spin text-white'
                    : 'group-hover:rotate-180 duration-500'
                }`}
              />
              <span className="text-[11px] font-medium">Shuffle Topics</span>
            </button>
          </div>

          {/* Dynamic Suggestions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
            {suggestions.map((s, idx) => {
              const Icon = getIcon(s.icon);
              return (
                <button
                  key={`${s.id}_${idx}`}
                  onClick={() => onSelectSuggestion(s.prompt)}
                  className="group relative p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-600 text-left transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-zinc-800 group-hover:bg-zinc-750 text-zinc-200 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 group-hover:text-zinc-300">
                          {s.category}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="font-semibold text-zinc-100 group-hover:text-white text-sm mb-1.5 tracking-tight line-clamp-1">
                      {s.title}
                    </h3>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-300 leading-relaxed line-clamp-2">
                      {s.desc}
                    </p>
                  </div>
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



