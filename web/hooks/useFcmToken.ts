'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      const saved = localStorage.getItem('ec_learnix_fcm_token');
      if (saved) setToken(saved);
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    } catch {
      return null;
    }
  }, []);

  const requestPermissionAndGetToken = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setError('Notifications are not supported by this browser.');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const swReg = await registerServiceWorker();
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Notification permission was denied.');
        return null;
      }

      let generatedToken: string | null = null;
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (apiKey && projectId && swReg) {
        try {
          const { initializeApp, getApps, getApp } = await import('firebase/app');
          const { getMessaging, getToken } = await import('firebase/messaging');

          const app = getApps().length > 0 ? getApp() : initializeApp({
            apiKey,
            projectId,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          });

          generatedToken = await getToken(getMessaging(app), {
            serviceWorkerRegistration: swReg,
            vapidKey,
          });
        } catch {
          // Fall through to local fallback
        }
      }

      if (!generatedToken) {
        const existing = localStorage.getItem('ec_learnix_fcm_token');
        generatedToken = existing || `web-fcm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      localStorage.setItem('ec_learnix_fcm_token', generatedToken);
      setToken(generatedToken);

      await api.registerDevice({
        token: generatedToken,
        platform: 'WEB',
        deviceName: navigator.userAgent.slice(0, 100),
      }).catch(() => {});

      return generatedToken;
    } catch (err: any) {
      setError(err?.message || 'Failed to acquire notification token');
      return null;
    } finally {
      setLoading(false);
    }
  }, [registerServiceWorker]);

  return {
    token,
    permission,
    loading,
    error,
    requestPermissionAndGetToken,
  };
}
