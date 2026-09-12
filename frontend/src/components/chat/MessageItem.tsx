'use strict';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
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
  SmilePlus,
  Plus,
  Code2,
  FileCode,
  Info,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Cpu,
  GitCommit,
  Quote,
  Hash,
  Layers,
  Bug,
  Play,
} from 'lucide-react';
import { ChatMessage, Role } from '@/types';
import { EmojiPickerPopover } from './EmojiPickerPopover';
import { PhantomIconSvg } from '../common/PhantomLogo';

interface MessageItemProps {
  message: ChatMessage;
  userAvatar?: string | null;
  onSpeak: (text: string) => void;
  onSendToIDE?: (code: string, language: string) => void;
  onEditMessage?: (text: string) => void;
  onRetry?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const CP1252_MAP: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
  0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
  0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
};

function fixMojibake(str: string): string {
  if (!str) return '';
  if (!/[\u00C0-\u00FF]/.test(str)) return str;
  try {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (CP1252_MAP[code] !== undefined) {
        bytes.push(CP1252_MAP[code]);
      } else if (code <= 0xFF) {
        bytes.push(code);
      } else {
        const encoded = new TextEncoder().encode(str[i]);
        for (let j = 0; j < encoded.length; j++) {
          bytes.push(encoded[j]);
        }
      }
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  } catch {
    return str;
  }
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userAvatar,
  onSpeak,
  onSendToIDE,
  onEditMessage,
  onRetry,
  onReact,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>(message.reactions || {});
  const [userReactions, setUserReactions] = useState<string[]>(message.userReactions || []);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);

  const reactionMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionMenuRef.current && !reactionMenuRef.current.contains(e.target as Node)) {
        setShowReactionMenu(false);
        setShowFullPicker(false);
      }
    };
    if (showReactionMenu || showFullPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactionMenu, showFullPicker]);

  const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🚀', '💡', '😂', '🎉'];

  const handleToggleReaction = (emoji: string) => {
    const hasReacted = userReactions.includes(emoji);
    const updatedUserReactions = hasReacted
      ? userReactions.filter((e) => e !== emoji)
      : [...userReactions, emoji];

    const updatedReactions = { ...reactions };
    if (hasReacted) {
      const newCount = (updatedReactions[emoji] || 1) - 1;
      if (newCount <= 0) {
        delete updatedReactions[emoji];
      } else {
        updatedReactions[emoji] = newCount;
      }
    } else {
      updatedReactions[emoji] = (updatedReactions[emoji] || 0) + 1;
    }

    setUserReactions(updatedUserReactions);
    setReactions(updatedReactions);
    setShowReactionMenu(false);
    setShowFullPicker(false);
    onReact?.(message.id, emoji);
  };

  const isUser = message.role === 'user';
  const rawText =
    message.parts.map((p) => p.text || '').join('\n').trim() || '';
  const textContent = fixMojibake(rawText);
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
          <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-sm">
            <PhantomIconSvg className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'max-w-[88%] sm:max-w-[80%] items-end' : 'flex-1 min-w-0 items-start'}`}>
        {/* User Meta Header (Only for User) */}
        {isUser && (
          <div className="flex items-center gap-2 mb-1 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300">You</span>
            <span>•</span>
            <span>
              {message.timestamp
                ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now'}
            </span>
          </div>
        )}

        {/* Message Body (Open Layout for AI, Sleek Bubble for User) */}
        <div
          className={`text-sm leading-relaxed ${
            isUser
              ? 'user-bubble text-white p-3.5 rounded-2xl rounded-tr-none shadow-mono-card'
              : 'w-full text-zinc-100 py-0.5'
          }`}
        >

          {/* Display attached image, video, and audio preview if present */}
          {hasImageAttachment && (
            <div className="mb-3 space-y-2">
              {message.parts.map((p, i) => {
                if (!p.inlineData) return null;
                const mime = p.inlineData.mimeType || '';

                if (mime.startsWith('image/')) {
                  return (
                    <img
                      key={i}
                      src={`data:${mime};base64,${p.inlineData.data}`}
                      alt="Attached media"
                      className="max-h-64 rounded-xl object-contain border border-zinc-700 bg-black/40 shadow-sm"
                    />
                  );
                }

                if (mime.startsWith('video/')) {
                  return (
                    <div key={i} className="max-w-md rounded-xl overflow-hidden border border-zinc-700 bg-black shadow-md">
                      <video
                        controls
                        src={`data:${mime};base64,${p.inlineData.data}`}
                        className="w-full max-h-72 object-contain"
                      />
                    </div>
                  );
                }

                if (mime.startsWith('audio/')) {
                  return (
                    <div key={i} className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 max-w-sm">
                      <audio
                        controls
                        src={`data:${mime};base64,${p.inlineData.data}`}
                        className="w-full h-8"
                      />
                    </div>
                  );
                }

                return null;
              })}
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
            <div className="prose-phantom overflow-hidden w-full">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre({ children }: any) {
                    return <>{children}</>;
                  },
                  code({ node, className, children, ...props }: any) {
                    const match = /language-([^\s]+)/.exec(className || '');
                    let rawLang = match ? match[1].toLowerCase() : '';
                    let detectedFileName = '';

                    // Check if language tag includes a file name (e.g. language-python:app.py)
                    if (rawLang.includes(':')) {
                      const parts = rawLang.split(':');
                      rawLang = parts[0];
                      detectedFileName = parts.slice(1).join(':');
                    }

                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = (!match && !className?.includes('hljs') && !codeString.includes('\n')) || (!rawLang && !codeString.includes('\n'));
                    const codeId = `code_${Math.random().toString(36).substring(2, 9)}`;

                    if (isInline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-zinc-800/90 border border-zinc-700/60 font-mono text-[12px] text-zinc-200 font-medium select-all"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    // Extract file name from comment in first line if not specified in language tag
                    if (!detectedFileName && codeString) {
                      const firstLine = codeString.split('\n')[0].trim();
                      const fileCommentMatch = /^(?:\/\/\s*|#\s*|\/\*\s*|<!--\s*)([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)(?:\s*\*\/|\s*-->)?$/.exec(firstLine);
                      if (fileCommentMatch) {
                        detectedFileName = fileCommentMatch[1];
                      }
                    }

                    const displayLang = rawLang || 'text';
                    const isCommand = ['bash', 'sh', 'shell', 'zsh', 'cmd', 'powershell', 'ps1', 'bat', 'terminal', 'cli'].includes(displayLang);
                    const isDiff = ['diff', 'patch'].includes(displayLang);
                    const isError = ['error', 'stderr', 'traceback', 'exception'].includes(displayLang);

                    // 1. Line-by-Line Code Diff Viewer
                    if (isDiff) {
                      const diffLines = codeString.split('\n');
                      return (
                        <div className="my-3.5 rounded-xl overflow-hidden border border-zinc-800 bg-black font-mono text-xs shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 select-none">
                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 font-medium">
                              <GitCommit className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="lowercase">diff viewer</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(codeString, codeId)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            >
                              {copiedCodeId === codeId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="px-5 py-3.5 overflow-x-auto text-[12px] leading-relaxed bg-black space-y-0.5">
                            {diffLines.map((line, idx) => {
                              const isAdd = line.startsWith('+') && !line.startsWith('+++');
                              const isDel = line.startsWith('-') && !line.startsWith('---');
                              const isHdr = line.startsWith('@@');

                              return (
                                <div
                                  key={idx}
                                  className={`px-2 py-0.5 rounded font-mono ${
                                    isAdd
                                      ? 'bg-emerald-950/40 text-emerald-300 font-medium'
                                      : isDel
                                      ? 'bg-rose-950/40 text-rose-300 font-medium'
                                      : isHdr
                                      ? 'bg-indigo-950/30 text-indigo-300 font-semibold'
                                      : 'text-zinc-300'
                                  }`}
                                >
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // 2. Error / Diagnostic Block
                    if (isError) {
                      return (
                        <div className="my-3.5 rounded-xl overflow-hidden border border-rose-900/50 bg-rose-950/20 font-mono text-xs shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-rose-950/40 border-b border-rose-900/40 select-none">
                            <div className="flex items-center gap-2 text-xs font-mono text-rose-300 font-semibold uppercase tracking-wider">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                              <span>Error / Diagnostic</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(codeString, codeId)}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-900/40 transition-colors"
                            >
                              {copiedCodeId === codeId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="code-pre overflow-x-auto text-rose-200 leading-relaxed font-mono text-[13px] bg-black/40">
                            <code className="block">{children}</code>
                          </pre>
                        </div>
                      );
                    }

                    // 3. Terminal / Command Card
                    if (isCommand) {
                      return (
                        <div className="my-3.5 rounded-xl overflow-hidden border border-zinc-800 bg-[#09090b] font-mono text-xs shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 select-none">
                            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-medium">
                              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="lowercase">{displayLang}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {onSendToIDE && (
                                <button
                                  type="button"
                                  onClick={() => onSendToIDE(codeString, displayLang)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800 transition-colors"
                                  title="Run Command in Dev Studio Terminal"
                                >
                                  <Terminal className="w-3.5 h-3.5" />
                                  <span>Run Command</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopyCode(codeString, codeId)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              >
                                {copiedCodeId === codeId ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                          <pre className="code-pre overflow-x-auto text-zinc-100 selection:bg-zinc-800 leading-relaxed font-mono text-[13px] bg-black">
                            <code className={`block ${className || ''}`}>{children}</code>
                          </pre>
                        </div>
                      );
                    }

                    // 4. Syntax-Highlighted Code Box (Java, Python, JS, TS, HTML, CSS, etc.)
                    return (
                      <div className="my-3.5 rounded-xl overflow-hidden border border-zinc-800 bg-[#09090b] font-mono text-xs shadow-sm">
                        {/* Header Bar */}
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 select-none">
                          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 font-medium">
                            {detectedFileName ? (
                              <>
                                <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-zinc-200 font-semibold">{detectedFileName}</span>
                                <span className="text-[11px] text-zinc-500 lowercase">({displayLang})</span>
                              </>
                            ) : (
                              <>
                                <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-zinc-400 lowercase">{displayLang}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {onSendToIDE && displayLang !== 'text' && (
                              <button
                                type="button"
                                onClick={() => onSendToIDE(codeString, displayLang)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                title="Run in Dev Studio"
                              >
                                <Play className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Run in IDE</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyCode(codeString, codeId)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            >
                              {copiedCodeId === codeId ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Highlighted Code Area */}
                        <pre className="code-pre overflow-x-auto text-zinc-100 bg-[#0c0c0e] selection:bg-zinc-800 leading-relaxed font-mono text-[13px]">
                          <code className={`block ${className || ''}`}>{children}</code>
                        </pre>
                      </div>
                    );
                  },
                  blockquote({ children }: any) {
                    const extractText = (node: any): string => {
                      if (!node) return '';
                      if (typeof node === 'string') return node;
                      if (Array.isArray(node)) return node.map(extractText).join(' ');
                      if (node.props?.children) return extractText(node.props.children);
                      return '';
                    };

                    const text = extractText(children).toLowerCase().trim();

                    let title = 'Note';
                    let icon = <Info className="w-3.5 h-3.5 text-sky-400" />;
                    let borderClass = 'border-l-4 border-sky-400 border-zinc-800 bg-zinc-900/60';
                    let badgeClass = 'text-sky-400';

                    if (text.includes('[!tip]') || text.includes('tip:') || text.includes('pro tip') || text.includes('💡')) {
                      title = 'Pro Tip';
                      icon = <Lightbulb className="w-3.5 h-3.5 text-emerald-400" />;
                      borderClass = 'border-l-4 border-emerald-400 border-zinc-800 bg-emerald-950/15';
                      badgeClass = 'text-emerald-400';
                    } else if (text.includes('[!warning]') || text.includes('warning:') || text.includes('⚠️')) {
                      title = 'Warning';
                      icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
                      borderClass = 'border-l-4 border-amber-400 border-zinc-800 bg-amber-950/15';
                      badgeClass = 'text-amber-400';
                    } else if (text.includes('[!error]') || text.includes('error:') || text.includes('problem:') || text.includes('bug:') || text.includes('🛑')) {
                      title = 'Error / Problem Diagnosis';
                      icon = <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />;
                      borderClass = 'border-l-4 border-rose-400 border-zinc-800 bg-rose-950/15';
                      badgeClass = 'text-rose-400';
                    } else if (text.includes('[!important]') || text.includes('important:') || text.includes('caution:') || text.includes('⚡')) {
                      title = 'Important Note';
                      icon = <AlertCircle className="w-3.5 h-3.5 text-violet-400" />;
                      borderClass = 'border-l-4 border-violet-400 border-zinc-800 bg-violet-950/15';
                      badgeClass = 'text-violet-400';
                    } else if (text.includes('quote:') || text.startsWith('"')) {
                      title = 'Quote';
                      icon = <Quote className="w-3.5 h-3.5 text-zinc-400" />;
                      borderClass = 'border-l-4 border-zinc-500 border-zinc-800 bg-zinc-900/40';
                      badgeClass = 'text-zinc-400';
                    }

                    return (
                      <div className={`my-3.5 p-3.5 rounded-xl border ${borderClass} text-zinc-200 text-xs leading-relaxed space-y-1.5 shadow-sm`}>
                        <div className={`flex items-center gap-1.5 text-[11px] font-bold ${badgeClass} uppercase tracking-wider select-none`}>
                          {icon}
                          <span>{title}</span>
                        </div>
                        <div className="text-zinc-300 [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</div>
                      </div>
                    );
                  },
                  p({ children }: any) {
                    return <p className="mb-3 last:mb-0 leading-relaxed text-zinc-200 text-sm">{children}</p>;
                  },
                  h1({ children }: any) {
                    return (
                      <h1 className="text-lg font-bold text-white mt-5 mb-2 pb-1.5 border-b border-zinc-800 tracking-tight">
                        {children}
                      </h1>
                    );
                  },
                  h2({ children }: any) {
                    return (
                      <h2 className="text-base font-bold text-zinc-100 mt-4 mb-2 tracking-tight">
                        {children}
                      </h2>
                    );
                  },
                  h3({ children }: any) {
                    return (
                      <h3 className="text-sm font-semibold text-zinc-200 mt-3.5 mb-1.5 tracking-tight">
                        {children}
                      </h3>
                    );
                  },
                  h4({ children }: any) {
                    return (
                      <h4 className="text-xs font-semibold text-zinc-300 mt-2.5 mb-1 uppercase tracking-wider">
                        {children}
                      </h4>
                    );
                  },
                  ol({ children }: any) {
                    return (
                      <ol className="my-3 list-decimal pl-5 space-y-1.5 text-zinc-200 text-sm leading-relaxed marker:text-zinc-400 marker:font-semibold">
                        {children}
                      </ol>
                    );
                  },
                  ul({ children }: any) {
                    return (
                      <ul className="my-3 list-disc pl-5 space-y-1.5 text-zinc-200 text-sm leading-relaxed marker:text-zinc-500">
                        {children}
                      </ul>
                    );
                  },
                  li({ children }: any) {
                    return <li className="leading-relaxed pl-0.5 mb-1">{children}</li>;
                  },
                  a({ href, children, ...props }: any) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2 transition-colors"
                        {...props}
                      >
                        <span>{children}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-sky-400/80" />
                      </a>
                    );
                  },
                  img({ src, alt, ...props }: any) {
                    return (
                      <div className="my-3.5 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-1.5 shadow-sm max-w-lg">
                        <img
                          src={src}
                          alt={alt || 'Image'}
                          className="w-full rounded-lg object-contain max-h-80"
                          loading="lazy"
                          {...props}
                        />
                        {alt && <p className="mt-1 px-2 text-[11px] text-zinc-400 italic text-center">{alt}</p>}
                      </div>
                    );
                  },
                  table({ children }: any) {
                    return (
                      <div className="my-3.5 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 shadow-sm">
                        <table className="w-full text-xs text-left text-zinc-200 border-collapse">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }: any) {
                    return (
                      <th className="px-3.5 py-2.5 bg-zinc-900 border-b border-zinc-800 font-bold text-white text-[11px] uppercase tracking-wider">
                        {children}
                      </th>
                    );
                  },
                  td({ children }: any) {
                    return (
                      <td className="px-3.5 py-2 border-b border-zinc-850 text-zinc-300 hover:bg-zinc-900/30 transition-colors">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {textContent}
              </ReactMarkdown>

              {/* Subtle Footnote Sources at bottom */}
              {!isUser && hasCitations && message.searchMetadata?.citations && (
                <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                  <span className="text-[10px] text-zinc-500 font-mono">Sources:</span>
                  {message.searchMetadata.citations.slice(0, 4).map((c, i) => (
                    <a
                      key={i}
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                      title={c.title}
                    >
                      <span className="truncate max-w-[120px]">{c.title}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emoji Reactions Badges */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {Object.entries(reactions).map(([emoji, count]) => {
              const hasReacted = userReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggleReaction(emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    hasReacted
                      ? 'bg-zinc-800 text-white border border-zinc-600 shadow-sm'
                      : 'bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700'
                  }`}
                  title={`${count} reaction${count > 1 ? 's' : ''} with ${emoji} (click to toggle)`}
                >
                  <span className="text-base font-emoji select-none leading-none">{emoji}</span>
                  <span className="text-[11px] font-mono text-zinc-300 font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action Toolbar */}
        {!message.typing && (
          <div className="relative flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400">
            {/* Quick Emoji Reaction Trigger */}
            <div className="relative" ref={reactionMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowReactionMenu(!showReactionMenu);
                  setShowFullPicker(false);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  showReactionMenu || showFullPicker
                    ? 'bg-zinc-800 text-amber-400'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`}
                title="Add emoji reaction"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>

              {/* Floating Quick Reaction Toolbar */}
              {showReactionMenu && (
                <div
                  className={`absolute bottom-full mb-1.5 p-1 rounded-2xl bg-zinc-950/95 border border-zinc-700 shadow-2xl backdrop-blur-xl z-50 flex items-center gap-1 animate-fade-in ${
                    isUser ? 'right-0' : 'left-0'
                  }`}
                >
                  {QUICK_REACTIONS.map((emoji) => {
                    const isSelected = userReactions.includes(emoji);
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(emoji)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-base font-emoji hover:scale-125 active:scale-95 transition-all cursor-pointer leading-none ${
                          isSelected ? 'bg-zinc-800 border border-zinc-600' : 'hover:bg-zinc-850'
                        }`}
                        title={`React with ${emoji}`}
                      >
                        <span className="font-emoji select-none">{emoji}</span>
                      </button>
                    );
                  })}
                  <div className="w-[1px] h-4 bg-zinc-800 my-auto" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowFullPicker(true);
                      setShowReactionMenu(false);
                    }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-xs hover:bg-zinc-850 hover:text-white text-zinc-400 transition-colors"
                    title="More emojis..."
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Full Emoji Picker Popover for Reactions */}
              {showFullPicker && (
                <div
                  className={`absolute bottom-full mb-2 z-50 ${
                    isUser ? 'right-0' : 'left-0'
                  }`}
                >
                  <EmojiPickerPopover
                    onSelectEmoji={(emoji) => handleToggleReaction(emoji)}
                    onClose={() => setShowFullPicker(false)}
                  />
                </div>
              )}
            </div>

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

