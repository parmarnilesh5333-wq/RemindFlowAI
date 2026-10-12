/**
 * Date and timezone conversion utilities for RemindFlow AI.
 * Computes exact UTC ISO timestamps and wall-clock dates for any nominal wall-clock time
 * and timezone without relying on the host/cloud server's local OS timezone.
 */

export interface WallClockDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
}

const WEEKDAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Extracts the wall-clock calendar date and time in the specified IANA timeZone
 * (e.g. "Asia/Kolkata") regardless of whether the server OS runs in UTC or local time.
 */
export function getWallClockInTimezone(
  referenceDate: Date = new Date(),
  timeZone: string = "Asia/Kolkata"
): WallClockDateParts {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "long",
      hour12: false,
    });

    const parts = dtf.formatToParts(referenceDate);
    const p: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        p[part.type] = part.value;
      }
    }

    const rawHour = Number(p.hour);
    return {
      year: Number(p.year),
      month: Number(p.month),
      day: Number(p.day),
      hour: rawHour === 24 ? 0 : rawHour,
      minute: Number(p.minute),
      dayOfWeek: WEEKDAY_MAP[p.weekday] ?? referenceDate.getUTCDay(),
    };
  } catch {
    return {
      year: referenceDate.getFullYear(),
      month: referenceDate.getMonth() + 1,
      day: referenceDate.getDate(),
      hour: referenceDate.getHours(),
      minute: referenceDate.getMinutes(),
      dayOfWeek: referenceDate.getDay(),
    };
  }
}

/**
 * Adds a number of calendar days to a reference Date in the target IANA timeZone
 * and returns a YYYY-MM-DD string.
 */
export function addCalendarDaysInTimezone(
  referenceDate: Date,
  offsetDays: number,
  timeZone: string = "Asia/Kolkata"
): string {
  const wc = getWallClockInTimezone(referenceDate, timeZone);
  const shiftedUtc = new Date(Date.UTC(wc.year, wc.month - 1, wc.day + offsetDays, 12, 0, 0));
  const year = shiftedUtc.getUTCFullYear();
  const month = String(shiftedUtc.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shiftedUtc.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toTimezoneIso(dateStr: string, timeStr: string, timeZone: string = "Asia/Kolkata"): string {
  if (!dateStr || !timeStr) {
    return new Date().toISOString();
  }

  // Parse YYYY-MM-DD and HH:mm
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const [hourStr, minuteStr] = timeStr.split(":");

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return new Date().toISOString();
  }

  // Construct nominal UTC timestamp assuming 0 offset
  const nominalUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  try {
    // Formatter determines what nominalUtc displays as in the requested timeZone
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });

    const parts = dtf.formatToParts(new Date(nominalUtc));
    const p: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        p[part.type] = Number(part.value);
      }
    }

    const tzHour = p.hour === 24 ? 0 : p.hour;
    const tzTime = Date.UTC(p.year, p.month - 1, p.day, tzHour, p.minute, p.second || 0);

    // Offset in milliseconds between nominal local time and UTC
    const offsetMs = tzTime - nominalUtc;

    // Exact UTC timestamp corresponding to local wall-clock time
    const exactUtc = new Date(nominalUtc - offsetMs);
    return exactUtc.toISOString();
  } catch (err) {
    // Fallback if timezone string is unknown
    const fallbackUtc = new Date(nominalUtc);
    return fallbackUtc.toISOString();
  }
}
