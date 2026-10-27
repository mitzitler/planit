import {
  PLAN_TOOLS,
  SELECTABLE_ACTIVITY_IDS,
  SELECTABLE_PLACE_IDS,
  applyTool,
  emptyPlan,
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
  it('maps guest count to the right size bucket', () => {
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
      const plan = expectOk(applyTool(emptyPlan(), 'set_basics', { guestCount: count }));
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
    expectError(applyTool(emptyPlan(), 'set_basics', { guestCount: 0 }));
    expectError(applyTool(emptyPlan(), 'set_basics', { guestCount: 4.5 }));
    expectError(applyTool(emptyPlan(), 'set_basics', { date: '2026-02-30' }));
    expectError(applyTool(emptyPlan(), 'set_basics', { date: 'next friday' }));
    expectError(applyTool(emptyPlan(), 'set_basics', { budgetTotal: -50 }));
    expectError(applyTool(emptyPlan(), 'set_basics', { name: '   ' }));
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
