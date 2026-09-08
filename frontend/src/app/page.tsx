'use client';

import React, { useState, useEffect } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
import { WorkspaceApp } from '@/components/workspace/WorkspaceApp';
import { AuthModal } from '@/components/modals/AuthModal';
import { UserProfile } from '@/types';
import { api } from '@/lib/api';

export default function Home() {
  const [view, setView] = useState<'landing' | 'app'>('landing');
  const [theme, setTheme] = useState('theme-dark');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    // 1. Check saved theme
    const savedTheme = localStorage.getItem('phantom-theme') || 'theme-dark';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(savedTheme);
    setTheme(savedTheme);

    // 2. Check if URL specifies view=app or if active session exists
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'app') {
        setView('app');
      }
    }

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

    // 4. Load Current User Profile
    const loadProfile = async () => {
      try {
        const prof = await api.getUserProfile();
        if (prof) setUserProfile(prof);
      } catch {}
    };
    loadProfile();
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'theme-light' ? 'theme-dark' : 'theme-light';
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(nextTheme);
    localStorage.setItem('phantom-theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleLaunchApp = () => {
    setView('app');
    window.history.pushState(null, '', '?view=app');
  };

  const handleNavigateHome = () => {
    setView('landing');
    window.history.pushState(null, '', '/');
  };

  if (view === 'app') {
    return <WorkspaceApp onNavigateHome={handleNavigateHome} />;
  }

  return (
    <>
      <LandingPage
        onLaunchApp={handleLaunchApp}
        onOpenAuth={() => setAuthModalOpen(true)}
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
        backendOnline={backendOnline}
        userProfile={userProfile}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(prof) => {
          setUserProfile(prof);
          setAuthModalOpen(false);
          handleLaunchApp();
        }}
      />
    </>
  );
}
