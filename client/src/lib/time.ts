/**
 * Time utilities for PocketSets. All set times are stored as ISO strings
 * with a Pacific Time offset; this module converts them to "festival-local"
 * display strings regardless of the viewer's device timezone.
 */

export const FESTIVAL_TZ = "America/Los_Angeles";

/** Parse an ISO string and return its epoch ms. */
export function toMs(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * Given an ISO string, return { hour, minute, dayOfMonth, timestampMs } as
 * observed in Pacific Time.
 */
export function partsInPT(iso: string): {
  hour: number;
  minute: number;
  date: number;
  timestampMs: number;
} {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: FESTIVAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  // "24" can occur in some locales — normalize to 0
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return {
    hour,
    minute: get("minute"),
    date: get("day"),
    timestampMs: d.getTime(),
  };
}

/** Format an ISO timestamp as e.g. "10:30 PM" in PT. Returns "TBD" if null. */
export function formatTimePT(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: FESTIVAL_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

/** Format an ISO timestamp as "Fri 10:30 PM" in PT. Returns "TBD" if null. */
export function formatDayTimePT(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: FESTIVAL_TZ,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function durationMinutes(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0;
  return Math.round((toMs(end) - toMs(start)) / 60000);
}

/** Humanize a duration like 90 -> "1h 30m". */
export function humanMinutes(total: number): string {
  const sign = total < 0 ? "-" : "";
  const m = Math.abs(total);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${sign}${mm}m`;
  if (mm === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${mm}m`;
}

/** Return a human countdown like "Starting in 23m", "Live now", "Ended 2h ago", or "TBD". */
export function relativeLabel(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  nowMs: number,
): { phase: "upcoming" | "live" | "past" | "tbd"; label: string; minutesDelta: number } {
  if (!startIso || !endIso) {
    return { phase: "tbd", label: "Time TBD", minutesDelta: 0 };
  }
  const start = toMs(startIso);
  const end = toMs(endIso);
  if (nowMs < start) {
    const mins = Math.ceil((start - nowMs) / 60000);
    return { phase: "upcoming", label: `Starting in ${humanMinutes(mins)}`, minutesDelta: mins };
  }
  if (nowMs < end) {
    const mins = Math.ceil((end - nowMs) / 60000);
    return { phase: "live", label: `Live now · ${humanMinutes(mins)} left`, minutesDelta: mins };
  }
  const mins = Math.floor((nowMs - end) / 60000);
  return { phase: "past", label: `Ended ${humanMinutes(mins)} ago`, minutesDelta: mins };
}

/**
 * Festival day definition — a set at 2am Saturday belongs to Friday's day.
 * Returns "fri" | "sat" | "sun" | "pre" | "post".
 */
export function festivalDay(iso: string, festivalStart: string): "fri" | "sat" | "sun" | "pre" | "post" {
  const { date, hour } = partsInPT(iso);
  const start = partsInPT(festivalStart).date; // should be 15
  // Shift: if hour < 6 AM PT, it belongs to the previous calendar day
  const effective = hour < 6 ? date - 1 : date;
  const diff = effective - start;
  if (diff < 0) return "pre";
  if (diff === 0) return "fri";
  if (diff === 1) return "sat";
  if (diff === 2) return "sun";
  return "post";
}

/** Days until a given ISO (0 = today, 1 = tomorrow, ...). Operates in PT. */
export function daysUntilPT(iso: string, nowMs: number): number {
  const a = partsInPT(iso).date;
  const b = partsInPT(new Date(nowMs).toISOString()).date;
  return a - b;
}
