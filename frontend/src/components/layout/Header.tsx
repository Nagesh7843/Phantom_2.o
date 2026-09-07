import {
  Settings,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Sun,
  Moon,
  MessageSquare,
  Code2,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '@/types';
import { PhantomLogo } from '../common/PhantomLogo';

export type ActiveTab = 'chat' | 'compiler' | 'image_studio';

interface HeaderProps {
  activeTab?: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userProfile: UserProfile | null;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  backendOnline?: boolean;
  currentTheme: string;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'chat',
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  userProfile,
  onOpenSettings,
  onOpenAuth,
  onOpenProfile,
  backendOnline,
  currentTheme,
  onToggleTheme,
}) => {

  return (
    <header className="h-16 border-b border-zinc-800 bg-black/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Sidebar toggle and brand logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors focus:outline-none"
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="cursor-pointer" onClick={() => setActiveTab('chat')}>
          <PhantomLogo variant="horizontal" size="md" />
        </div>
      </div>

      {/* Center: Quick Mode Switcher */}
      <div className="hidden sm:flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'chat'
              ? 'bg-white text-black shadow-mono-subtle'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('compiler')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'compiler'
              ? 'bg-white text-black shadow-mono-subtle'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Dev Studio</span>
        </button>

        <button
          onClick={() => setActiveTab('image_studio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'image_studio'
              ? 'bg-white text-black shadow-mono-subtle'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Studio</span>
        </button>
      </div>

      {/* Right: Theme Toggle, Settings, User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title={currentTheme === 'theme-light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {currentTheme === 'theme-light' ? (
            <Moon className="w-5 h-5 text-black" />
          ) : (
            <Sun className="w-5 h-5 text-white" />
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          title="Voice & Language Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User profile / Auth button */}
        {userProfile?.authenticated ? (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-500 transition-all text-xs"
          >
            <span className="text-zinc-200 font-medium max-w-[100px] truncate">
              {userProfile.user.displayName || 'Account'}
            </span>
            {userProfile.user.pictureUrl ? (
              <img
                src={userProfile.user.pictureUrl}
                alt="User Avatar"
                className="w-7 h-7 rounded-full object-cover border border-zinc-600"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center font-bold text-black text-xs">
                {(userProfile.user.displayName || 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all shadow-mono-glow"
          >
            <User className="w-3.5 h-3.5 text-black" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

