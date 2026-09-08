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
} from 'lucide-react';

export interface PluginItemDef {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

export const AVAILABLE_PLUGINS: PluginItemDef[] = [
  {
    id: 'web_search',
    name: 'Real-Time Web Search',
    description: 'Fetches live web search results and technical documentation directly into AI reasoning.',
    icon: Globe,
  },
  {
    id: 'compiler_engine',
    name: 'Code Sandbox & Compiler',
    description: 'Executes Python, TypeScript, C++, Rust, Java, and 30+ languages in isolated processes.',
    icon: Terminal,
  },
  {
    id: 'postgres_sync',
    name: 'PostgreSQL Cloud Sync',
    description: 'Cloud database persistence for chat history, projects, and preferences.',
    icon: Database,
  },
  {
    id: 'image_studio',
    name: 'AI Image Studio',
    description: 'Text-to-image synthesis and neural prompt engineering engine.',
    icon: ImageIcon,
  },
  {
    id: 'speech_voice',
    name: 'Speech Synthesis Voice',
    description: 'High-clarity text-to-speech engine for natural audio narration.',
    icon: Volume2,
  },
  {
    id: 'sandbox_safety',
    name: 'Destructive Command Shield',
    description: 'Safety guard against destructive terminal commands and file deletions.',
    icon: Shield,
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

  React.useEffect(() => {
    setLocalPlugins(pluginsState);
  }, [pluginsState]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const nextState = !localPlugins[id];
    const updated = { ...localPlugins, [id]: nextState };
    setLocalPlugins(updated);
    onTogglePlugin?.(id, nextState);

    fetch('/api/plugins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-wide">Plugins</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Plugins List */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {AVAILABLE_PLUGINS.map((plugin) => {
            const Icon = plugin.icon;
            const isEnabled = localPlugins[plugin.id] ?? true;

            return (
              <div
                key={plugin.id}
                className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{plugin.name}</h4>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{plugin.description}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(plugin.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${
                    isEnabled ? 'bg-white' : 'bg-zinc-800'
                  }`}
                  title={isEnabled ? 'Enabled' : 'Disabled'}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-black absolute top-1 transition-transform ${
                      isEnabled ? 'right-1' : 'left-1 bg-zinc-400'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Minimal Footer */}
        <div className="p-4 border-t border-zinc-850 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
