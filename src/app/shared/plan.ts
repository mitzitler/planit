// The event plan and the 5 tools that change it.
// Pure TypeScript with no Angular imports: the Angular app and api/agent.ts both use this file,
// so the wizard, the agent and the validation can never disagree about what a valid plan is.
import {
  ACTIVITY_OPTIONS,
  PLACE_OPTIONS,
  getSizeBucket,
  type ActivityOption,
  type PlaceOption,
} from '../services/decision-tree';

// ── Plan shape (frozen 2026-10-28; extend only with optional fields) ──

export interface BudgetItem {
  label: string;
  amount: number; // dollars, > 0
}

export interface ScheduleItem {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24-hour
  title: string;
}

export interface Plan {
  name: string | null;
  date: string | null; // YYYY-MM-DD
  guestCount: number | null;
  size: string | null; // SizeBucket label
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
      'Set the event name, date, guest count and/or total budget. Only pass the fields you want to change. ' +
      'The size bucket is derived from the guest count automatically.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Short event name, e.g. "Sam\'s 30th".' },
        date: { type: 'string', description: 'Event date as YYYY-MM-DD.' },
        guestCount: { type: 'integer', minimum: 1, description: 'Expected number of guests.' },
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
    description: 'Add one line item to the budget.',
    input_schema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'What the money is for, e.g. "Snacks".' },
        amount: { type: 'number', exclusiveMinimum: 0, description: 'Cost in dollars.' },
      },
      required: ['label', 'amount'],
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
  const { name, date, guestCount, budgetTotal } = input;
  if (name === undefined && date === undefined && guestCount === undefined && budgetTotal === undefined) {
    return fail('Pass at least one of name, date, guestCount or budgetTotal.');
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
  if (guestCount !== undefined) {
    if (!Number.isInteger(guestCount) || (guestCount as number) < 1) {
      return fail(`guestCount must be a whole number of at least 1; got ${JSON.stringify(guestCount)}.`);
    }
    next.guestCount = guestCount as number;
    next.size = getSizeBucket(guestCount as number)?.label ?? null;
  }
  if (budgetTotal !== undefined) {
    if (!isPositiveNumber(budgetTotal)) return fail(`budgetTotal must be a positive number; got ${JSON.stringify(budgetTotal)}.`);
    next.budgetTotal = budgetTotal;
  }

  return { ok: true, plan: next };
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
  const { label, amount } = input;
  if (!isNonEmptyString(label)) return fail('label must be a non-empty string.');
  if (!isPositiveNumber(amount)) return fail(`amount must be a positive number of dollars; got ${JSON.stringify(amount)}.`);

  return { ok: true, plan: { ...plan, budget: [...plan.budget, { label: label.trim(), amount }] } };
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
