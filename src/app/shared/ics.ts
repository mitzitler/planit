// A plan as an iCalendar (.ics) file: the event day, its schedule, and the to-dos leading up to it.
// Pure TypeScript with no Angular imports: the Calendar tab's download and the subscribed feed
// (api/calendar.ts) both use it, so the two always match.
import { addDays } from './dates';
import type { Plan } from './plan';

export interface CalendarEntry {
  uid: string; // stable across exports, so re-importing updates an entry instead of duplicating it
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM, 24-hour; none means all day
}

export interface IcsOptions {
  calendarName: string;
  timeZone?: string; // IANA zone for timed entries; without one they float in the viewer's zone
  now: Date; // DTSTAMP
  feed?: boolean; // a subscribed feed: hints how often to refresh (Apple honours it, Google doesn't)
}

const DOMAIN = 'planitevents.space';
const TIMED_MINUTES = 60; // schedule items have a start time only

// The event itself as an all-day entry, then every schedule item. Done to-dos stay, marked done.
export function calendarEntries(plan: Plan, eventId: string): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  if (plan.date) entries.push({ uid: `${eventId}-event@${DOMAIN}`, title: plan.name ?? 'Untitled event', date: plan.date });

  // Items have no ids, so the uid comes from their content; a counter separates exact repeats
  const seen = new Map<string, number>();
  for (const item of plan.schedule) {
    const key = `${item.date}|${item.time ?? ''}|${item.title}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    entries.push({
      uid: `${eventId}-${hash(key)}-${n}@${DOMAIN}`,
      title: item.done ? `Done: ${item.title}` : item.title,
      date: item.date,
      ...(item.time ? { time: item.time } : {}),
    });
  }
  return entries;
}

export function toIcs(entries: CalendarEntry[], options: IcsOptions): string {
  const { calendarName, timeZone, now, feed } = options;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planit//Planit Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calendarName)}`,
    ...(timeZone ? [`X-WR-TIMEZONE:${timeZone}`] : []),
    ...(feed ? ['REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'] : []),
  ];

  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  for (const entry of entries) {
    lines.push('BEGIN:VEVENT', `UID:${entry.uid}`, `DTSTAMP:${stamp}`);
    if (entry.time) {
      const zone = timeZone ? `;TZID=${timeZone}` : '';
      const [hours, minutes] = entry.time.split(':').map(Number);
      const end = hours * 60 + minutes + TIMED_MINUTES; // may run past midnight
      const endDate = addDays(entry.date, Math.floor(end / 1440));
      const endTime = `${pad(Math.floor((end % 1440) / 60))}:${pad(end % 60)}`;
      lines.push(`DTSTART${zone}:${dateTime(entry.date, entry.time)}`, `DTEND${zone}:${dateTime(endDate, endTime)}`);
    } else {
      // All-day entries don't mark the host as busy
      lines.push(`DTSTART;VALUE=DATE:${compact(entry.date)}`, `DTEND;VALUE=DATE:${compact(addDays(entry.date, 1))}`, 'TRANSP:TRANSPARENT');
    }
    lines.push(`SUMMARY:${escape(entry.title)}`, 'END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// A zone name Intl knows, or undefined (the feed's tz comes from the link, so it's untrusted)
export function validTimeZone(timeZone: unknown): string | undefined {
  if (typeof timeZone !== 'string' || !timeZone) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
}

// "Sam's 30th!" -> "sams-30th.ics"
export function icsFileName(name: string | null): string {
  const slug = (name ?? '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'event'}.ics`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const compact = (date: string) => date.replaceAll('-', '');
const dateTime = (date: string, time: string) => `${compact(date)}T${time.replace(':', '')}00`;

// RFC 5545 text: backslash, semicolon, comma and newlines are escaped
function escape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 bytes continue on the next line after a space, never splitting a character
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length ? 74 : 75; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

// FNV-1a, 32-bit, as hex: short and stable
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
