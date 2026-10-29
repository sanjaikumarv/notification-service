import React from 'react';
import { ChannelIcon } from '@/components/ChannelIcon';
import { useFcmToken } from '@/hooks/useFcmToken';

export interface ChannelConfig {
  enabled: boolean;
  recipient: string;
}

export interface ChannelsState {
  EMAIL: ChannelConfig;
  PUSH: ChannelConfig;
}

interface ChannelSelectorProps {
  channels: ChannelsState;
  onToggleChannel: (ch: 'EMAIL' | 'PUSH') => void;
  onRecipientChange: (ch: 'EMAIL' | 'PUSH', recipient: string) => void;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  channels,
  onToggleChannel,
  onRecipientChange,
}) => {
  const { requestPermissionAndGetToken, loading: fcmLoading } = useFcmToken();

  const handleTestDesktopPopup = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification('EC Learnix Desktop Test', {
          body: 'Browser desktop notifications are working properly!',
          icon: '/favicon.ico',
        });
      } else {
        alert(`Browser notification permission is: ${perm}. Click the site settings icon to allow.`);
      }
    });
  };

  const handleUseBrowserToken = async () => {
    const token = await requestPermissionAndGetToken();
    if (token) onRecipientChange('PUSH', token);
  };

  return (
    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          Notification Channels & Recipients *
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Select Email, Push, or both. Each channel is processed independently with isolated retry limits.
        </p>
      </div>

      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-900 dark:text-zinc-100">
          <input
            type="checkbox"
            checked={channels.EMAIL.enabled}
            onChange={() => onToggleChannel('EMAIL')}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <ChannelIcon channel="EMAIL" className="w-4 h-4 text-emerald-600" />
          <span>Email (SMTP / Nodemailer)</span>
        </label>
        {channels.EMAIL.enabled && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Recipient Email Address
            </label>
            <input
              type="email"
              value={channels.EMAIL.recipient}
              onChange={(e) => onRecipientChange('EMAIL', e.target.value)}
              placeholder="e.g. devops@company.com"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-900 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={channels.PUSH.enabled}
              onChange={() => onToggleChannel('PUSH')}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <ChannelIcon channel="PUSH" className="w-4 h-4 text-amber-600" />
            <span>Push Notifications (Firebase FCM)</span>
          </label>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            FCM v1 / MOCK
          </span>
        </div>
        {channels.PUSH.enabled && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400">
                FCM Device Registration Token *
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestDesktopPopup}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 dark:text-zinc-400 dark:hover:text-zinc-200 hover:underline cursor-pointer"
                >
                  🔔 Test Desktop Popup
                </button>
                <button
                  type="button"
                  onClick={handleUseBrowserToken}
                  disabled={fcmLoading}
                  className="text-xs text-indigo-600 hover:text-indigo-500 font-medium inline-flex items-center gap-1 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {fcmLoading ? 'Registering...' : '⚡ Use My Browser Token'}
                </button>
              </div>
            </div>
            <input
              type="text"
              value={channels.PUSH.recipient}
              onChange={(e) => onRecipientChange('PUSH', e.target.value)}
              placeholder="e.g. fcm-device-registration-token..."
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Supports FCM Web tokens, Android registration tokens, and iOS APNs tokens via Firebase Cloud Messaging.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
