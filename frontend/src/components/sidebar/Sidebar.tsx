'use strict';
import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  LogIn,
  Settings,
  Sun,
  Moon,
  User,
  PanelLeftClose,
  Pin,
  Sparkles,
  BookOpen,
  Folder,
  Clock,
  Puzzle,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';
import { ChatSession, UserProfile } from '@/types';
import { ActiveTab } from '../layout/Header';
import { PhantomLogo, PhantomIconSvg, SidebarExpandIconSvg } from '../common/PhantomLogo';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onTogglePinSession?: (id: string) => void;
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
  userProfile?: UserProfile | null;
  onOpenSettings?: (initialSection?: any) => void;
  onOpenProfile?: () => void;
  onOpenLibrary?: () => void;
  onOpenScheduled?: () => void;
  onOpenPlugins?: () => void;
  currentTheme?: string;
  onToggleTheme?: () => void;
  onToggleSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  onTogglePinSession,
  activeTab = 'chat',
  setActiveTab,
  isAuthenticated = false,
  onOpenAuth,
  userProfile,
  onOpenSettings,
  onOpenProfile,
  onOpenLibrary,
  onOpenScheduled,
  onOpenPlugins,
  currentTheme = 'theme-dark',
  onToggleTheme,
  onToggleSidebar,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when toggled open
  useEffect(() => {
    if (showSearchBox && isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [showSearchBox, isOpen]);

  // Filter sessions by search term
  const filteredSessions = sessions.filter((s) =>
    (s.title || 'Untitled Chat').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter((s) => Boolean(s.is_pinned));
  const recentSessions = filteredSessions.filter((s) => !s.is_pinned);

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.session_id);
    setEditTitle(session.title || 'Chat Session');
  };

  const confirmRename = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat session?')) {
      onDeleteSession(sessionId);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onTogglePinSession?.(sessionId);
  };

  const userInitial =
    userProfile?.authenticated && (userProfile.user.displayName || userProfile.user.email)
      ? (userProfile.user.displayName || userProfile.user.email)![0].toUpperCase()
      : null;

  return (
    <React.Fragment>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-30 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 1. COLLAPSED MINI RAIL (LEFT COLUMN)                                    */}
      {/* ----------------------------------------------------------------------- */}
      {!isOpen && (
        <aside className="hidden md:flex flex-col items-center justify-between w-14 bg-zinc-950 border-r border-zinc-850 py-3 select-none flex-shrink-0 z-20">
          {/* Top: Phantom Theme-Adaptive Logo & Quick Action Rail */}
          <div className="flex flex-col items-center gap-3.5 w-full px-2">
            {/* Theme-Adaptive Phantom Logo (Default) -> Converts to Sidebar Expand Icon on Cursor Hover */}
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center group relative cursor-pointer text-zinc-100 hover:text-white"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              {/* Default: Phantom Logo */}
              <PhantomIconSvg className="w-5 h-5 text-zinc-100 group-hover:hidden transition-all" />

              {/* On Hover: Expand Panel Icon [ |> ] */}
              <SidebarExpandIconSvg className="w-5 h-5 text-white hidden group-hover:block transition-all" />
            </button>

            {/* 1. New Chat (Pencil) */}
            <button
              onClick={() => {
                onNewChat();
                setActiveTab?.('chat');
              }}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
              title="New Chat"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* 2. Search */}
            <button
              onClick={() => {
                setShowSearchBox(true);
                onToggleSidebar?.();
              }}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* 3. Library (Pinned / Saved) */}
            <button
              onClick={() => {
                onOpenLibrary?.();
              }}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
              title="Library (Pinned & Saved Prompts)"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* 4. Projects (Dev Studio Workspace) */}
            <button
              onClick={() => setActiveTab?.('compiler')}
              className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                activeTab === 'compiler'
                  ? 'text-white bg-zinc-850 shadow-mono-subtle'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Projects & Dev Studio"
            >
              <Folder className="w-4 h-4" />
            </button>

            {/* 5. Scheduled Tasks */}
            <button
              onClick={() => onOpenScheduled?.()}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
              title="Scheduled Automations"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* 6. Plugins */}
            <button
              onClick={() => onOpenPlugins?.()}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all active:scale-95"
              title="Plugins & Extensions"
            >
              <Puzzle className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom: Real User Profile Avatar (or Sign In if guest) */}
          <div className="flex flex-col items-center gap-2">
            {userProfile?.authenticated ? (
              <button
                onClick={onOpenProfile}
                className="p-0.5 rounded-full hover:ring-2 hover:ring-zinc-600 transition-all"
                title={userProfile.user.displayName || userProfile.user.email || 'User Profile'}
              >
                {userProfile.user.pictureUrl ? (
                  <img
                    src={userProfile.user.pictureUrl}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center shadow-sm">
                    {userInitial}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Sign in / Register"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </aside>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 2. EXPANDED SIDEBAR DRAWER (MATCHING USER REFERENCE LAYOUT)             */}
      {/* ----------------------------------------------------------------------- */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-850 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Top Header: Brand Name & Icons (Search & Collapse) */}
        <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <PhantomIconSvg className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">Phantom</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Search Icon */}
            <button
              onClick={() => setShowSearchBox((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors ${
                showSearchBox ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
              title="Search conversations"
              aria-label="Search conversations"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Sidebar Collapse Icon */}
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Primary Action List (Above Chat History) */}
        <div className="px-2 py-1 space-y-0.5">
          {/* 1. New chat */}
          <button
            onClick={() => {
              onNewChat();
              setActiveTab?.('chat');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-200 hover:text-white hover:bg-zinc-900 transition-all text-left group"
          >
            <Edit2 className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span>New chat</span>
          </button>

          {/* 2. Library */}
          <button
            onClick={() => onOpenLibrary?.()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all text-left group"
          >
            <BookOpen className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="flex-1">Library</span>
            {pinnedSessions.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {pinnedSessions.length}
              </span>
            )}
          </button>

          {/* 3. Projects */}
          <button
            onClick={() => {
              setActiveTab?.('compiler');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left group ${
              activeTab === 'compiler'
                ? 'bg-zinc-850 text-white font-bold shadow-mono-subtle'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Folder className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span>Projects</span>
          </button>

          {/* 4. Scheduled */}
          <button
            onClick={() => onOpenScheduled?.()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all text-left group"
          >
            <Clock className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span>Scheduled</span>
          </button>

          {/* 5. Plugins */}
          <button
            onClick={() => onOpenPlugins?.()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all text-left group"
          >
            <Puzzle className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span>Plugins</span>
          </button>

          {/* 6. More */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all text-left group"
            >
              <MoreHorizontal className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              <span>More</span>
            </button>

            {/* More Popover Options */}
            {showMoreMenu && (
              <div className="absolute left-2 right-2 top-full mt-1 bg-zinc-900 border border-zinc-750 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5 animate-in fade-in duration-150">
                <button
                  onClick={() => {
                    onOpenSettings?.('general');
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>System Preferences</span>
                </button>
                <button
                  onClick={() => {
                    onOpenPlugins?.();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>AI Subprocess Engine</span>
                </button>
                <button
                  onClick={() => {
                    onOpenSettings?.('billing');
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Subscription & Billing</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Box (Toggled) */}
        {showSearchBox && (
          <div className="px-3 py-1.5 animate-in fade-in duration-150">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white transition-colors font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-3 my-1.5 border-t border-zinc-850" />

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-2 custom-scrollbar">
          {!isAuthenticated ? (
            <div className="py-6 text-center px-4 space-y-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <Lock className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Guest Mode</p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                  Sign in to save and sync your conversations with PostgreSQL cloud persistence.
                </p>
              </div>
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors shadow-mono-subtle"
              >
                <LogIn className="w-3.5 h-3.5 text-black" />
                <span>Sign in</span>
              </button>
            </div>
          ) : (
            <React.Fragment>
              {filteredSessions.length === 0 ? (
                <div className="py-6 text-center px-4">
                  <MessageSquare className="w-7 h-7 text-zinc-800 mx-auto mb-1.5" />
                  <p className="text-xs text-zinc-400 font-medium">
                    {searchTerm ? 'No matching chats' : 'No conversations yet'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Click New chat to start
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Pinned Group */}
                  {pinnedSessions.length > 0 && (
                    <div className="space-y-0.5">
                      <div className="px-2 py-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Pin className="w-3 h-3 text-zinc-400 fill-zinc-400/40" />
                          <span>Pinned</span>
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {pinnedSessions.length}
                        </span>
                      </div>
                      {pinnedSessions.map((session) => renderSessionItem(session))}
                    </div>
                  )}

                  {/* Recent Conversations Group */}
                  <div className="space-y-0.5">
                    <div className="px-2 py-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <span>Recent</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {recentSessions.length}
                      </span>
                    </div>
                    {recentSessions.map((session) => renderSessionItem(session))}
                  </div>
                </div>
              )}
            </React.Fragment>
          )}
        </div>

        {/* Footer Toolbar: Theme Toggle, Settings, Real User Account */}
        <div className="border-t border-zinc-850 p-2.5 space-y-2 bg-zinc-950">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              title={
                currentTheme === 'theme-light' ? 'Switch to dark mode' : 'Switch to light mode'
              }
            >
              {currentTheme === 'theme-light' ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5" />
              )}
              <span>{currentTheme === 'theme-light' ? 'Dark' : 'Light'}</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              title="Open system preferences"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {userProfile?.authenticated ? (
            <button
              onClick={onOpenProfile}
              className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-left transition-colors hover:border-zinc-600 group"
            >
              {userProfile.user.pictureUrl ? (
                <img
                  src={userProfile.user.pictureUrl}
                  alt="User avatar"
                  className="h-6 w-6 rounded-full border border-zinc-700 object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-100">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-200 group-hover:text-white">
                  {userProfile.user.displayName || userProfile.user.email || 'Account'}
                </p>
              </div>
              <User className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </aside>
    </React.Fragment>
  );

  function renderSessionItem(session: ChatSession) {
    const isActive = session.session_id === activeSessionId && activeTab === 'chat';
    const isEditing = editingId === session.session_id;
    const isPinned = Boolean(session.is_pinned);

    return (
      <div
        key={session.session_id}
        onClick={() => {
          if (!isEditing) {
            onSelectSession(session.session_id);
            setActiveTab?.('chat');
            if (window.innerWidth < 768) onCloseMobile();
          }
        }}
        className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-all ${
          isActive
            ? 'bg-zinc-850 text-white border border-zinc-700 shadow-mono-subtle font-semibold'
            : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
          {isPinned ? (
            <Pin className="w-3.5 h-3.5 flex-shrink-0 text-white fill-white/20" />
          ) : (
            <MessageSquare
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
              }`}
            />
          )}

          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename(e as any, session.session_id);
                if (e.key === 'Escape') cancelRename(e as any);
              }}
              autoFocus
              className="bg-black border border-white text-white text-xs rounded px-1.5 py-0.5 w-full focus:outline-none font-sans"
            />
          ) : (
            <span className="truncate">{session.title || 'Untitled Session'}</span>
          )}
        </div>

        {/* Action buttons: Pin / Rename / Delete */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <React.Fragment>
              <button
                onClick={(e) => confirmRename(e, session.session_id)}
                className="p-1 text-white hover:text-zinc-300"
                title="Save title"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={cancelRename}
                className="p-1 text-zinc-400 hover:text-white"
                title="Cancel rename"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </React.Fragment>
          ) : (
            <React.Fragment>
              {/* Pin / Unpin Button */}
              <button
                onClick={(e) => handleTogglePin(e, session.session_id)}
                className={`p-1 transition-colors ${
                  isPinned
                    ? 'text-white hover:text-zinc-300'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={isPinned ? 'Unpin chat' : 'Pin chat to top'}
              >
                <Pin className={`w-3 h-3 ${isPinned ? 'fill-white' : ''}`} />
              </button>

              {/* Rename Button */}
              <button
                onClick={(e) => startRename(e, session)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title="Rename chat"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(e, session.session_id)}
                className="p-1 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Delete chat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
    );
  }
};
