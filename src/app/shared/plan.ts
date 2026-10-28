// The event plan and the 5 tools that change it.
// Pure TypeScript with no Angular imports: the Angular app and api/agent.ts both use this file,
// so the wizard, the agent and the validation can never disagree about what a valid plan is.
import {
  ACTIVITY_OPTIONS,
  FORMALITY_LEVELS,
  PLACE_OPTIONS,
  getSizeBucket,
  type ActivityOption,
  type PlaceOption,
} from '../services/decision-tree';

// ── Plan shape (frozen 2026-10-28; extend only with optional fields) ──

export interface BudgetItem {
  label: string;
  amount: number; // dollars, > 0. For an estimate range this is the high end, so totals don't under-count.
  low?: number; // set together with high for an estimate like "$40–70"
  high?: number;
}

// Each field is optional. `exact` replaces min/max; `preferred` is the host's target
// (e.g. "my place fits 15") and is compared against the others, not used for sizing.
export interface GuestCounts {
  min?: number;
  max?: number;
  exact?: number;
  preferred?: number;
}

// `confirmed` is false while it's the agent's guess, and true once the user has said which level it is
export interface Formality {
  level: string; // FORMALITY_LEVELS id
  confirmed: boolean;
}

export interface ScheduleItem {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24-hour
  title: string;
}

export interface Plan {
  name: string | null;
  date: string | null; // YYYY-MM-DD
  guestCount: number | null; // the number to plan for, derived from `guests` (see planningCount)
  guests?: GuestCounts;
  size: string | null; // SizeBucket label, from guestCount
  formality?: Formality;
  places: string[]; // selectable PLACE_OPTIONS ids
  activities: string[]; // selectable ACTIVITY_OPTIONS ids
  budgetTotal: number | null;
  budget: BudgetItem[];
  schedule: ScheduleItem[];
}

export function emptyPlan(): Plan {
  return {
    name: null,
    date: null,
    guestCount: null,
    size: null,
    places: [],
    activities: [],
    budgetTotal: null,
    budget: [],
    schedule: [],
  };
}

// Fills in any missing fields, e.g. for rows saved before a field existed
export function normalizePlan(raw: Partial<Plan> | null | undefined): Plan {
  return { ...emptyPlan(), ...(raw ?? {}) };
}

// ── Guests ───────────────────────────────────────────────────

// The number food, supplies and the size bucket are based on: a hard count if there is one,
// else the top of the range so nothing runs short, else the host's target, but never fewer than
// the minimum (19 yeses means food for 19, even if the host would prefer 15).
export function planningCount(guests: GuestCounts): number | null {
  const { exact, max, preferred, min } = guests;
  if (exact !== undefined) return exact;
  if (max !== undefined) return max;
  if (preferred !== undefined) return Math.max(preferred, min ?? 0);
  return min ?? null;
}

// A sentence describing a clash between the host's target and the expected head count, or null
export function guestConflict(guests: GuestCounts | undefined): string | null {
  if (!guests || guests.preferred === undefined) return null;
  const { preferred, exact, min, max } = guests;
  if (exact !== undefined && exact !== preferred) {
    return `Exactly ${exact} guests are coming, but the host would prefer ${preferred}.`;
  }
  if (min !== undefined && min > preferred) {
    return `At least ${min} guests are expected, more than the ${preferred} the host prefers.`;
  }
  if (max !== undefined && max < preferred) {
    return `At most ${max} guests are expected, fewer than the ${preferred} the host prefers.`;
  }
  return null;
}

// ── Selectable ids ───────────────────────────────────────────

// The wizard lets users pick every option below the top-level categories
// (e.g. `park` and `park-city`, but not `public-space`), so the tools accept exactly those.
function descendantIds(options: (PlaceOption | ActivityOption)[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: (PlaceOption | ActivityOption)[]) => {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) walk(node.children);
    }
  };
  for (const category of options) walk(category.children ?? []);
  return ids;
}

export const SELECTABLE_PLACE_IDS: readonly string[] = descendantIds(PLACE_OPTIONS);
export const SELECTABLE_ACTIVITY_IDS: readonly string[] = descendantIds(ACTIVITY_OPTIONS);
export const FORMALITY_IDS: readonly string[] = FORMALITY_LEVELS.map(level => level.id);

// ── Tools ────────────────────────────────────────────────────

export type ToolName =
  | 'set_basics'
  | 'choose_places'
  | 'choose_activities'
  | 'add_budget_item'
  | 'add_schedule_item';

export type ToolResult = { ok: true; plan: Plan } | { ok: false; error: string };

// JSON-schema tool definitions for the Claude API. The enums keep the model to real ids;
// applyTool still validates, because the model can ignore a schema.
export const PLAN_TOOLS = [
  {
    name: 'set_basics',
    description:
      'Set the event name, date, guest numbers, formality and/or total budget. Only pass the fields you want to change. ' +
      'The number to plan for and the size bucket are derived from the guest numbers automatically.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short event name, e.g. "Sam\'s 30th".' },
        date: { type: 'string', description: 'Event date as YYYY-MM-DD.' },
        guests: {
          type: 'object',
          description:
            'Replaces all guest numbers, so include any you want to keep. "8 to 12 people" is min 8, max 12. ' +
            '"About 12" is preferred 12. "19 said yes" is min 19. "My place fits 15" is preferred 15. ' +
            'Use exact only when the count is fixed (e.g. "a reservation for exactly 20"); exact replaces min and max.',
          properties: {
            min: { type: 'integer', minimum: 1, description: 'At least this many.' },
            max: { type: 'integer', minimum: 1, description: 'At most this many.' },
            exact: { type: 'integer', minimum: 1, description: 'Exactly this many; cannot be combined with min or max.' },
            preferred: { type: 'integer', minimum: 1, description: "The host's target number." },
          },
        },
        formality: {
          type: 'object',
          description:
            'How formal the event is. Set confirmed false for your own guess, and true once the user has said ' +
            'or picked the level.',
          properties: {
            level: { type: 'string', enum: FORMALITY_IDS },
            confirmed: { type: 'boolean' },
          },
          required: ['level', 'confirmed'],
        },
        budgetTotal: { type: 'number', exclusiveMinimum: 0, description: 'Total budget in dollars.' },
      },
    },
  },
  {
    name: 'choose_places',
    description: 'Replace the list of venue types. Pass every place to keep, not just new ones.',
    input_schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string', enum: SELECTABLE_PLACE_IDS }, uniqueItems: true },
      },
      required: ['ids'],
    },
  },
  {
    name: 'choose_activities',
    description: 'Replace the list of activities. Pass every activity to keep, not just new ones.',
    input_schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string', enum: SELECTABLE_ACTIVITY_IDS }, uniqueItems: true },
      },
      required: ['ids'],
    },
  },
  {
    name: 'add_budget_item',
    description:
      'Add one line item to the budget. Pass amount for a known cost, or low and high for an estimate.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'What the money is for, e.g. "Pizza (3 large)".' },
        amount: { type: 'number', exclusiveMinimum: 0, description: 'Known cost in dollars.' },
        low: { type: 'number', exclusiveMinimum: 0, description: 'Low end of an estimate, in dollars.' },
        high: { type: 'number', exclusiveMinimum: 0, description: 'High end of an estimate, in dollars.' },
      },
      required: ['label'],
    },
  },
  {
    name: 'add_schedule_item',
    description: 'Add one item to the schedule. Date defaults to the event date.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD. Omit to use the event date.' },
        time: { type: 'string', description: '24-hour time as HH:MM, e.g. "19:30".' },
        title: { type: 'string', description: 'What happens, e.g. "Guests arrive".' },
      },
      required: ['time', 'title'],
    },
  },
] as const;

type Input = Record<string, unknown>;

const fail = (error: string): ToolResult => ({ ok: false, error });

export function applyTool(plan: Plan, name: string, input: Input): ToolResult {
  switch (name) {
    case 'set_basics':
      return setBasics(plan, input);
    case 'choose_places':
      return chooseIds(plan, input, 'places', SELECTABLE_PLACE_IDS);
    case 'choose_activities':
      return chooseIds(plan, input, 'activities', SELECTABLE_ACTIVITY_IDS);
    case 'add_budget_item':
      return addBudgetItem(plan, input);
    case 'add_schedule_item':
      return addScheduleItem(plan, input);
    default:
      return fail(`Unknown tool "${name}".`);
  }
}

function setBasics(plan: Plan, input: Input): ToolResult {
  const { name, date, guests, formality, budgetTotal } = input;
  if ([name, date, guests, formality, budgetTotal].every(value => value === undefined)) {
    return fail('Pass at least one of name, date, guests, formality or budgetTotal.');
  }

  const next = { ...plan };

  if (name !== undefined) {
    if (!isNonEmptyString(name)) return fail('name must be a non-empty string.');
    next.name = name.trim();
  }
  if (date !== undefined) {
    if (!isValidDate(date)) return fail(`date must be a real date as YYYY-MM-DD; got ${JSON.stringify(date)}.`);
    next.date = date;
  }
  if (guests !== undefined) {
    const parsed = parseGuests(guests);
    if (typeof parsed === 'string') return fail(parsed);
    const count = planningCount(parsed);
    next.guests = parsed;
    next.guestCount = count;
    next.size = count === null ? null : (getSizeBucket(count)?.label ?? null);
  }
  if (formality !== undefined) {
    const parsed = parseFormality(formality);
    if (typeof parsed === 'string') return fail(parsed);
    next.formality = parsed;
  }
  if (budgetTotal !== undefined) {
    if (!isPositiveNumber(budgetTotal)) return fail(`budgetTotal must be a positive number; got ${JSON.stringify(budgetTotal)}.`);
    next.budgetTotal = budgetTotal;
  }

  return { ok: true, plan: next };
}

// Returns the cleaned guest numbers, or an error message
function parseGuests(input: unknown): GuestCounts | string {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return 'guests must be an object with any of min, max, exact, preferred.';
  }
  const raw = input as Record<string, unknown>;
  const unknown = Object.keys(raw).filter(key => !['min', 'max', 'exact', 'preferred'].includes(key));
  if (unknown.length) return `Unknown guests field(s): ${unknown.join(', ')}. Use min, max, exact or preferred.`;

  const guests: GuestCounts = {};
  for (const key of ['min', 'max', 'exact', 'preferred'] as const) {
    const value = raw[key];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || (value as number) < 1) {
      return `guests.${key} must be a whole number of at least 1; got ${JSON.stringify(value)}.`;
    }
    guests[key] = value as number;
  }

  if (!Object.keys(guests).length) return 'guests needs at least one of min, max, exact, preferred.';
  if (guests.exact !== undefined && (guests.min !== undefined || guests.max !== undefined)) {
    return 'exact replaces min and max. Pass exact on its own (preferred is still allowed).';
  }
  if (guests.min !== undefined && guests.max !== undefined && guests.min > guests.max) {
    return `guests.min (${guests.min}) can't be more than guests.max (${guests.max}).`;
  }
  return guests;
}

// Returns the cleaned formality, or an error message
function parseFormality(input: unknown): Formality | string {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return 'formality must be an object with level and confirmed.';
  }
  const { level, confirmed } = input as Record<string, unknown>;
  if (typeof level !== 'string' || !FORMALITY_IDS.includes(level)) {
    return `formality.level must be one of ${FORMALITY_IDS.join(', ')}; got ${JSON.stringify(level)}.`;
  }
  if (typeof confirmed !== 'boolean') return 'formality.confirmed must be true or false.';
  return { level, confirmed };
}

function chooseIds(
  plan: Plan,
  input: Input,
  field: 'places' | 'activities',
  allowed: readonly string[],
): ToolResult {
  const { ids } = input;
  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
    return fail('ids must be an array of strings.');
  }

  const unknown = ids.filter(id => !allowed.includes(id));
  if (unknown.length) {
    return fail(`Unknown ${field} id(s): ${unknown.join(', ')}. Valid ids are: ${allowed.join(', ')}.`);
  }

  return { ok: true, plan: { ...plan, [field]: [...new Set(ids)] } };
}

function addBudgetItem(plan: Plan, input: Input): ToolResult {
  const { label, amount, low, high } = input;
  if (!isNonEmptyString(label)) return fail('label must be a non-empty string.');

  let item: BudgetItem;
  if (amount !== undefined) {
    if (low !== undefined || high !== undefined) return fail('Pass either amount, or low and high, not both.');
    if (!isPositiveNumber(amount)) return fail(`amount must be a positive number of dollars; got ${JSON.stringify(amount)}.`);
    item = { label: label.trim(), amount };
  } else {
    if (!isPositiveNumber(low) || !isPositiveNumber(high)) {
      return fail('Pass amount for a known cost, or both low and high (positive dollars) for an estimate.');
    }
    if (low > high) return fail(`low (${low}) can't be more than high (${high}).`);
    item = { label: label.trim(), amount: high, low, high };
  }

  return { ok: true, plan: { ...plan, budget: [...plan.budget, item] } };
}

function addScheduleItem(plan: Plan, input: Input): ToolResult {
  const { time, title } = input;
  const date = input['date'] ?? plan.date;

  if (date === null) return fail('No date given and the event has no date yet. Pass date, or call set_basics first.');
  if (!isValidDate(date)) return fail(`date must be a real date as YYYY-MM-DD; got ${JSON.stringify(date)}.`);
  if (!isValidTime(time)) return fail(`time must be 24-hour HH:MM; got ${JSON.stringify(time)}.`);
  if (!isNonEmptyString(title)) return fail('title must be a non-empty string.');

  const schedule = [...plan.schedule, { date, time, title: title.trim() }].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
  return { ok: true, plan: { ...plan, schedule } };
}

// ── Validators ───────────────────────────────────────────────

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  // Rejects dates like 2026-02-30 that Date would silently roll over
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
