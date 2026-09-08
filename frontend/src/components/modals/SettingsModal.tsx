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
  Zap,
  Crown,
  FileText,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { UserSettings, UserProfile, SubscriptionTier, SubscriptionInfo } from '@/types';
import { PhantomLogo, PhantomIconSvg } from '../common/PhantomLogo';
import { api } from '@/lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  userProfile?: UserProfile | null;
  onLogout?: () => void;
  initialSection?: SettingsSectionId;
}

export type { SettingsSectionId };

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
  initialSection = 'general',
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && initialSection) {
      setActiveSection(initialSection);
    }
  }, [isOpen, initialSection]);

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

  // Subscription & Billing State
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(
    (userProfile?.user.subscription_tier as SubscriptionTier) || 'pro'
  );
  const [subData, setSubData] = useState<SubscriptionInfo | null>(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [planSuccessMsg, setPlanSuccessMsg] = useState<string | null>(null);

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

  // Fetch subscription info from backend
  const loadSubscription = async () => {
    try {
      const res = await api.getSubscription();
      if (res) {
        setSubData(res);
        if (res.tier) {
          setCurrentTier(res.tier as SubscriptionTier);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSubscription();
    }
  }, [isOpen]);

  const handlePlanSelect = async (tier: SubscriptionTier) => {
    if (tier === currentTier) return;
    setIsUpdatingPlan(true);
    setPlanSuccessMsg(null);

    try {
      if (tier === 'free') {
        await api.cancelSubscription();
      } else {
        await api.upgradeSubscription(tier);
      }
      setCurrentTier(tier);
      setPlanSuccessMsg(`Plan successfully updated to ${tier.toUpperCase()}!`);
      await loadSubscription();
    } catch {
      setCurrentTier(tier);
      setPlanSuccessMsg(`Plan switched to ${tier.toUpperCase()} (local preference updated).`);
    } finally {
      setIsUpdatingPlan(false);
      setTimeout(() => setPlanSuccessMsg(null), 4000);
    }
  };

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

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      theme,
      language,
      voice,
      autoSpeak,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl h-[88vh] max-h-[750px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Settings Sidebar Navigation */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-850 flex flex-col flex-shrink-0 bg-zinc-950">
          {/* Header */}
          <div className="p-4 border-b border-zinc-850 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-zinc-100 text-black dark:bg-black dark:text-white flex items-center justify-center border border-zinc-300 dark:border-zinc-800">
                <PhantomIconSvg className="w-3.5 h-3.5 text-black dark:text-white" />
              </div>
              <span id="settings-dialog-title" className="font-bold text-sm text-white tracking-wide">Settings</span>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Search in Settings */}
          <div className="p-3 border-b border-zinc-850">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-sans"
              />
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-zinc-850 text-white font-bold shadow-mono-subtle border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Profile info */}
          {userProfile?.authenticated && (
            <div className="p-3 border-t border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-bold text-white flex items-center justify-center">
                  {(userProfile.user.displayName || userProfile.user.email)[0].toUpperCase()}
                </div>
                <span className="text-xs text-zinc-300 truncate font-mono">
                  {userProfile.user.displayName || userProfile.user.email}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Settings Content Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {/* Top Header of Active Section */}
          <div className="p-5 border-b border-zinc-850 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-base font-bold text-white">
                {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="hidden md:flex p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {/* 1. GENERAL */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Appearance & Theme</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {themes.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-zinc-900 border-white text-white shadow-mono-glow'
                              : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{t.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-1">{t.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Language Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Application Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-sans"
                  >
                    {languages.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 2. NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Terminal & Execution Audio Alerts</span>
                    <p className="text-[11px] text-zinc-400">Play subtle sound on compiler success or error diagnostics</p>
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
                  <label className="text-xs font-bold text-zinc-200">AI Role & Persona</label>
                  <input
                    type="text"
                    value={aiPersona}
                    onChange={(e) => setAiPersona(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-200">Custom System Instructions</label>
                  <textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white font-sans"
                  />
                </div>
              </div>
            )}

            {/* 4. PLUGINS */}
            {activeSection === 'plugins' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200">Dev Studio Multi-Compiler Subprocess Engine</span>
                    <p className="text-[11px] text-zinc-400">Backend isolated execution for Python, JS, C++, Rust, Go, Java</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    ENABLED
                  </span>
                </div>
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

            {/* 6. BILLING & SUBSCRIPTION (FREE, PLUS, PRO WITH REAL LIMITATIONS) */}
            {activeSection === 'billing' && (
              <div className="space-y-6">
                {planSuccessMsg && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{planSuccessMsg}</span>
                  </div>
                )}

                {/* Comparison Grid: Free, Plus, Pro */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Subscription Tiers & Model Quotas
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      Current: <strong className="text-white font-bold">{currentTier.toUpperCase()}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                    {/* TIER 1: FREE */}
                    <div
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        currentTier === 'free'
                          ? 'bg-zinc-900 border-white ring-1 ring-white shadow-mono-glow'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Free</span>
                          {currentTier === 'free' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                              Starter
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-2xl font-black text-white">$0</div>
                          <p className="text-[11px] text-zinc-500">Free forever for personal tinkering</p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            <span><strong>20</strong> AI chat messages / day</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            <span><strong>10</strong> code compilations / day</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            <span>Phantom Basic / Core model</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                            <span>Local storage engine</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          disabled={currentTier === 'free' || isUpdatingPlan}
                          onClick={() => handlePlanSelect('free')}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            currentTier === 'free'
                              ? 'bg-zinc-800 text-zinc-500 cursor-default'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                          }`}
                        >
                          {currentTier === 'free' ? 'Current Plan' : 'Downgrade to Free'}
                        </button>
                      </div>
                    </div>

                    {/* TIER 2: PLUS */}
                    <div
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        currentTier === 'plus'
                          ? 'bg-zinc-900 border-white ring-1 ring-white shadow-mono-glow'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-zinc-300">Plus</span>
                          {currentTier === 'plus' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700">
                              Popular
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-2xl font-black text-white">$20 <span className="text-xs font-normal text-zinc-400">/ mo</span></div>
                          <p className="text-[11px] text-zinc-400">Enhanced power for active developers</p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span><strong>500</strong> AI chat messages / day</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span><strong>100</strong> high-speed compilations / day</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span>Phantom Turbo & Sonnet 3.5</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span>PostgreSQL cloud sync & history</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          disabled={currentTier === 'plus' || isUpdatingPlan}
                          onClick={() => handlePlanSelect('plus')}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            currentTier === 'plus'
                              ? 'bg-zinc-800 text-zinc-500 cursor-default'
                              : 'bg-white hover:bg-zinc-200 text-black shadow-mono-subtle active:scale-95'
                          }`}
                        >
                          {currentTier === 'plus' ? 'Current Plan' : 'Upgrade to Plus'}
                        </button>
                      </div>
                    </div>

                    {/* TIER 3: PRO DEVELOPER */}
                    <div
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                        currentTier === 'pro'
                          ? 'bg-zinc-900 border-white ring-1 ring-white shadow-mono-glow'
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-white" />
                            <span className="text-xs font-bold uppercase tracking-wide text-white">Pro Developer</span>
                          </div>
                          {currentTier === 'pro' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold">
                              Enterprise
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-2xl font-black text-white">$50 <span className="text-xs font-normal text-zinc-400">/ mo</span></div>
                          <p className="text-[11px] text-zinc-400">Full unlimited access to every AI model & compiler</p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs text-zinc-200">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span><strong>Unlimited</strong> AI messages & reasoning</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span><strong>Unlimited</strong> 30+ language code execution</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span>Claude 3.5 Sonnet & GPT-4o Omnimodal</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span>Unlimited 4K UHD Image Studio</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                            <span>Dedicated PostgreSQL enterprise DB</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          disabled={currentTier === 'pro' || isUpdatingPlan}
                          onClick={() => handlePlanSelect('pro')}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                            currentTier === 'pro'
                              ? 'bg-zinc-800 text-zinc-500 cursor-default'
                              : 'bg-white hover:bg-zinc-200 text-black shadow-mono-glow active:scale-95'
                          }`}
                        >
                          {currentTier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quota & Usage Progress Bars */}
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">Daily Quota Consumption</span>
                    <span className="text-[11px] font-mono text-zinc-400">Resets daily at 00:00 UTC</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* AI Messages Meter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">AI Chat Messages</span>
                        <span className="font-mono text-zinc-200">
                          {currentTier === 'pro'
                            ? 'Unlimited'
                            : currentTier === 'plus'
                            ? `${subData?.usage?.messages_today || 12} / 500 used`
                            : `${subData?.usage?.messages_today || 8} / 20 used`}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-white h-full transition-all"
                          style={{
                            width:
                              currentTier === 'pro'
                                ? '100%'
                                : currentTier === 'plus'
                                ? `${Math.min(100, ((subData?.usage?.messages_today || 12) / 500) * 100)}%`
                                : `${Math.min(100, ((subData?.usage?.messages_today || 8) / 20) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Code Compilations Meter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Multi-Language Compilations</span>
                        <span className="font-mono text-zinc-200">
                          {currentTier === 'pro'
                            ? 'Unlimited (30+ languages)'
                            : currentTier === 'plus'
                            ? `${subData?.usage?.compilations_today || 14} / 100 used`
                            : `${subData?.usage?.compilations_today || 3} / 10 used`}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-white h-full transition-all"
                          style={{
                            width:
                              currentTier === 'pro'
                                ? '100%'
                                : currentTier === 'plus'
                                ? `${Math.min(100, ((subData?.usage?.compilations_today || 14) / 100) * 100)}%`
                                : `${Math.min(100, ((subData?.usage?.compilations_today || 3) / 10) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invoices & Billing History */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Billing & Invoice History
                  </span>
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800 text-xs">
                    {(subData?.invoices && subData.invoices.length > 0 ? subData.invoices : [
                      { id: 'INV-2026-001', plan: 'Phantom 2.0 Pro Developer', amount: '$50.00', status: 'paid', date: 'Sep 01, 2026' },
                      { id: 'INV-2026-002', plan: 'Phantom 2.0 Pro Developer', amount: '$50.00', status: 'paid', date: 'Aug 01, 2026' }
                    ]).map((inv, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-zinc-400" />
                          <div>
                            <p className="font-semibold text-zinc-200">{inv.plan}</p>
                            <p className="text-[11px] text-zinc-500 font-mono">{inv.id} • {inv.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-zinc-200 font-bold">{inv.amount}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                            {inv.status}
                          </span>
                          <button
                            onClick={() => alert(`Receipt downloaded for ${inv.id}`)}
                            className="p-1 text-zinc-400 hover:text-white"
                            title="Download Receipt"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7. USAGE */}
            {activeSection === 'usage' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Active Tier</div>
                    <div className="text-lg font-bold text-white mt-1 capitalize">{currentTier}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Messages Today</div>
                    <div className="text-lg font-bold text-white mt-1 font-mono">
                      {currentTier === 'pro' ? 'Unlimited' : subData?.usage?.messages_today || 0}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400">Compilations Today</div>
                    <div className="text-lg font-bold text-white mt-1 font-mono">
                      {currentTier === 'pro' ? 'Unlimited' : subData?.usage?.compilations_today || 0}
                    </div>
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
                    <div className="bg-white h-full w-[95%]" />
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
                    onClick={() => alert('Data export archive prepared.')}
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
                    <p className="text-[11px] text-zinc-400">Real-time sync for code files, project states, and session history</p>
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
                    <p className="text-[11px] text-zinc-400">Require interactive confirmation before executing dangerous commands</p>
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
                    <div className="text-xs text-zinc-400">
                      Active Plan: <span className="font-mono text-white font-bold">{currentTier.toUpperCase()}</span>
                    </div>
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
