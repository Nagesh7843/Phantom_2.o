'use strict';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  Volume2,
  Download,
  Terminal,
  RotateCcw,
  Sparkles,
  Edit3,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ChatMessage, Role } from '@/types';

interface MessageItemProps {
  message: ChatMessage;
  userAvatar?: string | null;
  onSpeak: (text: string) => void;
  onSendToIDE?: (code: string, language: string) => void;
  onEditMessage?: (text: string) => void;
  onRetry?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userAvatar,
  onSpeak,
  onSendToIDE,
  onEditMessage,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState(false);

  const isUser = message.role === 'user';
  const textContent =
    message.parts.map((p) => p.text || '').join('\n').trim() || '';
  const hasImageAttachment = message.parts.some((p) => p.inlineData);
  const hasCitations = Boolean(
    message.searchMetadata?.citations && message.searchMetadata.citations.length > 0
  );

  const handleCopyFull = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([textContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phantom_response_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`group flex items-start gap-3.5 my-4 px-2 sm:px-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          userAvatar ? (
            <img
              src={userAvatar}
              alt="User"
              className="w-8 h-8 rounded-xl object-cover border border-zinc-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-white text-black font-bold flex items-center justify-center text-xs shadow-mono-glow">
              U
            </div>
          )
        ) : (
          <div className="w-8 h-8 rounded-xl bg-white p-0.5 shadow-mono-glow">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Message Bubble Content */}
      <div className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Meta Header */}
        <div className="flex items-center gap-2 mb-1 text-[11px] text-zinc-400">
          <span className="font-semibold text-zinc-300">{isUser ? 'You' : 'Phantom AI 2.0'}</span>
          <span>•</span>
          <span>
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'}
          </span>
          {!isUser && hasCitations && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] border border-emerald-800 flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />
              Web Verified
            </span>
          )}
        </div>

        {/* Bubble Box */}
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'user-bubble text-white rounded-tr-none shadow-mono-card'
              : 'ai-bubble text-white rounded-tl-none shadow-mono-card'
          }`}
        >
          {/* Real-Time Live Web Search Citations Box */}
          {!isUser && hasCitations && message.searchMetadata?.citations && (
            <div className="mb-3 p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 text-xs shadow-inner">
              <div
                className="flex items-center justify-between text-zinc-300 font-semibold cursor-pointer select-none"
                onClick={() => setShowCitations(!showCitations)}
              >
                <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono">
                  <Globe className="w-3.5 h-3.5" />
                  Real-Time Web Search ({message.searchMetadata.citations.length} Verified Sources)
                </span>
                {showCitations ? (
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>

              {showCitations && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-zinc-850 animate-in fade-in duration-150">
                  {message.searchMetadata.citations.map((c, i) => (
                    <a
                      key={i}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-zinc-900/70 hover:bg-zinc-850 text-[11px] text-zinc-300 hover:text-white transition-colors group"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-white group-hover:text-emerald-400 truncate block">
                          [{i + 1}] {c.title}
                        </span>
                        {c.snippet && (
                          <span className="text-zinc-500 text-[10px] line-clamp-1">{c.snippet}</span>
                        )}
                      </div>
                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-zinc-500 group-hover:text-white mt-0.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Display attached image preview if present */}
          {hasImageAttachment && (
            <div className="mb-3">
              {message.parts.map((p, i) =>
                p.inlineData ? (
                  <img
                    key={i}
                    src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`}
                    alt="Attached input"
                    className="max-h-60 rounded-xl object-contain border border-zinc-700"
                  />
                ) : null
              )}
            </div>
          )}

          {/* Typing indicator */}
          {message.typing && !textContent ? (
            <div className="flex items-center gap-1.5 py-1 px-2">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{textContent}</p>
          ) : (
            <div className="prose-phantom overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = !match && !codeString.includes('\n');
                    const codeId = `code_${Math.random()}`;

                    if (isInline) {
                      return <code className={className} {...props}>{children}</code>;
                    }

                    const lang = match ? match[1] : 'text';

                    return (
                      <div className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-black font-mono text-xs shadow-mono-card">
                        {/* Code Header Bar */}
                        <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800">
                          <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                            {lang}
                          </span>
                          <div className="flex items-center gap-2">
                            {onSendToIDE && (
                              <button
                                onClick={() => onSendToIDE(codeString, lang)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors text-[11px] border border-zinc-700"
                                title="Run this code in Web Editor / Dev Studio"
                              >
                                <Terminal className="w-3 h-3 text-white" />
                                <span>Run in IDE</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyCode(codeString, codeId)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors text-[11px] border border-zinc-700"
                            >
                              {copiedCodeId === codeId ? (
                                <>
                                  <Check className="w-3 h-3 text-white" />
                                  <span className="text-white">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        {/* Code Block Content */}
                        <pre className="p-4 overflow-x-auto text-zinc-100 bg-black selection:bg-zinc-700">
                          <code>{children}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {textContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        {!message.typing && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
            <button
              onClick={() => onSpeak(textContent)}
              className="p-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
              title="Speak message aloud (TTS)"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyFull}
              className="p-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
              title="Copy text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {!isUser && (
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
                title="Download as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            {isUser && onEditMessage && (
              <button
                onClick={() => onEditMessage(textContent)}
                className="p-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
                title="Edit message"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {!isUser && onRetry && (
              <button
                onClick={onRetry}
                className="p-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-colors"
                title="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

