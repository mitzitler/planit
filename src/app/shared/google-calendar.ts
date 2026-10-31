// Live Google Calendar sync, the pure part (in progress: see docs/google-calendar-sync.md).
// Turns the plan's calendar entries (the same ones the .ics download and feed use) into Google
// Calendar event bodies, and works out what to insert, update and delete since the last sync.
// No network calls here: the future api/google-sync.ts sends the result with the host's token.
import { timedEnd, type CalendarEntry } from './ics';

// The fields Planit sets on a Google Calendar event (Events resource, Calendar API v3)
export interface GoogleEvent {
  id: string;
  summary: string;
  start: { date: string } | { dateTime: string; timeZone: string };
  end: { date: string } | { dateTime: string; timeZone: string };
  transparency: 'transparent' | 'opaque';
}

export interface SyncOps {
  insert: GoogleEvent[];
  update: GoogleEvent[];
  delete: string[]; // event ids
}

// What the last sync wrote: event id -> fingerprint of the body, saved after each successful sync
export type SyncedState = Record<string, string>;

export function googleEvent(entry: CalendarEntry, timeZone: string): GoogleEvent {
  const id = googleEventId(entry.uid);
  if (!entry.time) {
    // All-day: Google's end date is exclusive, like the .ics, and all-day entries don't block time
    const next = timedEnd(entry.date, '23:59').date;
    return { id, summary: entry.title, start: { date: entry.date }, end: { date: next }, transparency: 'transparent' };
  }
  const end = timedEnd(entry.date, entry.time);
  return {
    id,
    summary: entry.title,
    start: { dateTime: `${entry.date}T${entry.time}:00`, timeZone },
    end: { dateTime: `${end.date}T${end.time}:00`, timeZone },
    transparency: 'opaque',
  };
}

export function syncOps(entries: CalendarEntry[], timeZone: string, synced: SyncedState): SyncOps {
  const ops: SyncOps = { insert: [], update: [], delete: [] };
  const wanted = new Set<string>();
  for (const entry of entries) {
    const event = googleEvent(entry, timeZone);
    wanted.add(event.id);
    if (!(event.id in synced)) ops.insert.push(event);
    else if (synced[event.id] !== fingerprint(event)) ops.update.push(event);
  }
  ops.delete = Object.keys(synced).filter(id => !wanted.has(id));
  return ops;
}

// The state to save once the ops succeed
export function syncedState(entries: CalendarEntry[], timeZone: string): SyncedState {
  return Object.fromEntries(entries.map(entry => {
    const event = googleEvent(entry, timeZone);
    return [event.id, fingerprint(event)];
  }));
}

export function fingerprint(event: GoogleEvent): string {
  return JSON.stringify([event.summary, event.start, event.end, event.transparency]);
}

// Google event ids allow only base32hex characters (0-9, a-v), 5 to 1024 of them,
// so the entry's uid is encoded rather than used as is. The same uid always gives the same id.
export function googleEventId(uid: string): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuv';
  let id = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of new TextEncoder().encode(uid)) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      id += alphabet[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) id += alphabet[(buffer << (5 - bits)) & 31];
  return id.padEnd(5, '0');
}
