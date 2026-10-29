import {
  NAME_NOT_ALLOWED,
  PLAN_TOOLS,
  SELECTABLE_ACTIVITY_IDS,
  SELECTABLE_PLACE_IDS,
  applyTool,
  emptyPlan,
  guestConflict,
  isValidDate,
  isValidTime,
  normalizePlan,
  type Plan,
} from './plan';

function expectOk(result: ReturnType<typeof applyTool>): Plan {
  if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
  return result.plan;
}

function expectError(result: ReturnType<typeof applyTool>): string {
  if (result.ok) throw new Error('expected an error, got ok');
  return result.error;
}

describe('selectable ids', () => {
  it('include sub-options and nested options but not top-level categories', () => {
    expect(SELECTABLE_PLACE_IDS).toContain('home-my');
    expect(SELECTABLE_PLACE_IDS).toContain('park');
    expect(SELECTABLE_PLACE_IDS).toContain('park-city');
    expect(SELECTABLE_PLACE_IDS).not.toContain('home');
    expect(SELECTABLE_PLACE_IDS).not.toContain('public-space');

    expect(SELECTABLE_ACTIVITY_IDS).toContain('playing-board-games');
    expect(SELECTABLE_ACTIVITY_IDS).not.toContain('playing');
  });

  it('match the enums in the tool schemas', () => {
    const places = PLAN_TOOLS.find(t => t.name === 'choose_places')!;
    expect(places.input_schema.properties.ids.items.enum).toEqual(SELECTABLE_PLACE_IDS);
  });
});

describe('set_basics', () => {
  it('maps the planning count to the right size bucket', () => {
    const cases: [number, string][] = [
      [1, 'intimate'],
      [8, 'intimate'],
      [9, 'cozy'],
      [12, 'cozy'],
      [21, 'mixer'],
      [50, 'rager'],
      [91, 'massive'],
    ];
    for (const [count, size] of cases) {
      const plan = expectOk(applyTool(emptyPlan(), 'set_basics', { guests: { exact: count } }));
      expect(plan.guestCount).toBe(count);
      expect(plan.size).toBe(size);
    }
  });

  it('only changes the fields it is given', () => {
    const named = expectOk(applyTool(emptyPlan(), 'set_basics', { name: 'Game night', date: '2026-11-14' }));
    const plan = expectOk(applyTool(named, 'set_basics', { budgetTotal: 300 }));
    expect(plan).toMatchObject({ name: 'Game night', date: '2026-11-14', budgetTotal: 300, guestCount: null });
  });

  it('rejects bad values', () => {
    expectError(applyTool(emptyPlan(), 'set_basics', {}));
    expectError(applyTool(emptyPlan(), 'set_basics', { guests: { max: 0 } }));
    expectError(applyTool(emptyPlan(), 'set_basics', { guests: { preferred: 4.5 } }));
    expectError(applyTool(emptyPlan(), 'set_basics', { date: '2026-02-30' }));
    expectError(applyTool(emptyPlan(), 'set_basics', { date: 'next friday' }));
    expectError(applyTool(emptyPlan(), 'set_basics', { budgetTotal: -50 }));
    expectError(applyTool(emptyPlan(), 'set_basics', { name: '   ' }));
  });
});

describe('set_basics guests', () => {
  const guestsPlan = (guests: unknown) => expectOk(applyTool(emptyPlan(), 'set_basics', { guests }));

  it('plans for the exact count, else the top of the range, else preferred but at least min', () => {
    expect(guestsPlan({ exact: 20, preferred: 18 }).guestCount).toBe(20);
    expect(guestsPlan({ min: 8, max: 12 }).guestCount).toBe(12);
    expect(guestsPlan({ min: 8, max: 12 }).size).toBe('cozy'); // sized by 12, not 8
    expect(guestsPlan({ min: 19, preferred: 15 }).guestCount).toBe(19); // never below the yeses
    expect(guestsPlan({ min: 8, preferred: 10 }).guestCount).toBe(10);
    expect(guestsPlan({ min: 19 }).guestCount).toBe(19);
  });

  it('replaces all guest numbers', () => {
    const first = guestsPlan({ min: 8, max: 12 });
    const plan = expectOk(applyTool(first, 'set_basics', { guests: { preferred: 10 } }));
    expect(plan.guests).toEqual({ preferred: 10 });
  });

  it('rejects contradictions and unknown fields', () => {
    expect(expectError(applyTool(emptyPlan(), 'set_basics', { guests: { exact: 20, min: 18 } }))).toContain('exact');
    expect(expectError(applyTool(emptyPlan(), 'set_basics', { guests: { min: 12, max: 8 } }))).toContain('min');
    expectError(applyTool(emptyPlan(), 'set_basics', { guests: { count: 12 } }));
    expectError(applyTool(emptyPlan(), 'set_basics', { guests: {} }));
    expectError(applyTool(emptyPlan(), 'set_basics', { guests: 12 }));
  });

  it('describes clashes between the target and the expected count', () => {
    expect(guestConflict({ min: 19, preferred: 15 })).toContain('At least 19');
    expect(guestConflict({ max: 10, preferred: 15 })).toContain('At most 10');
    expect(guestConflict({ exact: 20, preferred: 18 })).toContain('Exactly 20');
    expect(guestConflict({ min: 8, max: 12, preferred: 10 })).toBeNull();
    expect(guestConflict({ min: 19 })).toBeNull();
    expect(guestConflict(undefined)).toBeNull();
  });
});

describe('set_basics name', () => {
  it('tidies whitespace and caps the length', () => {
    expect(expectOk(applyTool(emptyPlan(), 'set_basics', { name: '  Sam\'s   30th \n' })).name).toBe("Sam's 30th");
    expectError(applyTool(emptyPlan(), 'set_basics', { name: 'x'.repeat(81) }));
  });
});

describe('set_basics formality', () => {
  it('stores a guess, then a confirmed level, leaving other fields alone', () => {
    const named = expectOk(applyTool(emptyPlan(), 'set_basics', { name: 'Pizza night' }));
    const guessed = expectOk(applyTool(named, 'set_basics', { formality: { level: 'laidback', confirmed: false } }));
    expect(guessed.formality).toEqual({ level: 'laidback', confirmed: false });
    expect(guessed.name).toBe('Pizza night');

    const confirmed = expectOk(applyTool(guessed, 'set_basics', { formality: { level: 'casual', confirmed: true } }));
    expect(confirmed.formality).toEqual({ level: 'casual', confirmed: true });
  });

  it('rejects unknown levels and a missing confirmed flag', () => {
    expect(expectError(applyTool(emptyPlan(), 'set_basics', { formality: { level: 'fancy', confirmed: true } })))
      .toContain('laidback');
    expectError(applyTool(emptyPlan(), 'set_basics', { formality: { level: 'casual' } }));
    expectError(applyTool(emptyPlan(), 'set_basics', { formality: 'casual' }));
  });
});

describe('choose_places / choose_activities', () => {
  it('replaces the list and drops duplicates', () => {
    const first = expectOk(applyTool(emptyPlan(), 'choose_places', { ids: ['home-my'] }));
    const plan = expectOk(applyTool(first, 'choose_places', { ids: ['park-city', 'bar', 'bar'] }));
    expect(plan.places).toEqual(['park-city', 'bar']);
  });

  it('rejects unknown and top-level ids, and lists the valid ones', () => {
    const error = expectError(applyTool(emptyPlan(), 'choose_activities', { ids: ['karaoke'] }));
    expect(error).toContain('karaoke');
    expect(error).toContain('playing-board-games');

    expectError(applyTool(emptyPlan(), 'choose_places', { ids: ['home'] }));
    expectError(applyTool(emptyPlan(), 'choose_places', { ids: 'home-my' }));
  });

  it('does not change the plan when rejected', () => {
    const plan = expectOk(applyTool(emptyPlan(), 'choose_places', { ids: ['home-my'] }));
    applyTool(plan, 'choose_places', { ids: ['nope'] });
    expect(plan.places).toEqual(['home-my']);
  });
});

describe('add_budget_item', () => {
  it('appends an item', () => {
    const plan = expectOk(applyTool(emptyPlan(), 'add_budget_item', { label: ' Snacks ', amount: 40 }));
    expect(plan.budget).toEqual([{ label: 'Snacks', amount: 40 }]);
  });

  it('stores an estimate range, with amount at the high end', () => {
    const plan = expectOk(applyTool(emptyPlan(), 'add_budget_item', { label: 'Pizza', low: 40, high: 70 }));
    expect(plan.budget).toEqual([{ label: 'Pizza', amount: 70, low: 40, high: 70 }]);
  });

  it('needs amount, or both low and high, but not both kinds', () => {
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: 'Pizza' }));
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: 'Pizza', low: 40 }));
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: 'Pizza', low: 70, high: 40 }));
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: 'Pizza', amount: 50, low: 40, high: 70 }));
  });

  it('rejects non-positive or non-numeric amounts', () => {
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: 'Snacks', amount: 0 }));
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: 'Snacks', amount: '40' }));
    expectError(applyTool(emptyPlan(), 'add_budget_item', { label: '', amount: 40 }));
  });
});

describe('add_schedule_item', () => {
  it('defaults to the event date and keeps the schedule sorted', () => {
    const dated = expectOk(applyTool(emptyPlan(), 'set_basics', { date: '2026-11-14' }));
    const a = expectOk(applyTool(dated, 'add_schedule_item', { time: '21:00', title: 'Cake' }));
    const plan = expectOk(applyTool(a, 'add_schedule_item', { time: '19:00', title: 'Guests arrive' }));
    expect(plan.schedule.map(s => s.title)).toEqual(['Guests arrive', 'Cake']);
    expect(plan.schedule[0].date).toBe('2026-11-14');
  });

  it('needs a date from somewhere and a valid time', () => {
    expectError(applyTool(emptyPlan(), 'add_schedule_item', { time: '19:00', title: 'Arrive' }));
    expectError(applyTool(emptyPlan(), 'add_schedule_item', { date: '2026-11-14', time: '7pm', title: 'Arrive' }));
    expectError(applyTool(emptyPlan(), 'add_schedule_item', { date: '2026-11-14', time: '24:00', title: 'Arrive' }));
  });

  it('adds an all-day to-do without a time, first on its day', () => {
    const dated = expectOk(applyTool(emptyPlan(), 'set_basics', { date: '2026-11-14' }));
    const a = expectOk(applyTool(dated, 'add_schedule_item', { time: '10:00', title: 'Pick up the cake' }));
    const b = expectOk(applyTool(a, 'add_schedule_item', { title: 'Clean the living room' }));
    const plan = expectOk(applyTool(b, 'add_schedule_item', { date: '2026-11-07', title: 'Order the cake' }));
    expect(plan.schedule.map(s => s.title)).toEqual(['Order the cake', 'Clean the living room', 'Pick up the cake']);
    expect(plan.schedule[0]).toEqual({ date: '2026-11-07', title: 'Order the cake' }); // no time key
  });
});

describe('check_schedule_item', () => {
  const plan: Plan = {
    ...emptyPlan(),
    schedule: [
      { date: '2026-11-07', title: 'Order the cake' },
      { date: '2026-11-14', time: '19:00', title: 'Guests arrive' },
    ],
  };

  it('checks an item off and back on', () => {
    const done = expectOk(applyTool(plan, 'check_schedule_item', { index: 0, done: true }));
    expect(done.schedule[0].done).toBe(true);
    expect(done.schedule[1]).toBe(plan.schedule[1]);
    expect(expectOk(applyTool(done, 'check_schedule_item', { index: 0, done: false })).schedule[0].done).toBe(false);
  });

  it('needs a valid index and a boolean', () => {
    expect(expectError(applyTool(plan, 'check_schedule_item', { index: 5, done: true }))).toContain('0: 2026-11-07 all day Order the cake');
    expectError(applyTool(plan, 'check_schedule_item', { index: 0, done: 'yes' }));
    expectError(applyTool(plan, 'check_schedule_item', { index: 0 }));
  });
});

describe('remove_budget_item / remove_schedule_item', () => {
  const plan: Plan = {
    ...emptyPlan(),
    budget: [
      { label: 'Pizza', amount: 70, low: 40, high: 70 },
      { label: 'Plates', amount: 10 },
    ],
    schedule: [
      { date: '2026-11-14', time: '18:00', title: 'Setup' },
      { date: '2026-11-14', time: '19:00', title: 'Guests arrive' },
    ],
  };

  it('removes the item at the index and leaves the rest', () => {
    expect(expectOk(applyTool(plan, 'remove_budget_item', { index: 0 })).budget).toEqual([plan.budget[1]]);
    expect(expectOk(applyTool(plan, 'remove_schedule_item', { index: 1 })).schedule).toEqual([plan.schedule[0]]);
    expect(plan.budget).toHaveLength(2); // not mutated
  });

  it('rejects a bad index and lists the items', () => {
    const error = expectError(applyTool(plan, 'remove_budget_item', { index: 2 }));
    expect(error).toContain('0: Pizza');
    expect(error).toContain('1: Plates');
    expectError(applyTool(plan, 'remove_schedule_item', { index: -1 }));
    expectError(applyTool(plan, 'remove_schedule_item', { index: 0.5 }));
    expectError(applyTool(plan, 'remove_schedule_item', {}));
    expect(expectError(applyTool(emptyPlan(), 'remove_budget_item', { index: 0 }))).toContain('empty');
  });
});

describe('helpers', () => {
  it('rejects unknown tools', () => {
    expectError(applyTool(emptyPlan(), 'delete_everything', {}));
  });

  it('normalizePlan fills missing fields', () => {
    expect(normalizePlan({ name: 'x' })).toEqual({ ...emptyPlan(), name: 'x' });
    expect(normalizePlan(null)).toEqual(emptyPlan());
  });

  it('validates dates and times', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('9:00')).toBe(false);
  });
});

describe('event names', () => {
  const rename = (name: string) => applyTool(emptyPlan(), 'set_basics', { name });

  it('blocks slurs and strong profanity, including disguised spellings', () => {
    for (const name of ['fuck this party', 'fuuuck night', 'b1tch brunch', 'dick pics']) {
      expect(rename(name)).toEqual({ ok: false, error: NAME_NOT_ALLOWED });
    }
  });

  it('allows mild words and ordinary names', () => {
    for (const name of ['Shit Show Saturday', 'Crap Gift Swap', "Sam's 30th", 'Scunthorpe reunion', 'Essex trip']) {
      expect(rename(name).ok).toBe(true);
    }
  });
});
