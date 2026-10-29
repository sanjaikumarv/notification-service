"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      const saved = localStorage.getItem("ec_learnix_fcm_token");
      if (saved) setToken(saved);
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return null;
    try {
      return await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );
    } catch {
      return null;
    }
  }, []);

  const requestPermissionAndGetToken = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("Notifications are not supported by this browser.");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Notification permission was denied.");
        return null;
      }

      let generatedToken: string | null = null;

      if (!generatedToken) {
        const existing = localStorage.getItem("ec_learnix_fcm_token");
        generatedToken =
          existing ||
          `web-fcm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      localStorage.setItem("ec_learnix_fcm_token", generatedToken);
      setToken(generatedToken);

      await api
        .registerDevice({
          token: generatedToken,
          platform: "WEB",
          deviceName: navigator.userAgent.slice(0, 100),
        })
        .catch(() => {});

      return generatedToken;
    } catch (err: any) {
      setError(err?.message || "Failed to acquire notification token");
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
