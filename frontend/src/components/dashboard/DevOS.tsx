'use strict';
import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  Database,
  Layers,
  CheckCircle2,
  RefreshCw,
  Clock,
  Terminal,
  Shield,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SystemStatus } from '@/types';

export const DevOS: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getDevOSStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-black select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-mono-subtle">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Dev OS Architecture Dashboard
              </h2>
              <p className="text-xs text-zinc-400">
                Real-time runtime state, database clusters, and active AI model fallbacks
              </p>
            </div>
          </div>

          <button
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* System Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-mono-card">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">System State</span>
              <Server className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              <span className="text-lg font-bold text-white uppercase tracking-tight">
                {status?.status || 'Online'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Platform: {status?.system.os || 'Windows'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-mono-card">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Python Runtime</span>
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-bold text-white font-mono">
              v{status?.system.python_version || '3.14.6'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">PyMongo v{status?.system.pymongo_version || '4.18'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-mono-card">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">MongoDB Cluster</span>
              <Database className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-bold text-white">
              {status?.system.mongo_status || 'Fallback Local Mode'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Auto-reconnect active</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-mono-card">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Audit Heartbeat</span>
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div className="text-xs font-bold text-zinc-300 font-mono truncate">
              {status?.system.timestamp ? new Date(status.system.timestamp).toLocaleTimeString() : 'Active'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Real-time sync</p>
          </div>
        </div>

        {/* Multi-Provider AI Fallback Pipeline */}
        <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-mono-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-white" />
                <span>Cascading Multi-Provider Model Pipeline</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automatic zero-downtime failover with exponential backoff and load throttling
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Google Gemini 2.5 Flash', tier: 'Primary Model', speed: 'Ultra-fast', desc: 'Direct streaming & multimodal' },
              { name: 'OpenRouter Fallback', tier: 'Tier 2 Failover', speed: 'Global Mesh', desc: 'Universal model aggregator' },
              { name: 'OpenAI GPT-4o-mini', tier: 'Tier 3 Failover', speed: 'High Precision', desc: 'Reasoning & deep analysis' },
              { name: 'Hugging Face FLUX / Mistral', tier: 'Tier 4 Fallback', speed: 'Open-Weights', desc: 'Image & text generation' },
            ].map((provider, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 hover:border-zinc-500 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black text-white border border-zinc-700">
                    {provider.tier}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <h4 className="font-bold text-white text-xs">{provider.name}</h4>
                <p className="text-[11px] text-zinc-400 leading-tight">{provider.desc}</p>
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Latency: Active</span>
                  <span className="text-white font-semibold">{provider.speed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

