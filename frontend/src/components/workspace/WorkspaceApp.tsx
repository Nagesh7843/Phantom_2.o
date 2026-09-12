'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ActiveTab } from '@/components/layout/Header';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { DevStudio } from '@/components/compiler/DevStudio';
import { ImageStudio } from '@/components/dashboard/ImageStudio';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { AuthModal } from '@/components/modals/AuthModal';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { LibraryModal } from '@/components/modals/LibraryModal';
import { ScheduledModal } from '@/components/modals/ScheduledModal';
import { PluginsModal } from '@/components/modals/PluginsModal';
import { VoiceChatModal } from '@/components/modals/VoiceChatModal';
import { PhantomIconSvg, SidebarExpandIconSvg } from '@/components/common/PhantomLogo';
import { api } from '@/lib/api';
import { applyVoiceCustomSettings, applyMaleVoiceSettings, cleanTextForSpeech, splitTextIntoSpeechChunks } from '@/lib/voiceUtils';
import { ChatMessage, ChatSession, UserProfile, UserSettings } from '@/types';
import {
  ArrowLeft,
  Home as HomeIcon,
  User,
  Share2,
  MoreHorizontal,
  Files,
  Pin,
  Archive,
  Trash2,
  Folder,
  ChevronRight,
  Check,
} from 'lucide-react';

interface WorkspaceAppProps {
  onNavigateHome?: () => void;
}

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({ onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Top Right Chat Header Menu State
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setShowChatMenu(false);
      }
    };
    if (showChatMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChatMenu]);

  // Code IDE Shared State
  const [ideCode, setIdeCode] = useState<string | undefined>(undefined);
  const [ideLanguage, setIdeLanguage] = useState<string>('python');

  // User & Settings State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'theme-dark',
    language: 'English',
    voice: '',
    autoSpeak: false,
  });

  // Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialEmail, setAuthInitialEmail] = useState('');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [profileOpen, setProfileOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  const handleOpenAuth = (initialEmail = '', mode: 'login' | 'register' = 'login') => {
    setAuthInitialEmail(initialEmail);
    setAuthInitialMode(mode);
    setAuthOpen(true);
  };

  // Developer Plugins & Tools State
  const [plugins, setPlugins] = useState<Record<string, boolean>>({
    web_search: true,
    compiler_engine: true,
    postgres_sync: true,
    image_studio: true,
    speech_voice: true,
    sandbox_safety: true,
  });

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    const updated = { ...plugins, [pluginId]: enabled };
    setPlugins(updated);
    try {
      localStorage.setItem('phantom-plugins', JSON.stringify(updated));
    } catch {}
    // Persist to PostgreSQL database via backend API
    api.savePlugins(updated).catch((err) => {
      console.warn('Plugin save note:', err);
    });
  };

  const activeStreamAbort = useRef<boolean>(false);

  // Load Initial Data (Health, Profile, Sessions, Database Settings, Plugins)
  useEffect(() => {
    // 1. Initial theme setup
    const savedTheme = localStorage.getItem('phantom-theme') || 'theme-dark';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(savedTheme);
    setSettings((prev) => ({ ...prev, theme: savedTheme }));

    // 2. Restore plugins from database backend
    api.getPlugins().then((res) => {
      if (res?.plugins) {
        setPlugins(res.plugins);
        try {
          localStorage.setItem('phantom-plugins', JSON.stringify(res.plugins));
        } catch {}
      }
    }).catch(() => {
      // Offline fallback
      try {
        const savedPlugins = localStorage.getItem('phantom-plugins');
        if (savedPlugins) setPlugins(JSON.parse(savedPlugins));
      } catch {}
    });

    // 3. Check Backend Health
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    checkHealth();

    // 4. Load User Profile & Database Settings
    const loadProfile = async () => {
      try {
        const profile = await api.getUserProfile();
        setUserProfile(profile);
        const userTheme = profile?.user?.theme;
        if (userTheme) {
          document.body.classList.remove('theme-dark', 'theme-light');
          document.body.classList.add(userTheme);
          setSettings((prev) => ({
            ...prev,
            theme: userTheme,
            language: profile.user?.language || prev.language,
            voice: profile.user?.voice || prev.voice,
          }));
        }
        if (profile?.authenticated) {
          loadAllSessions(profile);
        } else {
          // Vanish Mode: Wipe all ephemeral storage on refresh for guest users
          try {
            sessionStorage.clear();
          } catch {}
          setSessions([]);
          setMessages([]);
          const freshGuestId = 'guest_' + Date.now();
          setActiveSessionId(freshGuestId);
        }
      } catch (err) {
        console.warn('Profile fetch note:', err);
      }
    };
    loadProfile();
  }, []);

  // Vanish Mode: Purge ephemeral storage on page unload/refresh for guests
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!userProfile?.authenticated) {
        try {
          sessionStorage.clear();
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userProfile?.authenticated]);

  const loadAllSessions = async (profileOverride?: UserProfile | null) => {
    const isAuth = profileOverride !== undefined ? profileOverride?.authenticated : userProfile?.authenticated;
    if (!isAuth) {
      setSessions([]);
      return;
    }

    try {
      const data = await api.getAllSessions();
      if (data && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        const cached = sessionStorage.getItem('phantom_active_session');
        if (cached && data.sessions.some((s) => s.session_id === cached)) {
          handleSelectSession(cached);
        } else if (data.sessions.length > 0) {
          handleSelectSession(data.sessions[0].session_id);
        } else {
          handleNewChat();
        }
      }
    } catch {
      setSessions([]);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    sessionStorage.setItem('phantom_active_session', sessionId);

    try {
      const data = await api.getSessionHistory(sessionId);
      if (data && Array.isArray(data.history)) {
        const formatted: ChatMessage[] = data.history.map((msg, idx) => ({
          id: msg.db_id || `hist_${sessionId}_${idx}`,
          role: msg.role === 'model' ? 'model' : 'user',
          parts: msg.parts || [{ text: msg.content || '' }],
          timestamp: msg.timestamp || new Date().toISOString(),
          type: msg.type || 'text',
        }));
        setMessages(formatted);
      }
    } catch {
      setMessages([]);
    }
  };

  const handleNewChat = async () => {
    setActiveSessionId(null);
    sessionStorage.removeItem('phantom_active_session');
    setMessages([]);

    if (userProfile?.authenticated) {
      try {
        const res = await api.startNewChat();
        if (res && res.session_id) {
          setActiveSessionId(res.session_id);
          sessionStorage.setItem('phantom_active_session', res.session_id);
          await loadAllSessions();
        }
      } catch {
        const localId = 'guest_' + Date.now();
        setActiveSessionId(localId);
      }
    } else {
      const guestId = 'guest_' + Date.now();
      setActiveSessionId(guestId);
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    if (!userProfile?.authenticated) return;
    try {
      await api.renameSession(sessionId, newTitle);
      loadAllSessions();
    } catch {
      const updated = sessions.map((s) =>
        s.session_id === sessionId ? { ...s, title: newTitle } : s
      );
      setSessions(updated);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!userProfile?.authenticated) return;
    try {
      await api.deleteSession(sessionId);
      if (sessionId === activeSessionId) {
        handleNewChat();
      } else {
        loadAllSessions();
      }
    } catch {
      const updated = sessions.filter((s) => s.session_id !== sessionId);
      setSessions(updated);
      if (sessionId === activeSessionId) handleNewChat();
    }
  };

  const handleTogglePinSession = async (sessionId: string) => {
    const currentSession = sessions.find((s) => s.session_id === sessionId);
    const newPinned = !currentSession?.is_pinned;
    const updated = sessions.map((s) =>
      s.session_id === sessionId ? { ...s, is_pinned: newPinned } : s
    );
    setSessions(updated);

    if (userProfile?.authenticated) {
      try {
        await api.togglePinSession(sessionId, newPinned);
        loadAllSessions();
      } catch (err) {
        console.error('Failed to toggle pin on session:', err);
      }
    }
  };

  const handleShareChat = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      }
    } catch {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  const handleArchiveCurrentChat = () => {
    if (activeSessionId) {
      const updated = sessions.filter((s) => s.session_id !== activeSessionId);
      setSessions(updated);
      handleNewChat();
    } else {
      handleNewChat();
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleSaveVoiceExchange = (
    userText: string,
    aiText: string,
    sessionId?: string,
    sessionTitle?: string
  ) => {
    if (!userText.trim() || !aiText.trim()) return;

    if (sessionId && sessionId !== activeSessionId) {
      setActiveSessionId(sessionId);
      sessionStorage.setItem('phantom_active_session', sessionId);
    }
    if (sessionTitle) {
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === (sessionId || activeSessionId)
            ? { ...s, title: sessionTitle }
            : s
        )
      );
    }

    const userMsg: ChatMessage = {
      id: `user_voice_${Date.now()}`,
      role: 'user',
      parts: [{ text: userText }],
      timestamp: new Date().toISOString(),
    };
    const modelMsg: ChatMessage = {
      id: `model_voice_${Date.now() + 1}`,
      role: 'model',
      parts: [{ text: aiText }],
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, modelMsg]);
  };

  // Send Message & Real-Time SSE Streaming
  const handleSendMessage = async (
    text: string,
    file?: File | null,
    mode?: string | null
  ) => {
    if (isGenerating) return;

    let parts: any[] = [];
    if (file) {
      if (
        file.type.startsWith('image/') ||
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/')
      ) {
        const base64 = await convertFileToBase64(file);
        parts.push({
          inlineData: {
            mimeType: file.type || (file.name.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream'),
            data: base64.split(',')[1],
          },
        });
      } else {
        // Read text, markdown, code, json, csv, and document files
        try {
          const docContent = await readFileAsText(file);
          const ext = file.name.split('.').pop() || 'txt';
          parts.push({
            text: `[Attached File: ${file.name}]\n\`\`\`${ext}\n${docContent}\n\`\`\`\n`,
          });
        } catch (readErr) {
          console.warn('Document read note:', readErr);
          const base64 = await convertFileToBase64(file);
          parts.push({
            inlineData: {
              mimeType: file.type || 'text/plain',
              data: base64.split(',')[1],
            },
          });
        }
      }
    }

    let finalPrompt = text;
    if (mode) {
      finalPrompt = `Act as an expert ${mode}. ${text}`;
    }
    if (finalPrompt) {
      parts.push({ text: finalPrompt });
    }

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      parts,
      timestamp: new Date().toISOString(),
    };

    const pendingMsgId = `model_stream_${Date.now()}`;
    const pendingMsg: ChatMessage = {
      id: pendingMsgId,
      role: 'model',
      parts: [{ text: '' }],
      timestamp: new Date().toISOString(),
      typing: true,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages([...updatedHistory, pendingMsg]);
    setIsGenerating(true);
    activeStreamAbort.current = false;

    const payload = {
      contents: updatedHistory.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
      session_id: activeSessionId,
      language_name: settings.language,
      plugins: plugins,
    };

    let accumulatedText = '';

    await api.streamChat(
      payload,
      (chunk: string, sessionId?: string, sessionTitle?: string) => {
        if (activeStreamAbort.current) return;
        if (sessionId && sessionId !== activeSessionId) {
          setActiveSessionId(sessionId);
          sessionStorage.setItem('phantom_active_session', sessionId);
        }
        if (sessionTitle) {
          setSessions((prev) =>
            prev.map((s) =>
              s.session_id === (sessionId || activeSessionId)
                ? { ...s, title: sessionTitle }
                : s
            )
          );
        }
        accumulatedText += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingMsgId
              ? { ...msg, typing: false, parts: [{ text: accumulatedText }] }
              : msg
          )
        );
      },
      (sessionId?: string, sessionTitle?: string, searchMetadata?: any) => {
        setIsGenerating(false);
        if (sessionId) {
          setActiveSessionId(sessionId);
          sessionStorage.setItem('phantom_active_session', sessionId);
        }
        if (sessionTitle) {
          setSessions((prev) =>
            prev.map((s) =>
              s.session_id === (sessionId || activeSessionId)
                ? { ...s, title: sessionTitle }
                : s
            )
          );
        }
        if (searchMetadata) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === pendingMsgId ? { ...msg, searchMetadata } : msg
            )
          );
        }
        if (settings.autoSpeak && accumulatedText) {
          handleSpeak(accumulatedText);
        }
        loadAllSessions();
      },
      (err: string) => {
        setIsGenerating(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingMsgId
              ? {
                  ...msg,
                  typing: false,
                  parts: [{ text: `Error: ${err}` }],
                }
              : msg
          )
        );
      },
      (searchMetadata: any) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingMsgId ? { ...msg, searchMetadata } : msg
          )
        );
      }
    );
  };

  const handleStopGeneration = () => {
    activeStreamAbort.current = true;
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((m) => (m.typing ? { ...m, typing: false } : m))
    );
  };

  // Text-To-Speech (TTS) with Seamless Long Document Chunk Queueing
  const activeTtsUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsResumeTimer = useRef<any>(null);
  const ttsChunksQueue = useRef<string[]>([]);
  const isSpeakingQueue = useRef<boolean>(false);
  const activeSpeakingText = useRef<string>('');

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    ttsChunksQueue.current = [];
    isSpeakingQueue.current = false;
    activeSpeakingText.current = '';
    activeTtsUtterance.current = null;
    if (ttsResumeTimer.current) {
      clearInterval(ttsResumeTimer.current);
      ttsResumeTimer.current = null;
    }
  };

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Toggle off if currently speaking the exact same text
    if (isSpeakingQueue.current && activeSpeakingText.current === text) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const chunks = splitTextIntoSpeechChunks(text);
    if (chunks.length === 0) return;

    ttsChunksQueue.current = [...chunks];
    isSpeakingQueue.current = true;
    activeSpeakingText.current = text;

    const voices = window.speechSynthesis.getVoices();

    const speakNextChunk = () => {
      if (!isSpeakingQueue.current || ttsChunksQueue.current.length === 0) {
        stopSpeaking();
        return;
      }

      const nextText = ttsChunksQueue.current.shift();
      if (!nextText || !nextText.trim()) {
        speakNextChunk();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(nextText);
        activeTtsUtterance.current = utterance;
        applyVoiceCustomSettings(
          utterance,
          voices,
          settings.voice,
          settings.language || 'en-US',
          settings.speechRate ?? 1.0,
          settings.speechPitch ?? 1.0
        );

        utterance.onend = () => {
          activeTtsUtterance.current = null;
          speakNextChunk();
        };

        utterance.onerror = (e) => {
          console.warn('TTS chunk notice:', e);
          activeTtsUtterance.current = null;
          speakNextChunk();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis execution notice:', err);
        stopSpeaking();
      }
    };

    // Chromium keep-alive pulse for long documents
    ttsResumeTimer.current = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }, 4000);

    speakNextChunk();
  };

  const handleSendToIDE = (code: string, language: string) => {
    setIdeCode(code);
    setIdeLanguage(language || 'python');
    setActiveTab('compiler');
  };

  const handleReactToMessage = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const userReactions = msg.userReactions || [];
        const hasReacted = userReactions.includes(emoji);
        const updatedUserReactions = hasReacted
          ? userReactions.filter((e) => e !== emoji)
          : [...userReactions, emoji];

        const updatedReactions = { ...(msg.reactions || {}) };
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

        return {
          ...msg,
          reactions: updatedReactions,
          userReactions: updatedUserReactions,
        };
      })
    );
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'theme-light' ? 'theme-dark' : 'theme-light';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(nextTheme);
    try {
      localStorage.setItem('phantom-theme', nextTheme);
    } catch {}
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
    api.updateSettings({ theme: nextTheme }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-screen bg-cyber-dark text-slate-100 overflow-hidden font-sans">
      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Render Left Sidebar only when logged in / authenticated */}
        {userProfile?.authenticated && (
          <>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="group absolute left-3 top-3 z-30 w-9 h-9 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-100 hover:text-white shadow-md transition-all flex items-center justify-center cursor-pointer"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <PhantomIconSvg className="w-5 h-5 text-zinc-100 group-hover:hidden transition-all" />
                <SidebarExpandIconSvg className="w-5 h-5 text-white hidden group-hover:block transition-all" />
              </button>
            )}

            {/* Left Sidebar for Chat History */}
            <Sidebar
              isOpen={sidebarOpen}
              onCloseMobile={() => setSidebarOpen(false)}
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              onRenameSession={handleRenameSession}
              onDeleteSession={handleDeleteSession}
              onTogglePinSession={handleTogglePinSession}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isAuthenticated={Boolean(userProfile?.authenticated)}
              onOpenAuth={() => handleOpenAuth()}
              userProfile={userProfile}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenProfile={() => setProfileOpen(true)}
              onOpenLibrary={() => setLibraryOpen(true)}
              onOpenScheduled={() => setScheduledOpen(true)}
              onOpenPlugins={() => setPluginsOpen(true)}
              currentTheme={settings.theme}
              onToggleTheme={handleToggleTheme}
              onToggleSidebar={() => setSidebarOpen((open) => !open)}
            />
          </>
        )}

        {/* Dynamic Center Area based on activeTab */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-cyber-dark relative">
              {/* Top Right Header Controls: Share, More Options, and Account */}
              <div className="absolute right-4 top-3.5 z-30 flex items-center gap-2">
                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShareChat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Share chat"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Share</span>
                    </>
                  )}
                </button>

                {/* More Options Dropdown */}
                <div className="relative" ref={chatMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
                      showChatMenu
                        ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                        : 'bg-zinc-900/90 hover:bg-zinc-850 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                    }`}
                    title="More actions"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu matching user specification */}
                  {showChatMenu && (
                    <div className="absolute right-0 top-full mt-2 w-52 p-1.5 rounded-2xl glass-dropdown border border-zinc-700/80 shadow-2xl z-50 bg-zinc-950/95 backdrop-blur-xl animate-fade-in text-xs font-medium space-y-0.5">
                      {/* 1. View files in chat */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatMenu(false);
                          setLibraryOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer text-left"
                      >
                        <Files className="w-4 h-4 text-zinc-400" />
                        <span>View files in chat</span>
                      </button>

                      {/* 2. Pin chat */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatMenu(false);
                          if (activeSessionId) {
                            handleTogglePinSession(activeSessionId);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer text-left"
                      >
                        <Pin className={`w-4 h-4 ${sessions.find((s) => s.session_id === activeSessionId)?.is_pinned ? 'text-amber-400 fill-amber-400' : 'text-zinc-400'}`} />
                        <span>{sessions.find((s) => s.session_id === activeSessionId)?.is_pinned ? 'Unpin chat' : 'Pin chat'}</span>
                      </button>

                      {/* 3. Archive */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatMenu(false);
                          handleArchiveCurrentChat();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer text-left"
                      >
                        <Archive className="w-4 h-4 text-zinc-400" />
                        <span>Archive</span>
                      </button>

                      {/* 4. Delete */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatMenu(false);
                          if (activeSessionId) {
                            handleDeleteSession(activeSessionId);
                          } else {
                            handleNewChat();
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Delete</span>
                      </button>

                      {/* Divider */}
                      <div className="my-1 border-t border-zinc-800/80" />

                      {/* 5. Move to project */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatMenu(false);
                          setActiveTab('compiler');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-850 transition-colors cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Folder className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                          <span>Move to project</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Account / User Profile / Sign In button */}
                {userProfile?.authenticated ? (
                  <button
                    onClick={() => setProfileOpen(true)}
                    className="flex items-center gap-2 py-1 px-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-xs cursor-pointer shadow-sm group"
                    title={userProfile.user.displayName || userProfile.user.email || 'User Profile'}
                  >
                    {userProfile.user.pictureUrl ? (
                      <img
                        src={userProfile.user.pictureUrl}
                        alt="Avatar"
                        className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center">
                        {(userProfile.user.displayName || userProfile.user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-zinc-300 group-hover:text-white font-medium max-w-[120px] truncate text-xs">
                      {userProfile.user.displayName || userProfile.user.email?.split('@')[0] || 'Account'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenAuth()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-subtle transition-all cursor-pointer active:scale-95"
                    title="Sign in to your account"
                  >
                    <User className="w-3.5 h-3.5 text-black" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>

              <ChatContainer
                messages={messages}
                userAvatar={userProfile?.user.pictureUrl}
                onSpeak={handleSpeak}
                onSendToIDE={handleSendToIDE}
                onEditMessage={(txt) => {
                  handleSendMessage(txt);
                }}
                onRetry={() => {
                  if (messages.length >= 2) {
                    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                    if (lastUser) {
                      const text = lastUser.parts.map((p) => p.text || '').join(' ');
                      handleSendMessage(text);
                    }
                  }
                }}
                onSelectSuggestion={(promptText) => {
                  handleSendMessage(promptText);
                }}
                onReact={handleReactToMessage}
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
                languageName={settings.language}
                onOpenStudio={(tab) => setActiveTab(tab)}
                pluginsState={plugins}
                onTogglePlugin={handleTogglePlugin}
                onOpenPlugins={() => setPluginsOpen(true)}
                onOpenVoiceMode={() => setVoiceModeOpen(true)}
                isAuthenticated={Boolean(userProfile?.authenticated)}
              />
            </div>
          )}

          {activeTab === 'compiler' && (
            <DevStudio
              initialCode={ideCode}
              initialLanguage={ideLanguage}
              onBackToChat={() => setActiveTab('chat')}
              isAuthenticated={Boolean(userProfile?.authenticated)}
              userProfile={userProfile}
              onOpenAuth={() => handleOpenAuth()}
            />
          )}

          {activeTab === 'image_studio' && (
            <ImageStudio
              onBackToChat={() => setActiveTab('chat')}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
        userProfile={userProfile}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialEmail={authInitialEmail}
        initialMode={authInitialMode}
        onAuthSuccess={(prof) => {
          setUserProfile(prof);
          if (prof?.authenticated) loadAllSessions(prof);
        }}
      />

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={userProfile}
        onOpenAuth={(email, mode) => handleOpenAuth(email, mode)}
        onProfileUpdated={(prof) => {
          setUserProfile(prof);
          if (prof?.authenticated) {
            loadAllSessions(prof);
          } else {
            setSessions([]);
          }
        }}
      />

      <LibraryModal
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        sessions={sessions}
        onSelectSession={handleSelectSession}
        onTogglePinSession={handleTogglePinSession}
        onOpenStudio={(tab) => setActiveTab(tab)}
        onSendPromptToChat={(prompt) => {
          setLibraryOpen(false);
          setActiveTab('chat');
          handleSendMessage(prompt);
        }}
      />

      <ScheduledModal
        isOpen={scheduledOpen}
        onClose={() => setScheduledOpen(false)}
        onRunPrompt={(prompt) => {
          setScheduledOpen(false);
          setActiveTab('chat');
          handleSendMessage(prompt);
        }}
      />

      <PluginsModal
        isOpen={pluginsOpen}
        onClose={() => setPluginsOpen(false)}
        pluginsState={plugins}
        onTogglePlugin={handleTogglePlugin}
      />

      {/* Direct Conversational Live Voice Mode Modal */}
      <VoiceChatModal
        isOpen={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onSaveVoiceExchange={handleSaveVoiceExchange}
        onSendMessage={async (prompt) => {
          handleSendMessage(prompt);
        }}
        activeSessionId={activeSessionId || undefined}
        userVoice={settings.voice}
        language={settings.language}
        speechRate={settings.speechRate}
        speechPitch={settings.speechPitch}
        onSessionUpdated={(sId, sTitle) => {
          if (sId && sId !== activeSessionId) {
            setActiveSessionId(sId);
            sessionStorage.setItem('phantom_active_session', sId);
          }
          if (sTitle) {
            setSessions((prev) =>
              prev.map((s) =>
                s.session_id === (sId || activeSessionId) ? { ...s, title: sTitle } : s
              )
            );
          }
        }}
      />
    </div>
  );
};
