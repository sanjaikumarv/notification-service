"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { SchedulePicker } from "@/components/create/SchedulePicker";
import {
  ChannelSelector,
  ChannelsState,
} from "@/components/create/ChannelSelector";

export default function CreateNotificationPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5);
  const [channels, setChannels] = useState<ChannelsState>({
    EMAIL: { enabled: true, recipient: "interview.candidate@example.com" },
    PUSH: { enabled: true, recipient: "mock-device-token-poc-123" },
    TELEGRAM: { enabled: false, recipient: "" },
  });

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Default to 5 minutes in future upon client mount
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    setScheduledDate(local.toISOString().slice(0, 16));
    setSelectedPreset(5);

    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  const handlePresetOffsetMinutes = (minutes: number) => {
    setSelectedPreset(minutes);
    const target =
      minutes === 0 ? new Date() : new Date(Date.now() + minutes * 60 * 1000);
    const local = new Date(
      target.getTime() - target.getTimezoneOffset() * 60000,
    );
    setScheduledDate(local.toISOString().slice(0, 16));
  };

  const handleToggleChannel = (ch: "EMAIL" | "PUSH" | "TELEGRAM") => {
    setChannels((prev) => ({
      ...prev,
      [ch]: { ...prev[ch], enabled: !prev[ch].enabled },
    }));
  };

  const handleRecipientChange = (
    ch: "EMAIL" | "PUSH" | "TELEGRAM",
    val: string,
  ) => {
    setChannels((prev) => ({ ...prev, [ch]: { ...prev[ch], recipient: val } }));
  };

  const handleSubmit = async (e?: React.FormEvent, forceImmediate = false) => {
    if (e) e.preventDefault();
    setFormErrors([]);
    setSuccessMessage(null);

    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (!body.trim()) errors.push("Message body is required");
    if (!forceImmediate && !scheduledDate) errors.push("Scheduled date and time is required");
    if (!timezone.trim()) errors.push("Timezone is required");

    const selectedChannels: Array<{ channel: "EMAIL" | "PUSH" | "TELEGRAM"; recipient: string }> = [];

    if (channels.EMAIL.enabled) {
      if (!channels.EMAIL.recipient.trim()) errors.push("Email recipient is required when Email is enabled");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(channels.EMAIL.recipient)) errors.push("Email recipient has an invalid email format");
      else selectedChannels.push({ channel: "EMAIL", recipient: channels.EMAIL.recipient.trim() });
    }

    if (channels.PUSH.enabled) {
      if (!channels.PUSH.recipient.trim()) errors.push("Push device token is required when Push is enabled");
      else selectedChannels.push({ channel: "PUSH", recipient: channels.PUSH.recipient.trim() });
    }

    if (channels.TELEGRAM.enabled) {
      if (!channels.TELEGRAM.recipient.trim()) errors.push("Telegram Chat ID is required when Telegram is enabled");
      else selectedChannels.push({ channel: "TELEGRAM", recipient: channels.TELEGRAM.recipient.trim() });
    }

    if (selectedChannels.length === 0) errors.push("At least one notification delivery channel must be selected");

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const isImmediate = forceImmediate || selectedPreset === 0;
      const scheduledUtc = isImmediate ? new Date().toISOString() : new Date(scheduledDate).toISOString();
      const response = await api.createNotification({
        title: title.trim(),
        body: body.trim(),
        scheduled_at: scheduledUtc,
        timezone,
        channels: selectedChannels,
      });

      setSuccessMessage(
        isImmediate
          ? `Dispatched immediately! Notification ID: ${response.data.id}`
          : `Notification scheduled successfully! ID: ${response.data.id}`,
      );
      setTimeout(() => router.push(`/notifications/${response.data.id}`), 1200);
    } catch (err: any) {
      setFormErrors([err?.message || "Failed to schedule notification"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-3xl mx-auto space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <Link
            href='/'
            className='text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1 mb-2 dark:text-indigo-400'>
            ← Back to Dashboard
          </Link>
          <h1 className='text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-50'>
            Schedule a Notification
          </h1>
          <p className='text-sm text-slate-600 dark:text-zinc-400 mt-1'>
            Configure multi-channel dispatches with atomic scheduling, retries,
            and worker execution.
          </p>
        </div>
      </div>

      {formErrors.length > 0 && (
        <div className='p-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-sm'>
          <div className='font-semibold mb-1'>
            Please fix the following issues:
          </div>
          <ul className='list-disc list-inside space-y-1'>
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className='p-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm font-medium'>
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className='space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900'>
        <div>
          <label className='block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1'>
            Notification Title *
          </label>
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. System Maintenance Window Scheduled'
            maxLength={255}
            className='w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
          />
        </div>

        <div>
          <label className='block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1'>
            Message Body *
          </label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='e.g. The database migration will commence at 02:00 UTC. Expect 2 minutes of transient read-only mode.'
            className='w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
          />
        </div>

        <SchedulePicker
          scheduledDate={scheduledDate}
          onScheduledDateChange={(val) => {
            setScheduledDate(val);
            setSelectedPreset(null);
          }}
          timezone={timezone}
          onTimezoneChange={setTimezone}
          selectedPreset={selectedPreset}
          onPresetSelect={handlePresetOffsetMinutes}
        />

        <ChannelSelector
          channels={channels}
          onToggleChannel={handleToggleChannel}
          onRecipientChange={handleRecipientChange}
        />

        <div className='flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800'>
          <Link
            href='/'
            className='px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'>
            Cancel
          </Link>
          <button
            type='button'
            onClick={() => handleSubmit(undefined, true)}
            disabled={loading}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition'>
            ⚡ Send Immediately
          </button>
          <button
            type='submit'
            disabled={loading}
            className='inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition'>
            {loading
              ? "Processing..."
              : selectedPreset === 0
                ? "Send Now"
                : "Schedule Notification"}
          </button>
        </div>
      </form>
    </div>
  );
}
