import React, { useState } from 'react';

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
  { label: '+5 min', minutes: 5 },
  { label: '+15 min', minutes: 15 },
  { label: '+1 hour', minutes: 60 },
  { label: '+1 day', minutes: 1440 },
  { label: '+1 week', minutes: 10080 },
  { label: '+1 month', minutes: 43200 },
];

const UNIT_MULTIPLIERS = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
  months: 43200,
} as const;

type DelayUnit = keyof typeof UNIT_MULTIPLIERS;

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
  const [customValue, setCustomValue] = useState('2');
  const [customUnit, setCustomUnit] = useState<DelayUnit>('days');

  const handleApplyCustomOffset = () => {
    const val = parseFloat(customValue);
    if (isNaN(val) || val < 0) return;
    const multiplier = UNIT_MULTIPLIERS[customUnit] || 1;
    onPresetSelect(Math.round(val * multiplier));
  };

  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
          Delivery Schedule & Delay
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Select an immediate dispatch, quick preset, custom delay offset, or exact calendar date and time.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
          Quick Delay Presets:
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_OPTIONS.map((opt) => {
            const isSelected = selectedPreset === opt.minutes;
            return (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => onPresetSelect(opt.minutes)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
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

      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 dark:border-zinc-800 dark:bg-zinc-800/40">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
          Custom Delay Offset:
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-zinc-400">Delay by:</span>
          <input
            type="number"
            min="1"
            max="365"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="w-20 rounded-md border border-slate-300 px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value as DelayUnit)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months (30d)</option>
          </select>
          <button
            type="button"
            onClick={handleApplyCustomOffset}
            className="px-3 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-500 shadow-xs cursor-pointer transition"
          >
            Apply Delay
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-900 dark:text-zinc-100 mb-1">
            Specific Date & Time *
          </label>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => onScheduledDateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
            Adjust directly to pick an exact future moment.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-900 dark:text-zinc-100 mb-1">
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
            Converted to UTC for worker scheduling.
          </p>
        </div>
      </div>
    </div>
  );
};
