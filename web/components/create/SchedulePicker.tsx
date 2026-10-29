import React from 'react';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const PRESET_OPTIONS = [
  { label: '⚡ Immediate', minutes: 0 },
  { label: '+1 min', minutes: 1 },
  { label: '+5 min', minutes: 5 },
  { label: '+1 hour', minutes: 60 },
  { label: '+1 day', minutes: 1440 },
];

interface SchedulePickerProps {
  scheduledDate: string;
  onScheduledDateChange: (date: string) => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  selectedPreset?: number | null;
  onPresetSelect: (minutes: number) => void;
}

export const SchedulePicker: React.FC<SchedulePickerProps> = ({
  scheduledDate,
  onScheduledDateChange,
  timezone,
  onTimezoneChange,
  selectedPreset,
  onPresetSelect,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
      <div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1">
          Date & Time *
        </label>
        <input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => onScheduledDateChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {/* Quick Offset Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 self-center">
            Presets:
          </span>
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = selectedPreset === opt.minutes;
            return (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => onPresetSelect(opt.minutes)}
                className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs ring-2 ring-indigo-500/20 dark:bg-indigo-600 dark:border-indigo-500'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1">
          Timezone (IANA) *
        </label>
        <input
          type="text"
          list="timezones-list"
          value={timezone}
          onChange={(e) => onTimezoneChange(e.target.value)}
          placeholder="e.g. America/New_York or UTC"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <datalist id="timezones-list">
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
          Time is interpreted in this timezone and converted to UTC for BullMQ worker scheduling.
        </p>
      </div>
    </div>
  );
};
