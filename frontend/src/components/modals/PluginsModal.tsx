'use strict';
import React, { useState } from 'react';
import {
  X,
  Globe,
  Terminal,
  Database,
  ImageIcon,
  Shield,
  Volume2,
  Check,
  Power,
  Settings,
  Sliders,
  CheckCircle2,
  Search,
  ExternalLink,
} from 'lucide-react';

export interface PluginItemDef {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.FC<{ className?: string }>;
  version: string;
  statusText: string;
}

export const AVAILABLE_PLUGINS: PluginItemDef[] = [
  {
    id: 'web_search',
    name: 'Real-Time Web Search Engine',
    description: 'Fetches live web search results and technical documentation directly into AI reasoning context for maximum precision and up-to-date facts.',
    category: 'Search & Data',
    icon: Globe,
    version: 'v2.4.0',
    statusText: 'Active • DuckDuckGo & Google Backend • Precision Fact Injection',
  },
  {
    id: 'compiler_engine',
    name: 'Multi-Language Subprocess Sandbox',
    description: 'Executes Python, TypeScript, C++, Rust, Go, Java, PHP, and 30+ languages inside isolated temporary processes.',
    category: 'Code Execution',
    icon: Terminal,
    version: 'v3.1.0',
    statusText: 'Active • Flask OS Process Engine',
  },
  {
    id: 'postgres_sync',
    name: 'PostgreSQL Enterprise Cloud Sync',
    description: 'Persistent multi-user relational database for saving chat history, projects, and custom preferences.',
    category: 'Persistence',
    icon: Database,
    version: 'v16.2',
    statusText: 'Connected • Threaded Pool Active',
  },
  {
    id: 'image_studio',
    name: 'Image Studio (Flux & SD-XL 4K)',
    description: 'High-definition text-to-image synthesis and neural prompt engineering engine.',
    category: 'Generative Media',
    icon: ImageIcon,
    version: 'v1.8.4',
    statusText: 'Active • HuggingFace Inference API',
  },
  {
    id: 'speech_voice',
    name: 'Neural Speech Synthesis Engine',
    description: 'Text-to-speech engine utilizing native operating system voices for natural audio narration.',
    category: 'Voice & Speech',
    icon: Volume2,
    version: 'v2.0.0',
    statusText: 'Active • Web Speech API',
  },
  {
    id: 'sandbox_safety',
    name: 'Destructive Command Shield',
    description: 'Monitors shell and compiler execution for dangerous rm/del/format commands and asks for explicit confirmation.',
    category: 'Security',
    icon: Shield,
    version: 'v1.0.2',
    statusText: 'Enabled • Safety Guard Active',
  },
];

interface PluginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginsState?: Record<string, boolean>;
  onTogglePlugin?: (pluginId: string, enabled: boolean) => void;
}

export const PluginsModal: React.FC<PluginsModalProps> = ({
  isOpen,
  onClose,
  pluginsState = {
    web_search: true,
    compiler_engine: true,
    postgres_sync: true,
    image_studio: true,
    speech_voice: true,
    sandbox_safety: true,
  },
  onTogglePlugin,
}) => {
  const [localPlugins, setLocalPlugins] = useState<Record<string, boolean>>(pluginsState);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [testSearchResults, setTestSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    setLocalPlugins(pluginsState);
  }, [pluginsState]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const nextState = !localPlugins[id];
    const updated = { ...localPlugins, [id]: nextState };
    setLocalPlugins(updated);
    onTogglePlugin?.(id, nextState);

    const pluginDef = AVAILABLE_PLUGINS.find((p) => p.id === id);
    setToastMsg(
      `${pluginDef?.name || id} ${nextState ? 'enabled (Active in chat reasoning)' : 'disabled'}.`
    );
    setTimeout(() => setToastMsg(null), 3000);

    // Persist to backend
    fetch('/api/plugins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSearchQuery.trim()) return;

    setIsSearching(true);
    setTestSearchResults(null);
    try {
      const res = await fetch('/api/plugins/web_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testSearchQuery.trim() }),
      });
      const data = await res.json();
      setTestSearchResults(data.results || []);
    } catch {
      setTestSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-2xl h-[85vh] max-h-[680px] bg-zinc-950 border border-zinc-850 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-white shadow-mono-subtle">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Developer Plugins & Tool Integrations</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Extend Phantom AI with live search, sandbox compilers, and precision tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-zinc-950">
          {toastMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {AVAILABLE_PLUGINS.map((plugin) => {
            const Icon = plugin.icon;
            const isEnabled = localPlugins[plugin.id] ?? true;

            return (
              <div
                key={plugin.id}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zinc-850 text-white flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{plugin.name}</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {plugin.version}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">{plugin.category}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(plugin.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isEnabled
                        ? 'bg-white hover:bg-zinc-200 text-black shadow-mono-subtle active:scale-95'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isEnabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-400 font-sans leading-relaxed">{plugin.description}</p>

                {/* Special Interactive Test Box for Web Search */}
                {plugin.id === 'web_search' && isEnabled && (
                  <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-300 font-mono font-semibold">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Globe className="w-3.5 h-3.5" />
                        Live Web Search Active • Real-Time Precision Mode
                      </span>
                    </div>
                    <form onSubmit={handleTestSearch} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Test real-time query (e.g. React 19, Python 3.13)..."
                        value={testSearchQuery}
                        onChange={(e) => setTestSearchQuery(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                      />
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Search className="w-3 h-3" />
                        <span>{isSearching ? 'Searching...' : 'Test Search'}</span>
                      </button>
                    </form>

                    {testSearchResults && (
                      <div className="pt-2 border-t border-zinc-800 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {testSearchResults.length === 0 ? (
                          <p className="text-[11px] text-zinc-500">No results returned for query.</p>
                        ) : (
                          testSearchResults.map((r, i) => (
                            <div key={i} className="text-[11px] text-zinc-400 p-1.5 rounded bg-zinc-900/80">
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-white hover:text-emerald-400 font-semibold flex items-center gap-1"
                              >
                                {r.title}
                                <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                              </a>
                              <p className="text-zinc-400 line-clamp-1 mt-0.5">{r.snippet}</p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>{plugin.statusText}</span>
                  <span className={isEnabled ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {isEnabled ? '● ONLINE' : '○ STANDBY'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 flex items-center justify-between flex-shrink-0 bg-zinc-950">
          <span className="text-[11px] text-zinc-500 font-mono">Phantom AI Modular Plugin Framework</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
