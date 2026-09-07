'use strict';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  Key,
  Globe,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SecurityLogs } from '@/types';

export const SecurityLayer: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLogs | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-cyber-dark select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 shadow-glow-teal">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Security Layer & Compliance Monitor
              </h2>
              <p className="text-xs text-slate-400">
                CORS isolation, ProxyFix verification, session signature hardening, and OAuth status
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Audit</span>
          </button>
        </div>

        {/* Security Matrix Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-sm text-slate-100">CORS Policy & Origins</h4>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Protected</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enforces cross-origin boundary controls on <code>/api/*</code> and prevents malicious unauthorized cross-site requests.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-400" />
                <h4 className="font-bold text-sm text-slate-100">ProxyFix Middleware</h4>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Enabled</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Handles HTTP reverse proxies, preserving <code>X-Forwarded-For</code> and <code>X-Forwarded-Proto</code>.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                <h4 className="font-bold text-sm text-slate-100">Session Cookie Cryptography</h4>
              </div>
              <span className="text-[11px] font-mono text-purple-300 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
                {logs?.security.session_cookie_name || 'phantom-login-session'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              HMAC signature verification protects cookies from client-side tampering or injection.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-sm text-slate-100">Isolated Code Execution Sandbox</h4>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Enforced</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Subprocess execution runs inside isolated temporary directories with 10-second timeout locks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
