"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { SchedulePicker } from "@/components/create/SchedulePicker";
import { ChannelSelector, ChannelsState } from "@/components/create/ChannelSelector";

export default function CreateNotificationPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5);
  const [channels, setChannels] = useState<ChannelsState>({
    EMAIL: { enabled: true, recipient: "interview.candidate@example.com" },
    PUSH: { enabled: false, recipient: "" },
  });

  const [submittingMode, setSubmittingMode] = useState<"immediate" | "schedule" | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    setScheduledDate(local.toISOString().slice(0, 16));
    setSelectedPreset(5);
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  const handleResetForm = () => {
    setTitle("");
    setBody("");
    setFormErrors([]);
    setSuccessMessage(null);
    setSubmittingMode(null);
    setSelectedPreset(5);
    const d = new Date(Date.now() + 5 * 60 * 1000);
    setScheduledDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  };

  const handlePresetOffsetMinutes = (minutes: number) => {
    setSelectedPreset(minutes);
    const target = minutes === 0 ? new Date() : new Date(Date.now() + minutes * 60 * 1000);
    const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
    setScheduledDate(local.toISOString().slice(0, 16));
  };

  const handleToggleChannel = (ch: "EMAIL" | "PUSH") => {
    setChannels((prev) => ({ ...prev, [ch]: { ...prev[ch], enabled: !prev[ch].enabled } }));
  };

  const handleRecipientChange = (ch: "EMAIL" | "PUSH", val: string) => {
    setChannels((prev) => ({ ...prev, [ch]: { ...prev[ch], recipient: val } }));
  };

  const handleSubmit = async (e?: React.FormEvent, forceImmediate = false) => {
    if (e) e.preventDefault();
    if (submittingMode !== null) return;
    setFormErrors([]);
    setSuccessMessage(null);

    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (!body.trim()) errors.push("Message body is required");
    if (!timezone.trim()) errors.push("Timezone is required");

    let scheduledUtc = new Date().toISOString();
    const isImmediate = forceImmediate || selectedPreset === 0;

    if (!isImmediate) {
      if (!scheduledDate) { setFormErrors(["Scheduled date and time is required"]); return; }
      const parsedDate = new Date(scheduledDate);
      if (isNaN(parsedDate.getTime())) { setFormErrors(["Invalid scheduled date and time format"]); return; }
      scheduledUtc = parsedDate.toISOString();
    }

    const selectedChannels: Array<{ channel: "EMAIL" | "PUSH"; recipient: string }> = [];
    if (channels.EMAIL.enabled) {
      const email = channels.EMAIL.recipient.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid email address is required");
      else selectedChannels.push({ channel: "EMAIL", recipient: email });
    }
    if (channels.PUSH.enabled) {
      const token = channels.PUSH.recipient.trim();
      if (!token) errors.push("Push device token is required");
      else selectedChannels.push({ channel: "PUSH", recipient: token });
    }
    if (selectedChannels.length === 0) errors.push("Select at least one delivery channel (Email or Push)");
    if (errors.length > 0) { setFormErrors(errors); return; }

    setSubmittingMode(isImmediate ? "immediate" : "schedule");
    try {
      const response = await api.createNotification({
        title: title.trim(),
        body: body.trim(),
        scheduled_at: scheduledUtc,
        timezone,
        channels: selectedChannels,
      });

      const notifId = response?.data?.id;
      setSuccessMessage(isImmediate ? "Dispatched immediately! Redirecting..." : "Notification scheduled successfully! Redirecting...");
      setTitle("");
      setBody("");
      setFormErrors([]);
      setSubmittingMode(null);

      if (notifId) {
        router.push(`/notifications/${notifId}`);
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setFormErrors([err?.message || "Failed to schedule notification"]);
      setSubmittingMode(null);
    }
  };

  const isLoading = submittingMode !== null;

  return (
    <div className='max-w-3xl mx-auto space-y-6'>
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
          Configure multi-channel dispatches with atomic scheduling, immediate execution, and retries.
        </p>
      </div>

      {formErrors.length > 0 && (
        <div className='p-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-sm'>
          <div className='font-semibold mb-1'>Please correct the following:</div>
          <ul className='list-disc list-inside space-y-0.5 text-xs'>
            {formErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {successMessage && (
        <div className='p-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center gap-2'>
          <div className='w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin' />
          <span>{successMessage}</span>
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
            placeholder='e.g. Maintenance starts at 02:00 UTC. Expect 2 minutes of transient read-only mode.'
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
          <button
            type='button'
            onClick={handleResetForm}
            disabled={isLoading}
            className='px-3 py-2 text-sm font-medium rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50'>
            Reset
          </button>
          <Link
            href='/'
            className='px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'>
            Cancel
          </Link>
          <button
            type='button'
            onClick={() => handleSubmit(undefined, true)}
            disabled={isLoading}
            className='inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 disabled:opacity-50 transition cursor-pointer'
          >
            {submittingMode === "immediate" && (
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin dark:border-indigo-400" />
            )}
            <span>{submittingMode === "immediate" ? "Dispatching..." : "⚡ Send Immediately"}</span>
          </button>
          <button
            type='submit'
            disabled={isLoading}
            className='inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition cursor-pointer'
          >
            {submittingMode === "schedule" && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{submittingMode === "schedule" ? "Scheduling..." : selectedPreset === 0 ? "Send Now" : "Schedule Notification"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
