'use strict';
import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Shield,
  LogOut,
  Save,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import { UserProfile } from '@/types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onProfileUpdated: (profile: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(profile?.user.displayName || '');
  const [email, setEmail] = useState(profile?.user.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-white" />
            <h3 className="text-lg font-bold text-white">User Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          {profile.user.pictureUrl ? (
            <img
              src={profile.user.pictureUrl}
              alt="Avatar"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-zinc-600"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white font-bold text-black text-xl flex items-center justify-center shadow-mono-glow">
              {(profile.user.displayName || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="font-bold text-white text-base">
              {profile.user.displayName || 'Guest User'}
            </h4>
            <p className="text-xs text-zinc-400">{profile.user.email || 'No email linked'}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white mt-1">
              <Shield className="w-3 h-3 text-white" />
              <span>Verified Session</span>
            </span>
          </div>
        </div>

        {/* Form to update display info */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-mono-glow transition-all active:scale-95"
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

