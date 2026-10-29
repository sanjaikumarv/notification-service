/**
 * Date formatting and timezone utility functions
 */

export function formatDateTime(isoString?: string | null): {
  formatted: string;
  isFuture: boolean;
} {
  if (!isoString) {
    return { formatted: "—", isFuture: false };
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return { formatted: isoString, isFuture: false };
    }

    const formatted = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return {
      formatted,
      isFuture: date.getTime() > Date.now(),
    };
  } catch {
    return { formatted: isoString, isFuture: false };
  }
}

export function formatDate(isoString?: string | null): string {
  return formatDateTime(isoString).formatted;
}

export function toLocalDatetimeString(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
