/**
 * Phantom AI Real-Time Web Push & FMC Notification Engine
 * Provides native desktop/mobile push alerts, Web Audio chime synthesis,
 * and service worker synchronization.
 */

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
  playSound?: boolean;
}

// Web Audio synthesizer for crisp futuristic notification chimes
export function playNotificationChime(type: 'success' | 'alert' | 'schedule' = 'schedule') {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    if (type === 'schedule') {
      // Harmonic pleasant double chime (C5 -> E5 -> G5)
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5

      osc2.frequency.setValueAtTime(1046.5, now); // C6 subtle overtone
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.25);
    } else if (type === 'alert') {
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.2);
    } else {
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.2);
    }

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch (err) {
    console.debug('Audio chime synthesis note:', err);
  }
}

// Get current push notification permission status
export function getNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Request permission for Web Push Notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      registerServiceWorker();
      playNotificationChime('success');
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

// Register service worker if supported
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.debug('ServiceWorker registration note:', err);
    return null;
  }
}

// Dispatch live push notification (Desktop banner + audio chime)
export async function sendWebPushNotification(payload: PushNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { title, body, icon = '/favicon.ico', tag = 'phantom-alert', data = {}, playSound = true } = payload;

  if (playSound) {
    playNotificationChime('schedule');
  }

  // Also log / broadcast to backend endpoint
  try {
    fetch('/api/notifications/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, icon, tag, data }),
    }).catch(() => {});
  } catch {}

  // Check if browser supports Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, {
            body,
            icon,
            badge: icon,
            tag,
            data,
            silent: !playSound,
          });
          return true;
        }
      }

      // Fallback to standard window Notification constructor
      new Notification(title, {
        body,
        icon,
        tag,
        data,
        silent: !playSound,
      });
      return true;
    } catch (e) {
      console.warn('Native notification dispatch note:', e);
    }
  }

  return false;
}
