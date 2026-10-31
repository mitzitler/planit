import { googleEvent, googleEventId, syncOps, syncedState } from './google-calendar';
import type { CalendarEntry } from './ics';

const TZ = 'America/New_York';
const party: CalendarEntry = { uid: 'abc-event@planitevents.space', title: "Sam's 30th", date: '2026-11-14' };
const toast: CalendarEntry = { uid: 'abc-1234-1@planitevents.space', title: 'Toast', date: '2026-11-14', time: '23:30' };

describe('googleEvent', () => {
  it('makes all-day and timed events, an hour long, crossing midnight', () => {
    expect(googleEvent(party, TZ)).toMatchObject({
      start: { date: '2026-11-14' },
      end: { date: '2026-11-15' },
      transparency: 'transparent',
    });
    expect(googleEvent(toast, TZ)).toMatchObject({
      start: { dateTime: '2026-11-14T23:30:00', timeZone: TZ },
      end: { dateTime: '2026-11-15T00:30:00', timeZone: TZ },
      transparency: 'opaque',
    });
  });

  it('gives a stable id Google accepts', () => {
    const id = googleEventId(party.uid);
    expect(id).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(googleEventId(party.uid)).toBe(id);
    expect(googleEventId(toast.uid)).not.toBe(id);
  });
});

describe('syncOps', () => {
  it('inserts everything on the first sync', () => {
    const ops = syncOps([party, toast], TZ, {});
    expect(ops.insert).toHaveLength(2);
    expect(ops.update).toEqual([]);
    expect(ops.delete).toEqual([]);
  });

  it('sends nothing when the plan is unchanged', () => {
    expect(syncOps([party, toast], TZ, syncedState([party, toast], TZ))).toEqual({ insert: [], update: [], delete: [] });
  });

  it('updates a renamed event and deletes a removed item', () => {
    const before = syncedState([party, toast], TZ);
    const ops = syncOps([{ ...party, title: "Sam's big 30th" }], TZ, before);
    expect(ops.insert).toEqual([]);
    expect(ops.update.map(e => e.summary)).toEqual(["Sam's big 30th"]);
    expect(ops.delete).toEqual([googleEventId(toast.uid)]);
  });
});
