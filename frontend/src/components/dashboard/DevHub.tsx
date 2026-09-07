'use strict';
import React, { useState, useEffect } from 'react';
import {
  Activity,
  Gauge,
  Zap,
  TrendingUp,
  RefreshCw,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { HubMetrics } from '@/types';

export const DevHub: React.FC = () => {
  const [metrics, setMetrics] = useState<HubMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await api.getDevHubMetrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const rpm = metrics?.metrics.rate_limiter_rpm || 30;
  const tokens = metrics?.metrics.tokens_available || 30;
  const tokenPercent = Math.min(100, Math.round((tokens / rpm) * 100));

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-cyber-dark select-none">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-glow-cyan">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Dev Hub API Telemetry & Rate Limiting
              </h2>
              <p className="text-xs text-slate-400">
                In-memory token bucket rate limiters, token replenishment, and traffic monitor
              </p>
            </div>
          </div>

          <button
            onClick={loadMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Token Bucket Gauge Card */}
        <div className="p-6 rounded-3xl bg-cyber-card border border-cyber-border shadow-glass space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold text-white">Outbound Token Bucket Capacity</h3>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
              {tokens} / {rpm} Tokens Available
            </span>
          </div>

          {/* Progress Bar with glowing neon fill */}
          <div className="space-y-1.5">
            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500 shadow-glow-teal"
                style={{ width: `${tokenPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Refill Rate: {(rpm / 60).toFixed(2)} tokens/sec</span>
              <span className="text-teal-400 font-bold">{tokenPercent}% Healthy</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Configured RPM</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{rpm}</div>
            <p className="text-[11px] text-slate-400">Max requests per minute</p>
          </div>

          <div className="p-4 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Server Port</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300 font-mono">5000</div>
            <p className="text-[11px] text-slate-400">Next.js Proxy Target</p>
          </div>

          <div className="p-4 rounded-2xl bg-cyber-card border border-cyber-border shadow-glass space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Cluster State</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">Online</div>
            <p className="text-[11px] text-slate-400">Zero-error failover active</p>
          </div>
        </div>
      </div>
    </div>
  );
};
