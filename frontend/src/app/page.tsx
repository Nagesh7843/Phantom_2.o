'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { ActiveTab } from '@/components/layout/Header';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { DevStudio } from '@/components/compiler/DevStudio';
import { ImageStudio } from '@/components/dashboard/ImageStudio';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { AuthModal } from '@/components/modals/AuthModal';
import { ProfileModal } from '@/components/modals/ProfileModal';
import { api } from '@/lib/api';
import { ChatMessage, ChatSession, UserProfile, UserSettings } from '@/types';

export default function Home() {
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
  const [backendOnline, setBackendOnline] = useState(false);

  const activeStreamAbort = useRef<boolean>(false);

  // Load Initial Data (Health, Profile, Sessions, Local Settings)
  useEffect(() => {
    // 1. Restore local theme
    const savedTheme = localStorage.getItem('phantom-theme') || 'theme-dark';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(savedTheme);
    setSettings((prev) => ({ ...prev, theme: savedTheme }));

    // 2. Check Backend Health
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    checkHealth();

    // 3. Load User Profile
    const loadProfile = async () => {
      try {
        const profile = await api.getUserProfile();
        setUserProfile(profile);
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
      // Guest mode: ephemeral session ID only, not saved to DB
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

  // Send Message & Real-Time SSE Streaming
  const handleSendMessage = async (
    text: string,
    file?: File | null,
    mode?: string | null
  ) => {
    if (isGenerating) return;

    let parts: any[] = [];
    if (file) {
      const base64 = await convertFileToBase64(file);
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: base64.split(',')[1],
        },
      });
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

    // Build backend payload
    const payload = {
      contents: updatedHistory.map((m) => ({
        role: m.role,
        parts: m.parts,
      })),
      session_id: activeSessionId,
      language_name: settings.language,
    };

    let accumulatedText = '';

    await api.streamChat(
      payload,
      (chunk: string, sessionId?: string) => {
        if (activeStreamAbort.current) return;
        if (sessionId && sessionId !== activeSessionId) {
          setActiveSessionId(sessionId);
          sessionStorage.setItem('phantom_active_session', sessionId);
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
      (sessionId?: string) => {
        setIsGenerating(false);
        if (sessionId) {
          setActiveSessionId(sessionId);
          sessionStorage.setItem('phantom_active_session', sessionId);
        }
        // Auto speak response if enabled
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
      const cleanText = text.replace(/[`*#_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
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
    localStorage.setItem('phantom-theme', nextTheme);
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  return (
    <div className="flex flex-col h-screen bg-cyber-dark text-slate-100 overflow-hidden font-sans">
      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-3 top-3 z-30 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 shadow-lg transition-colors hover:border-zinc-600 hover:text-white"
            title="Show sidebar"
            aria-label="Show sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
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
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAuthenticated={Boolean(userProfile?.authenticated)}
          onOpenAuth={() => setAuthOpen(true)}
          userProfile={userProfile}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          currentTheme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        {/* Dynamic Center Area based on activeTab */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-cyber-dark">
              <ChatContainer
                messages={messages}
                userAvatar={userProfile?.user.pictureUrl}
                onSpeak={handleSpeak}
                onSendToIDE={handleSendToIDE}
                onEditMessage={(txt) => {
                  // Pre-fill input with question for editing
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
    </div>
  );
}
