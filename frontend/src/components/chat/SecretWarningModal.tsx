'use strict';
import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  X,
  EyeOff,
  Send,
  Trash2,
  Key,
} from 'lucide-react';
import { DetectedSecret } from '@/lib/secretGuard';

interface SecretWarningModalProps {
  isOpen: boolean;
  secrets: DetectedSecret[];
  onClose: () => void;
  onRedactAndApply: () => void;
  onProceedAnyway: () => void;
}

export const SecretWarningModal: React.FC<SecretWarningModalProps> = ({
  isOpen,
  secrets,
  onClose,
  onRedactAndApply,
  onProceedAnyway,
}) => {
  if (!isOpen || secrets.length === 0) return null;

  const hasCritical = secrets.some((s) => s.severity === 'critical');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-amber-500/50 shadow-2xl p-6 text-white animate-scale-up overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              hasCritical
                ? 'bg-red-950/80 border-red-700/80 text-red-400'
                : 'bg-amber-950/80 border-amber-700/80 text-amber-400'
            }`}>
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Sensitive Credentials Detected
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                We found {secrets.length} secret{secrets.length > 1 ? 's' : ''} in your message.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Notice Box */}
        <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">Security Recommendation: </span>
            Sending live API keys, database passwords, or private tokens to AI models or chat logs can lead to unauthorized billing or account compromises.
          </div>
        </div>

        {/* List of Detected Secrets */}
        <div className="mb-5 space-y-2 max-h-48 overflow-y-auto pr-1">
          {secrets.map((secret, idx) => (
            <div
              key={secret.id || idx}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 flex-shrink-0">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-zinc-200 truncate flex items-center gap-1.5">
                    <span>{secret.label}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-mono font-bold ${
                      secret.severity === 'critical'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {secret.severity}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 truncate">
                    {secret.maskedText}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-zinc-850">
          <button
            type="button"
            onClick={onRedactAndApply}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Auto-Redact & Mask Secrets</span>
          </button>

          <button
            type="button"
            onClick={onProceedAnyway}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Anyway (I Trust This)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
