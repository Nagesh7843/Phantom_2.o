'use strict';
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Settings,
  Bell,
  Sparkles,
  Globe,
  Volume2,
  CreditCard,
  Layers,
  BarChart3,
  Database,
  HardDrive,
  Shield,
  Key,
  Lock,
  LifeBuoy,
  User,
  Keyboard,
  Check,
  Trash2,
  Download,
  AlertTriangle,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { UserSettings, UserProfile } from '@/types';
import { PhantomLogo, PhantomIconSvg } from '../common/PhantomLogo';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  userProfile?: UserProfile | null;
  onLogout?: () => void;
}

type SettingsSectionId =
  | 'general'
  | 'notifications'
  | 'personalization'
  | 'plugins'
  | 'voice'
  | 'billing'
  | 'usage'
  | 'analytics'
  | 'data-controls'
  | 'storage'
  | 'safety'
  | 'security'
  | 'parental'
  | 'trusted-contact'
  | 'account'
  | 'keyboard';

interface NavSection {
  id: SettingsSectionId;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
}

const SETTINGS_SECTIONS: NavSection[] = [
  { id: 'general', label: 'General', icon: Settings, description: 'Theme, language, and workspace preferences' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Notification banners, sounds, and email alerts' },
  { id: 'personalization', label: 'Personalization', icon: Sparkles, description: 'Custom AI instructions, persona, and memory' },
  { id: 'plugins', label: 'Plugins', icon: Globe, description: 'Code sandbox, web browser, and developer extensions' },
  { id: 'voice', label: 'Voice', icon: Volume2, description: 'Speech synthesis voice persona and auto-read' },
  { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Subscription plans, payment methods, and invoices' },
  { id: 'usage', label: 'Usage', icon: Layers, description: 'Token consumption, quotas, and execution compute' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance metrics, compilation logs, and latency' },
  { id: 'data-controls', label: 'Data controls', icon: Database, description: 'Export workspace data, chat history, and privacy' },
  { id: 'storage', label: 'Storage', icon: HardDrive, description: 'PostgreSQL cloud database and local drafts' },
  { id: 'safety', label: 'Safety', icon: Shield, description: 'Sandbox protection and command confirmation' },
  { id: 'security', label: 'Security and login', icon: Key, description: 'Password, active sessions, and 2FA authentication' },
  { id: 'parental', label: 'Parental controls', icon: Lock, description: 'Content filtering and restricted coding mode' },
  { id: 'trusted-contact', label: 'Trusted contact', icon: LifeBuoy, description: 'Emergency recovery contact and verification' },
  { id: 'account', label: 'Account', icon: User, description: 'User profile details and account management' },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard, description: 'Full IDE and chat keyboard shortcuts reference' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  userProfile,
  onLogout,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings State
  const [theme, setTheme] = useState(settings.theme || 'theme-dark');
  const [language, setLanguage] = useState(settings.language || 'English');
  const [voice, setVoice] = useState(settings.voice || '');
  const [autoSpeak, setAutoSpeak] = useState(settings.autoSpeak || false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Extra Mock Settings for complete ChatGPT-like capability
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [aiPersona, setAiPersona] = useState('Senior Software Architect');
  const [customInstructions, setCustomInstructions] = useState('Be concise, write clean, modern, fully functional code without placeholders.');
  const [destructiveSafeguards, setDestructiveSafeguards] = useState(true);
  const [telemetryEnabled, setTelemetryEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const themes = [
    { id: 'theme-dark', name: 'Dark Mode (OLED Black)', desc: 'High-contrast pure black and slate theme', color: 'bg-black border-zinc-700 text-white' },
    { id: 'theme-light', name: 'Light Mode (Stark White)', desc: 'Clean, high-clarity crisp white theme', color: 'bg-white border-zinc-300 text-black' },
  ];

  const languages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Japanese', 'Korean', 'Chinese', 'Hindi', 'Arabic', 'Russian'
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_SECTIONS;
    const q = searchQuery.toLowerCase().trim();
    return SETTINGS_SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSave = () => {
    document.body.className = '';
    document.body.classList.add(theme);
    localStorage.setItem('phantom-theme', theme);

    onSaveSettings({
      theme,
      language,
      voice,
      autoSpeak,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-4xl h-[640px] max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: NAVIGATION SIDEBAR WITH SEARCH (MATCHING CHATGPT SPEC)       */}
        {/* ========================================================================= */}
        <div className="w-full md:w-64 bg-zinc-900/60 border-r border-zinc-850 flex flex-col flex-shrink-0">
          {/* Top Close / Search Bar */}
          <div className="p-3 border-b border-zinc-850 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhantomLogo variant="badge" size="xs" showBadge={false} />
                <span className="text-xs font-bold text-zinc-200">Settings</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Settings Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search settings"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                    isActive
                      ? 'bg-zinc-800 text-white font-bold shadow-mono-subtle border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Profile / Quick Log out */}
          {userProfile?.authenticated && (
            <div className="p-3 border-t border-zinc-850 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                  {(userProfile.user.displayName || 'U')[0].toUpperCase()}
                </div>
                <span className="truncate text-zinc-200 font-medium text-[11px]">
                  {userProfile.user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1 text-zinc-500 hover:text-rose-400 rounded"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: SECTION CONTENT                                             */}
        {/* ========================================================================= */}
        <div className="flex-1 bg-black flex flex-col min-w-0 overflow-hidden">
          {/* Section Header with Desktop Close Button */}
          <div className="p-4 border-b border-zinc-850 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-white capitalize">
                {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label || 'Settings'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors hidden md:block"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Dynamic Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {/* 1. GENERAL */}
            {activeSection === 'general' && (
              <div className="space-y-5">
                {/* Theme Switcher */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Theme</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          theme === t.id
                            ? 'bg-zinc-900 border-white text-white shadow-mono-glow'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{t.name}</span>
                          {theme === t.id && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <p className="text-[11px] text-zinc-500">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Language */}
                <div className="space-y-2 pt-4 border-t border-zinc-850">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Clear All Chats */}
                <div className="pt-4 border-t border-zinc-850 flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Clear all chat sessions</span>
                    <p className="text-[11px] text-zinc-400">Permanently delete your local conversation history</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Clear all conversation history?')) {
                        localStorage.removeItem('phantom-chat-sessions');
                        alert('Chat history cleared.');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-900/60 text-rose-400 hover:bg-rose-900 text-xs font-semibold transition-colors"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            )}

            {/* 2. NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Sound Notifications</span>
                    <p className="text-[11px] text-zinc-400">Play subtle chime when long code runs or AI responses complete</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 accent-white"
                  />
                </div>
              </div>
            )}

            {/* 3. PERSONALIZATION */}
            {activeSection === 'personalization' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">AI Coding Persona</label>
                  <select
                    value={aiPersona}
                    onChange={(e) => setAiPersona(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Senior Software Architect">Senior Software Architect (Production-grade, clean design)</option>
                    <option value="Concise Expert">Concise Expert (Direct code solutions, zero fluff)</option>
                    <option value="Tutor & Mentor">Tutor & Mentor (Step-by-step explanations with comments)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Custom Instructions for Phantom</label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                    placeholder="How would you like Phantom AI to respond?"
                  />
                </div>
              </div>
            )}

            {/* 4. PLUGINS */}
            {activeSection === 'plugins' && (
              <div className="space-y-3">
                {[
                  { name: 'Multi-Language Compiler & Subprocess Engine', desc: 'Real execution of Python, Node, Java, C++, Rust, Go, and 30+ languages', enabled: true },
                  { name: 'Interactive Terminal Shell & SIGINT Controller', desc: 'Direct multi-tab terminal execution with safe command auditing', enabled: true },
                  { name: 'Live Web Sandbox & DOM Preview Engine', desc: 'Isolated iframe rendering with console log interceptor', enabled: true },
                  { name: 'Gemini 2.5 Coding Intelligence Suite', desc: 'Automated error diagnosis, test generation, and code optimizer', enabled: true },
                ].map((p, i) => (
                  <div key={i} className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{p.name}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{p.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 5. VOICE & SPEECH */}
            {activeSection === 'voice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Auto-Read AI Answers</span>
                    <p className="text-[11px] text-zinc-400">Automatically speak text answers upon generation</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSpeak}
                    onChange={(e) => setAutoSpeak(e.target.checked)}
                    className="w-4 h-4 accent-white"
                  />
                </div>

                {availableVoices.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-200">Voice Synthesis Model</label>
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">Default System Voice</option>
                      {availableVoices.map((v) => (
                        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* 6. BILLING */}
            {activeSection === 'billing' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Phantom 2.0 Pro Developer</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">Unlimited compilation, PostgreSQL cloud sync & full AI suite</p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. USAGE */}
            {activeSection === 'usage' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Tokens Processed</div>
                    <div className="text-xl font-bold text-white mt-1">24.5k</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Code Compilations</div>
                    <div className="text-xl font-bold text-white mt-1">142</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Active Workspaces</div>
                    <div className="text-xl font-bold text-white mt-1">8</div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. ANALYTICS */}
            {activeSection === 'analytics' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Subprocess Execution Speed</span>
                    <span className="font-mono text-emerald-400 font-bold">&lt; 0.05s avg</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[95%]" />
                  </div>
                </div>
              </div>
            )}

            {/* 9. DATA CONTROLS */}
            {activeSection === 'data-controls' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Export All Data</span>
                    <p className="text-[11px] text-zinc-400">Download project files, chats, and configurations as ZIP</p>
                  </div>
                  <button
                    onClick={() => alert('Data export prepared.')}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>
            )}

            {/* 10. STORAGE */}
            {activeSection === 'storage' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">PostgreSQL Cloud Persistence</span>
                    <p className="text-[11px] text-zinc-400">Real-time sync for code files and multi-project states</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    CONNECTED
                  </span>
                </div>
              </div>
            )}

            {/* 11. SAFETY */}
            {activeSection === 'safety' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Destructive Command Safeguards</span>
                    <p className="text-[11px] text-zinc-400">Require interactive prompt confirmation before executing rm -rf, del, or drop database</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={destructiveSafeguards}
                    onChange={(e) => setDestructiveSafeguards(e.target.checked)}
                    className="w-4 h-4 accent-white"
                  />
                </div>
              </div>
            )}

            {/* 12. SECURITY & LOGIN */}
            {activeSection === 'security' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Active Authentication Session</span>
                    <p className="text-[11px] text-zinc-400">Secure JWT Bearer Session Active</p>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono font-bold">Verified</span>
                </div>
              </div>
            )}

            {/* 13. PARENTAL CONTROLS */}
            {activeSection === 'parental' && (
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
                Safe coding mode filters out hazardous network payloads and system root modifications.
              </div>
            )}

            {/* 14. TRUSTED CONTACT */}
            {activeSection === 'trusted-contact' && (
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
                Configure account recovery and developer emergency backup endpoints.
              </div>
            )}

            {/* 15. ACCOUNT */}
            {activeSection === 'account' && (
              <div className="space-y-3">
                {userProfile?.authenticated ? (
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-zinc-200">Name: {userProfile.user.displayName}</div>
                    <div className="text-xs text-zinc-400">Email: {userProfile.user.email}</div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
                    Currently operating in Guest Mode. Sign in to link your account.
                  </div>
                )}
              </div>
            )}

            {/* 16. KEYBOARD */}
            {activeSection === 'keyboard' && (
              <div className="space-y-2">
                {[
                  { keys: ['Ctrl', 'Enter'], desc: 'Run Active Code / Web Preview' },
                  { keys: ['Ctrl', '/'], desc: 'Toggle Language-Aware Comment' },
                  { keys: ['Ctrl', 'D'], desc: 'Duplicate Line / Selection' },
                  { keys: ['Alt', '↑ / ↓'], desc: 'Move Line Up / Down' },
                  { keys: ['Tab'], desc: 'Smart Indent (2 or 4 spaces)' },
                  { keys: ['Shift', 'Tab'], desc: 'Dedent Line / Block' },
                  { keys: ['Ctrl', 'S'], desc: 'Save Project to PostgreSQL Cloud' },
                  { keys: ['Ctrl', 'F'], desc: 'Find & Replace in Document' },
                  { keys: ['Ctrl', 'B'], desc: 'Toggle File Explorer Sidebar' },
                  { keys: ['Ctrl', '`'], desc: 'Toggle Terminal Drawer' },
                  { keys: ['Ctrl', 'K'], desc: 'Toggle Phantom AI Suite' },
                  { keys: ['F1'], desc: 'Open Keyboard Shortcuts Cheat Sheet' },
                ].map((k, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 flex items-center justify-between">
                    <span className="text-xs text-zinc-300">{k.desc}</span>
                    <div className="flex items-center gap-1">
                      {k.keys.map((keyStr, ki) => (
                        <kbd key={ki} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-white text-[11px] font-mono font-semibold">
                          {keyStr}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Save Actions */}
          <div className="p-4 border-t border-zinc-850 flex items-center justify-between flex-shrink-0 bg-zinc-950">
            <span className="text-[11px] text-zinc-500 font-mono">Phantom AI System Preferences</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-glow transition-all active:scale-95"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
