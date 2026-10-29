import React from 'react';
import { ChannelIcon } from '@/components/ChannelIcon';

export interface ChannelConfig {
  enabled: boolean;
  recipient: string;
}

export interface ChannelsState {
  EMAIL: ChannelConfig;
  PUSH: ChannelConfig;
  TELEGRAM: ChannelConfig;
}

interface ChannelSelectorProps {
  channels: ChannelsState;
  onToggleChannel: (ch: 'EMAIL' | 'PUSH' | 'TELEGRAM') => void;
  onRecipientChange: (ch: 'EMAIL' | 'PUSH' | 'TELEGRAM', recipient: string) => void;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  channels,
  onToggleChannel,
  onRecipientChange,
}) => {
  return (
    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          Notification Channels & Recipients *
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Each channel is processed independently with isolated retry limits.
        </p>
      </div>

      {/* Email Channel */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
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
        </div>
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

      {/* Push Channel */}
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
            <span>Push Notifications</span>
          </label>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            MOCK PROVIDER
          </span>
        </div>
        {channels.PUSH.enabled && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Device Token / Client ID
            </label>
            <input
              type="text"
              value={channels.PUSH.recipient}
              onChange={(e) => onRecipientChange('PUSH', e.target.value)}
              placeholder="e.g. fcm-client-mock-token-xyz"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              Mock provider generates simulated receipts without requiring real FCM credentials.
            </p>
          </div>
        )}
      </div>

      {/* Telegram Channel */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-sm text-slate-900 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={channels.TELEGRAM.enabled}
              onChange={() => onToggleChannel('TELEGRAM')}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <ChannelIcon channel="TELEGRAM" className="w-4 h-4 text-blue-600" />
            <span>Telegram Bot API</span>
          </label>
        </div>
        {channels.TELEGRAM.enabled && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1">
              Telegram Chat ID
            </label>
            <input
              type="text"
              value={channels.TELEGRAM.recipient}
              onChange={(e) => onRecipientChange('TELEGRAM', e.target.value)}
              placeholder="e.g. 123456789 or @channel_username"
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              Requires <code>TELEGRAM_BOT_TOKEN</code> configured on the NestJS backend.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

