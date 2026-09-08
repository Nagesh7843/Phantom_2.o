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
import { ChatMessage, ChatSession, UserProfile, UserSettings } from '@/types';
import { ArrowLeft, Home as HomeIcon, User } from 'lucide-react';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

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
          setSessions([]);
        }
      } catch (err) {
        console.warn('Profile fetch note:', err);
      }
    };
    loadProfile();
  }, []);

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

  // Text-To-Speech (TTS)
  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted in speech.')
        .replace(/[`*#_~[\]()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      if (settings.voice) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find((v) => v.name === settings.voice);
        if (selected) utterance.voice = selected;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  };

  const handleSendToIDE = (code: string, language: string) => {
    setIdeCode(code);
    setIdeLanguage(language || 'python');
    setActiveTab('compiler');
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
          onOpenAuth={() => setAuthOpen(true)}
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

        {/* Dynamic Center Area based on activeTab */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-cyber-dark relative">
              {/* Top Right Header Controls: Sign In or User Profile */}
              <div className="absolute right-4 top-3.5 z-30 flex items-center gap-2">
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
                    onClick={() => setAuthOpen(true)}
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
              onOpenAuth={() => setAuthOpen(true)}
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
        onAuthSuccess={(prof) => {
          setUserProfile(prof);
          if (prof?.authenticated) loadAllSessions(prof);
        }}
      />

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={userProfile}
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
