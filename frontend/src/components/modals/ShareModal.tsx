'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Twitter,
  Linkedin,
  Mail,
  Smartphone,
  Calendar,
} from 'lucide-react';
import { ChatMessage, UserProfile } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  sessionId?: string;
  messages: ChatMessage[];
  userProfile?: UserProfile | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  sessionTitle,
  sessionId,
  messages,
  userProfile,
}) => {
  const [copied, setCopied] = useState(false);
  const [includeName, setIncludeName] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const url = `${origin}?shared_chat=${encodeURIComponent(sessionId || 'guest_session')}`;
      setShareUrl(url);
    }
  }, [sessionId, isOpen]);

  if (!isOpen) return null;

  const authorName = userProfile?.user.displayName || userProfile?.user.email?.split('@')[0] || 'Anonymous';
  const displayTitle = sessionTitle || 'Phantom AI Conversation';
  const firstUserMsg = messages.find((m) => m.role === 'user');
  const firstAIMsg = messages.find((m) => m.role === 'model' || m.role === 'system');

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          text: `Check out this AI conversation on Phantom AI: "${displayTitle}"`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(`Check out this AI conversation on Phantom AI: "${displayTitle}"`);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Check out this AI conversation on Phantom AI: "${displayTitle}"\n${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Shared AI Conversation: ${displayTitle}`);
    const body = encodeURIComponent(`Hi,\n\nI shared an AI conversation with you from Phantom AI:\n\n"${displayTitle}"\n\nView conversation: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-sm font-bold text-white tracking-wide">
                Share Link to Chat
              </h2>
              <p className="text-[11px] text-zinc-400">
                Anyone with this public link will be able to view this conversation snapshot.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Snapshot Preview Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <span className="text-xs font-bold text-white truncate">{displayTitle}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex-shrink-0">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </span>
            </div>

            {/* Snippet message bubbles */}
            <div className="space-y-2 text-xs">
              {firstUserMsg && (
                <div className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-750 text-zinc-300">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                    {includeName ? authorName : 'User'}
                  </span>
                  <p className="line-clamp-2 text-zinc-200">
                    {firstUserMsg.parts?.[0]?.text || 'User prompt'}
                  </p>
                </div>
              )}

              {firstAIMsg && (
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-300">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 flex items-center gap-1 mb-0.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Phantom AI</span>
                  </span>
                  <p className="line-clamp-2 text-zinc-300 text-[11px]">
                    {firstAIMsg.parts?.[0]?.text || 'AI Response'}
                  </p>
                </div>
              )}
            </div>

            {/* Author info note */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-zinc-800/80">
              <span>{includeName ? `Shared by ${authorName}` : 'Shared anonymously'}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Toggle: Include Name */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs">
            <div>
              <span className="font-semibold text-zinc-200">Share your name</span>
              <p className="text-[11px] text-zinc-400">Display &quot;{authorName}&quot; on the public chat preview</p>
            </div>
            <input
              type="checkbox"
              checked={includeName}
              onChange={(e) => setIncludeName(e.target.checked)}
              className="w-4 h-4 accent-white cursor-pointer"
            />
          </div>

          {/* Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-glow flex items-center gap-1.5 transition-all active:scale-95 flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-black" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social Quick Share Icons */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Quick Share via
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="text-emerald-400">💬</span>
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleShareTwitter}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Twitter className="w-3.5 h-3.5 text-sky-400" />
                <span>Twitter / X</span>
              </button>
              <button
                type="button"
                onClick={handleShareLinkedIn}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                <span>LinkedIn</span>
              </button>
              <button
                type="button"
                onClick={handleShareEmail}
                className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 flex items-center justify-between bg-zinc-950">
          <button
            type="button"
            onClick={handleNativeShare}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>More Device Options</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-glow transition-all active:scale-95"
            >
              {copied ? 'Link Copied!' : 'Copy Public Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
