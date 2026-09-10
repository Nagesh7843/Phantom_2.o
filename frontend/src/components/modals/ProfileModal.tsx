'use strict';
import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  LogOut,
  Save,
  Check,
  UserPlus,
  ArrowLeftRight,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { UserProfile } from '@/types';

interface SavedAccount {
  email: string;
  displayName: string;
  pictureUrl?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile) => void;
  onOpenAuth?: (initialEmail?: string, mode?: 'login' | 'register') => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  onOpenAuth,
}) => {
  const [displayName, setDisplayName] = useState(profile?.user.displayName || '');
  const [email, setEmail] = useState(profile?.user.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  useEffect(() => {
    if (profile?.user?.email) {
      setDisplayName(profile.user.displayName || '');
      setEmail(profile.user.email || '');

      // Load saved accounts from localStorage
      try {
        const stored = localStorage.getItem('phantom_saved_accounts');
        let accounts: SavedAccount[] = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(accounts)) accounts = [];

        // Ensure active account is in the saved list
        const activeItem: SavedAccount = {
          email: profile.user.email,
          displayName: profile.user.displayName || profile.user.email.split('@')[0],
          pictureUrl: profile.user.pictureUrl || undefined,
        };

        const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === profile.user.email?.toLowerCase());
        if (existingIdx >= 0) {
          accounts[existingIdx] = activeItem;
        } else {
          accounts.unshift(activeItem);
        }

        setSavedAccounts(accounts);
        localStorage.setItem('phantom_saved_accounts', JSON.stringify(accounts));
      } catch {}
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({ displayName, email });
      const updated = await api.getUserProfile();
      onProfileUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  const handleSwitchToAccount = async (targetAccount: SavedAccount) => {
    onClose();
    // Open auth to switch account with prefilled email
    onOpenAuth?.(targetAccount.email, 'login');
  };

  const handleAddNewAccount = () => {
    onClose();
    onOpenAuth?.('', 'login');
  };

  const handleRemoveSavedAccount = (e: React.MouseEvent, emailToRemove: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter((a) => a.email.toLowerCase() !== emailToRemove.toLowerCase());
    setSavedAccounts(updated);
    try {
      localStorage.setItem('phantom_saved_accounts', JSON.stringify(updated));
    } catch {}
  };

  const otherAccounts = savedAccounts.filter(
    (a) => a.email.toLowerCase() !== (profile.user.email || '').toLowerCase()
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-zinc-850 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-850/80">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-white" />
            <h3 className="text-sm font-semibold text-white">Account Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Account Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            {profile.user.pictureUrl ? (
              <img
                src={profile.user.pictureUrl}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover border border-zinc-700 flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-white font-bold text-black text-base flex items-center justify-center flex-shrink-0">
                {(profile.user.displayName || profile.user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h4 className="font-semibold text-white text-xs truncate">
                {profile.user.displayName || 'Phantom User'}
              </h4>
              <p className="text-[11px] text-zinc-400 truncate">{profile.user.email || 'No email'}</p>
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 mt-0.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Active session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Switch Account Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-0.5">
            <span>Switch Account</span>
            <button
              type="button"
              onClick={handleAddNewAccount}
              className="text-white hover:text-zinc-300 flex items-center gap-1 font-semibold transition-colors"
            >
              <UserPlus className="w-3 h-3" />
              <span>+ Add Account</span>
            </button>
          </div>

          {/* List of Other Accounts if any */}
          {otherAccounts.length > 0 && (
            <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
              {otherAccounts.map((acc) => (
                <div
                  key={acc.email}
                  onClick={() => handleSwitchToAccount(acc)}
                  className="p-2 px-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850/60 hover:border-zinc-750 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {acc.pictureUrl ? (
                      <img
                        src={acc.pictureUrl}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-zinc-700">
                        {(acc.displayName || acc.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                        {acc.displayName || acc.email.split('@')[0]}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{acc.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-white px-2 py-0.5 rounded-lg bg-zinc-800">
                      Switch
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSavedAccount(e, acc.email)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Remove account from device"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minimal Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-3 pt-1 border-t border-zinc-850/80">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-rose-300 text-xs font-medium border border-zinc-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold shadow-mono-subtle transition-all active:scale-95"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

