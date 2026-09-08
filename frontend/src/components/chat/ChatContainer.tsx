'use strict';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ArrowRight,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { ChatMessage } from '@/types';
import { MessageItem } from './MessageItem';
import { getDailyPromptSuggestions, PromptSuggestion } from '@/lib/dailyPrompts';

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
  const [shuffleCount, setShuffleCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Dynamic daily prompts refreshed deterministically every calendar day or via shuffle button
  const dailyData = useMemo(() => {
    return getDailyPromptSuggestions(shuffleCount);
  }, [shuffleCount]);

  const handleShuffle = () => {
    setIsRefreshing(true);
    setShuffleCount((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 300);
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

          {/* Daily Suggestions Header with Shuffle Button */}
          <div className="w-full flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 font-mono uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{dailyData.dayLabel}</span>
            </div>
            <button
              type="button"
              onClick={handleShuffle}
              className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-850 border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1.5 active:scale-95 group"
              title="Get a fresh set of prompt ideas"
            >
              <RefreshCw className={`w-3 h-3 transition-transform ${isRefreshing ? 'animate-spin text-white' : 'group-hover:rotate-180 duration-500'}`} />
              <span className="text-[11px] font-medium">Shuffle Topics</span>
            </button>
          </div>

          {/* Dynamic Suggestions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
            {dailyData.suggestions.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={`${s.id}_${shuffleCount}_${idx}`}
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
                    <h3 className="font-semibold text-zinc-100 group-hover:text-white text-sm mb-1.5 tracking-tight">
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


