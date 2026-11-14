const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function normalizeTimeZone(timeZone?: string | null): string {
  const candidate = timeZone?.trim() || DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function getDateTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function getTimeZoneDateString(
  date: Date = new Date(),
  timeZone?: string | null
): string {
  const tz = normalizeTimeZone(timeZone);
  const p = getDateTimeParts(date, tz);
  const yyyy = String(p.year).padStart(4, "0");
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTimeZoneHour(
  date: Date,
  timeZone?: string | null
): number {
  const tz = normalizeTimeZone(timeZone);
  return getDateTimeParts(date, tz).hour;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getDateTimeParts(date, timeZone);
  const wallUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncatedEpochMs = Math.floor(date.getTime() / 1000) * 1000;
  return wallUtcMs - truncatedEpochMs;
}

function resolveLocalMidnightUtcMs(year: number, month: number, day: number, timeZone: string): number {
  const approxUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const offset1 = getTimeZoneOffsetMs(new Date(approxUtcMs), timeZone);
  let midnightMs = approxUtcMs - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(midnightMs), timeZone);
  if (offset2 !== offset1) {
    midnightMs = approxUtcMs - offset2;
  }
  return midnightMs;
}

export function getTimeZoneDayBoundsUtc(
  dateStr?: string | null,
  timeZone?: string | null,
  now: Date = new Date()
): { date: string; timeZone: string; startOfDay: Date; endOfDay: Date } {
  const tz = normalizeTimeZone(timeZone);
  const validDateStr =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())
      ? dateStr.trim()
      : getTimeZoneDateString(now, tz);

  const [y, m, d] = validDateStr.split("-").map(Number);
  const startMs = resolveLocalMidnightUtcMs(y, m, d, tz);
  const nextMidnightUtc = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
  const nextStartMs = resolveLocalMidnightUtcMs(
    nextMidnightUtc.getUTCFullYear(),
    nextMidnightUtc.getUTCMonth() + 1,
    nextMidnightUtc.getUTCDate(),
    tz
  );

  return {
    date: validDateStr,
    timeZone: tz,
    startOfDay: new Date(startMs),
    endOfDay: new Date(nextStartMs - 1),
  };
}

export function getTimeZoneRangeBoundsUtc(
  days: number,
  timeZone?: string | null,
  now: Date = new Date()
): {
  timeZone: string;
  todayStr: string;
  startDate: Date;
  endDate: Date;
  dayKeys: string[];
} {
  const tz = normalizeTimeZone(timeZone);
  const safeDays = Math.max(1, Math.min(365, Math.floor(days || 30)));
  const todayStr = getTimeZoneDateString(now, tz);
  const [y, m, d] = todayStr.split("-").map(Number);

  const dayKeys: string[] = [];
  for (let i = safeDays - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i, 0, 0, 0, 0));
    const key = [
      String(dt.getUTCFullYear()).padStart(4, "0"),
      String(dt.getUTCMonth() + 1).padStart(2, "0"),
      String(dt.getUTCDate()).padStart(2, "0"),
    ].join("-");
    dayKeys.push(key);
  }

  const firstBounds = getTimeZoneDayBoundsUtc(dayKeys[0], tz, now);
  const lastBounds = getTimeZoneDayBoundsUtc(todayStr, tz, now);

  return {
    timeZone: tz,
    todayStr,
    startDate: firstBounds.startOfDay,
    endDate: lastBounds.endOfDay,
    dayKeys,
  };
}
