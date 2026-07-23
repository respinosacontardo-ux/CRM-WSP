/**
 * Minimal timezone helpers (no external dependency) built on the Intl API.
 * Enough to convert between a company-local wall-clock time and a UTC instant,
 * which is what the calendar and availability logic need.
 */

/** Offset in milliseconds between `timeZone` and UTC at the given instant. */
export function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  }
  // `map.hour` can be 24 at midnight in some environments; normalize.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asUtc - date.getTime();
}

/**
 * Converts a wall-clock time in `timeZone` (given as calendar fields) to the
 * corresponding UTC Date instant.
 */
export function zonedWallTimeToUtc(
  timeZone: string,
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getTimezoneOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

/** Day of week (0=Sun..6=Sat) for a calendar date "YYYY-MM-DD". */
export function weekdayOfDate(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Parses "HH:MM" into { hour, minute }. */
export function parseHhMm(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  return { hour: h, minute: m };
}

/** Formats a Date as a human-friendly local time string in a timezone. */
export function formatInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
}
