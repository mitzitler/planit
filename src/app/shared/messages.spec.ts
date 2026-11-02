import { emptyPlan, type Plan } from './plan';
import { askMessage, inviteApps, reminderMessage, startTime } from './messages';

const party: Plan = {
  ...emptyPlan(),
  name: "Sam's 30th",
  date: '2026-11-14',
  schedule: [
    { date: '2026-11-13', title: 'Buy ice' },
    { date: '2026-11-14', time: '19:00', title: 'Guests arrive' },
    { date: '2026-11-14', time: '18:30', title: 'Abby arrives' },
  ],
};

describe('messages', () => {
  it('starts when guests arrive, not at earlier setup items', () => {
    expect(startTime(party)).toBe('19:00');
    const noGuests = { ...party, schedule: party.schedule.filter(item => !item.title.includes('Guests')) };
    expect(startTime(noGuests)).toBe('18:30');
    expect(startTime({ ...party, schedule: [] })).toBeNull();
  });

  it('writes a short reminder with the day and start time', () => {
    expect(reminderMessage(party)).toBe("Hi! A reminder: Sam's 30th is Saturday, November 14 at 7pm. See you there!");
    expect(reminderMessage({ ...party, date: null })).toBe("Hi! A reminder about Sam's 30th. See you there!");
  });

  it('writes an ask, with the day only when it is not the event day', () => {
    expect(askMessage(party, { who: 'Abby', what: 'help set up', time: '18:30' })).toBe(
      "Hi Abby! Could you help set up at 6:30pm for Sam's 30th? Thank you!",
    );
    expect(askMessage(party, { who: 'Jordan', what: 'lend us your car', date: '2026-11-13' })).toBe(
      "Hi Jordan! Could you lend us your car on Friday, November 13 for Sam's 30th? Thank you!",
    );
  });

  it('orders invite apps by formality and size, keeping all six', () => {
    expect(inviteApps(party)[0].name).toBe('Partiful');
    expect(inviteApps({ ...party, formality: { level: 'formal', confirmed: true } })[0].name).toBe('Paperless Post');
    const big = inviteApps({ ...party, size: 'massive' });
    expect(big[0].name).toBe('Luma');
    expect(big).toHaveLength(6);
  });
});
