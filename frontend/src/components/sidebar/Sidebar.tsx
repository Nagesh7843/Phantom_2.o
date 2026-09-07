import React, { useState } from 'react';
import {
  Plus,
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
  PanelLeftOpen,
  Pin,
  Sparkles,
  Boxes,
} from 'lucide-react';
import { ChatSession, UserProfile } from '@/types';
import { ActiveTab } from '../layout/Header';
import { PhantomLogo, PhantomIconSvg } from '../common/PhantomLogo';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  isAuthenticated?: boolean;
  onOpenAuth?: () => void;
  userProfile?: UserProfile | null;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
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
  activeTab = 'chat',
  setActiveTab,
  isAuthenticated = false,
  onOpenAuth,
  userProfile,
  onOpenSettings,
  onOpenProfile,
  currentTheme = 'theme-dark',
  onToggleTheme,
  onToggleSidebar,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredSessions = sessions.filter((s) =>
    (s.title || 'Untitled Chat').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const userInitial = userProfile?.authenticated && userProfile.user.displayName
    ? userProfile.user.displayName[0].toUpperCase()
    : 'N';

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
      {/* COLLAPSED ICON RAIL (MATCHING CHATGPT REFERENCE IMAGE 3)                 */}
      {/* ----------------------------------------------------------------------- */}
      {!isOpen && (
        <aside className="hidden md:flex flex-col items-center justify-between w-14 bg-zinc-950 border-r border-zinc-850 py-3 select-none flex-shrink-0 z-20">
          {/* Top: Phantom Logo & Primary Action Icons */}
          <div className="flex flex-col items-center gap-4 w-full px-2">
            {/* Theme-Adaptive Phantom Logo (Light in dark mode, Dark in light mode) */}
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-xl hover:bg-zinc-900 transition-all group"
              title="Expand Sidebar (Open menu)"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-black dark:bg-black dark:text-white flex items-center justify-center border border-zinc-300 dark:border-zinc-800 shadow-sm transition-colors">
                <PhantomIconSvg className="w-5 h-5 text-black dark:text-white" />
              </div>
            </button>

            {/* New Chat / Compose */}
            <button
              onClick={() => {
                onNewChat();
                setActiveTab?.('chat');
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="New Chat Session"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Search */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="Search Conversations"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Pin / Workspace */}
            <button
              onClick={() => setActiveTab?.('compiler')}
              className={`p-2 rounded-xl transition-colors ${
                activeTab === 'compiler'
                  ? 'text-white bg-zinc-800 shadow-mono-subtle'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Dev Studio Workspace (IDE)"
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Chat History */}
            <button
              onClick={() => {
                setActiveTab?.('chat');
                onToggleSidebar?.();
              }}
              className={`p-2 rounded-xl transition-colors ${
                activeTab === 'chat'
                  ? 'text-white bg-zinc-800 shadow-mono-subtle'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
              title="Chat History"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom: User Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={userProfile?.authenticated ? onOpenProfile : onOpenAuth}
              className="p-0.5 rounded-full hover:ring-2 hover:ring-zinc-700 transition-all"
              title={userProfile?.authenticated ? userProfile.user.displayName || 'Account' : 'Sign In'}
            >
              {userProfile?.authenticated && userProfile.user.pictureUrl ? (
                <img
                  src={userProfile.user.pictureUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {userInitial}
                </div>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* EXPANDED SIDEBAR DRAWER                                                 */}
      {/* ----------------------------------------------------------------------- */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-zinc-950 border-r border-zinc-850 flex flex-col transition-all duration-300 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        }`}
      >
        {/* Top Header: Logo, Hide Button & New Chat */}
        <div className="p-3.5 border-b border-zinc-850 space-y-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <PhantomLogo variant="horizontal" size="md" />
            <button
              onClick={onToggleSidebar}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-850 hover:text-white"
              title="Hide sidebar"
              aria-label="Hide sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              setActiveTab?.('chat');
              if (window.innerWidth < 768) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-bold text-xs shadow-mono-glow transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-black" />
            <span>New Chat Session</span>
          </button>

          {/* Search sessions filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation History List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 custom-scrollbar">
          {!isAuthenticated ? (
            <div className="py-8 text-center px-4 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 shadow-inner">
                <Lock className="w-5 h-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-200">Guest Mode</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Sign in to save and sync your conversations with PostgreSQL cloud persistence.
                </p>
              </div>
            </div>
          ) : (
            <React.Fragment>
              <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Recent Conversations</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {filteredSessions.length}
                </span>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">
                    {searchTerm ? 'No matching chats' : 'No conversations yet'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Start typing to begin a chat
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isActive = session.session_id === activeSessionId && activeTab === 'chat';
                  const isEditing = editingId === session.session_id;

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
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-zinc-850 text-white border border-zinc-700 shadow-mono-subtle font-semibold'
                          : 'text-zinc-300 hover:bg-zinc-900 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <MessageSquare
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                          }`}
                        />
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

                      {/* Actions (Rename / Delete) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <React.Fragment>
                            <button
                              onClick={(e) => confirmRename(e, session.session_id)}
                              className="p-1 text-white hover:text-zinc-300"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelRename}
                              className="p-1 text-zinc-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <button
                              onClick={(e) => startRename(e, session)}
                              className="p-1 text-zinc-400 hover:text-white transition-colors"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
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
                })
              )}
            </React.Fragment>
          )}
        </div>

        {/* Footer Actions: Theme Toggle, Settings, Account */}
        <div className="border-t border-zinc-850 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              title={currentTheme === 'theme-light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {currentTheme === 'theme-light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              <span>{currentTheme === 'theme-light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              title="Open full system preferences"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {userProfile?.authenticated ? (
            <button
              onClick={onOpenProfile}
              className="flex w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition-colors hover:border-zinc-600"
            >
              {userProfile.user.pictureUrl ? (
                <img
                  src={userProfile.user.pictureUrl}
                  alt="User avatar"
                  className="h-7 w-7 rounded-full border border-zinc-700 object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                  {userInitial}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200">
                {userProfile.user.displayName || 'Account'}
              </span>
              <User className="h-3.5 w-3.5 text-zinc-500" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign in / Register</span>
            </button>
          )}
        </div>
      </aside>
    </React.Fragment>
  );
};
