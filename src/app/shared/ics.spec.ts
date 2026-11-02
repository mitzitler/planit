import { calendarEntries, icsFileName, toIcs, validTimeZone } from './ics';
import { emptyPlan, type Plan } from './plan';

const NOW = new Date('2026-10-31T12:00:00Z');

function plan(overrides: Partial<Plan>): Plan {
  return { ...emptyPlan(), name: "Sam's 30th", ...overrides };
}

describe('calendarEntries', () => {
  it('lists the event day, then each schedule item, with stable uids', () => {
    const p = plan({
      date: '2026-11-14',
      schedule: [
        { date: '2026-11-07', title: 'Order the cake', done: true },
        { date: '2026-11-14', time: '19:00', title: 'Guests arrive' },
        { date: '2026-11-14', time: '19:00', title: 'Guests arrive' },
      ],
    });
    const entries = calendarEntries(p, 'abc');
    expect(entries.map(e => [e.title, e.date, e.time])).toEqual([
      ["Sam's 30th", '2026-11-14', undefined],
      ['Done: Order the cake', '2026-11-07', undefined],
      ['Guests arrive', '2026-11-14', '19:00'],
      ['Guests arrive', '2026-11-14', '19:00'],
    ]);
    expect(new Set(entries.map(e => e.uid)).size).toBe(4);
    expect(calendarEntries(p, 'abc').map(e => e.uid)).toEqual(entries.map(e => e.uid));
  });

  it('has no event entry without a date', () => {
    expect(calendarEntries(plan({ schedule: [{ date: '2026-11-07', title: 'Buy plates' }] }), 'abc')).toHaveLength(1);
  });
});

describe('toIcs', () => {
  it('writes all-day and timed entries, an hour long, crossing midnight', () => {
    const ics = toIcs(
      [
        { uid: 'a@x', title: 'Party', date: '2026-11-14' },
        { uid: 'b@x', title: 'Late toast', date: '2026-11-14', time: '23:30' },
      ],
      { calendarName: 'Planit: Party', timeZone: 'America/New_York', now: NOW },
    );
    const lines = ics.split('\r\n');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261114');
    expect(lines).toContain('DTEND;VALUE=DATE:20261115');
    expect(lines).toContain('DTSTART;TZID=America/New_York:20261114T233000');
    expect(lines).toContain('DTEND;TZID=America/New_York:20261115T003000');
    expect(lines).toContain('DTSTAMP:20261031T120000Z');
    expect(lines).toContain('X-WR-TIMEZONE:America/New_York');
    expect(lines).toContain('NAME:Planit: Party');
    expect(lines).toContain('X-WR-CALNAME:Planit: Party');
    expect(lines).not.toContain('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('floats timed entries without a zone, and hints a refresh for feeds', () => {
    const ics = toIcs([{ uid: 'a@x', title: 'Dinner', date: '2026-11-14', time: '19:00' }], {
      calendarName: 'x',
      now: NOW,
      feed: true,
    });
    expect(ics).toContain('\r\nDTSTART:20261114T190000\r\n');
    expect(ics).toContain('\r\nREFRESH-INTERVAL;VALUE=DURATION:PT1H\r\n');
  });

  it('escapes text and folds long lines without splitting characters', () => {
    const title = 'Pizza, wings; and \\ more\n' + 'é'.repeat(60);
    const ics = toIcs([{ uid: 'a@x', title, date: '2026-11-14' }], { calendarName: 'x', now: NOW });
    const summary = ics.slice(ics.indexOf('SUMMARY:'), ics.indexOf('\r\nEND:VEVENT'));
    for (const line of summary.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(summary.replace(/\r\n /g, '')).toBe('SUMMARY:Pizza\\, wings\\; and \\\\ more\\n' + 'é'.repeat(60));
  });
});

describe('helpers', () => {
  it('accepts only zones Intl knows', () => {
    expect(validTimeZone('Asia/Tokyo')).toBe('Asia/Tokyo');
    expect(validTimeZone('Not/AZone')).toBeUndefined();
    expect(validTimeZone(42)).toBeUndefined();
  });

  it('names the file after the event', () => {
    expect(icsFileName("Sam's 30th!")).toBe('sams-30th.ics');
    expect(icsFileName(null)).toBe('event.ics');
  });
});
