// Scripted eval of the planning agent: real model, real tools, no Supabase or browser.
// Each case sends one message (optionally to a prepared plan) and checks the resulting plan and reply.
//
// Usage: npx tsx --env-file=.env.local scripts/agent-eval.mts            (all cases)
//        npx tsx --env-file=.env.local scripts/agent-eval.mts guest-clash (just the named cases)
//        npx tsx scripts/agent-eval.mts --dry (no model, free: checks the untouched starting plans,
//        so every case should fail; a case that passes has checks too weak to mean anything)
// Costs about $0.05–0.10 per case.
import { runAgent } from '../src/app/shared/agent';
import { applyTool, budgetRange, emptyPlan, type Plan, type ToolName } from '../src/app/shared/plan';
import { makeCallModel, maxCost } from './claude.mts';

// Fixed, so relative dates have one right answer: a Wednesday, so "next Friday" is Oct 30 or Nov 6
const TODAY = '2026-10-28';
const CONCURRENCY = 3;

type Check = [description: string, passes: (plan: Plan, reply: string) => boolean];

interface Case {
  name: string;
  start?: [ToolName, Record<string, unknown>][]; // tool calls that build the starting plan
  message: string;
  checks: Check[];
}

// ── Helpers for checks ───────────────────────────────────────

const hasPlace = (id: string): Check => [`places include ${id}`, plan => plan.places.includes(id)];
const hasActivity = (id: string): Check => [`activities include ${id}`, plan => plan.activities.includes(id)];
const size = (bucket: string): Check => [`size is ${bucket}`, plan => plan.size === bucket];
const budgetWithin = (total: number): Check => [
  `budget items total at most $${total} (high end)`,
  plan => budgetRange(plan.budget).high <= total,
];

// Every reply has to follow the system prompt's house rules
const RULES: Check[] = [
  ['reply is not empty', (_, reply) => reply.trim().length > 0],
  ['asks at most two questions', (_, reply) => (reply.match(/\?/g) ?? []).length <= 2],
  ['no markdown', (_, reply) => !/\*\*|^#+ |^\s*[-*] /m.test(reply)],
  ['no emoji', (_, reply) => !/\p{Extended_Pictographic}/u.test(reply)],
];

// ── Cases ────────────────────────────────────────────────────

const CASES: Case[] = [
  {
    name: 'birthday-board-games',
    message: 'Birthday for 12 at my place, board games, $300 budget',
    checks: [
      ['plans for 12 guests', plan => plan.guestCount === 12],
      size('cozy'),
      hasPlace('home-my'),
      hasActivity('playing-board-games'),
      hasActivity('celebrating-birthday'),
      ['total budget is $300', plan => plan.budgetTotal === 300],
      budgetWithin(300),
    ],
  },
  {
    name: 'park-picnic',
    message: 'A picnic in a city park for about 30 people',
    checks: [
      hasPlace('park-city'),
      hasActivity('eating-picnicking'),
      ['plans for 30 guests', plan => plan.guestCount === 30],
      size('mixer'),
    ],
  },
  {
    name: 'guest-range',
    message: 'Pizza party at my place, maybe 8 to 12 people',
    checks: [
      ['guests are 8 to 12', plan => plan.guests?.min === 8 && plan.guests?.max === 12],
      ['plans for the top of the range', plan => plan.guestCount === 12],
      hasPlace('home-my'),
      hasActivity('eating-takeout'),
      ['pizza is a low–high estimate', plan => plan.budget.some(i => /pizza/i.test(i.label) && i.low! < i.high!)],
    ],
  },
  {
    name: 'relative-date',
    message: 'Game night next Friday at 7pm, about 6 friends',
    checks: [
      ['date is next Friday', plan => ['2026-10-30', '2026-11-06'].includes(plan.date!)],
      ['7pm is on the schedule', plan => plan.schedule.some(i => i.date === plan.date && i.time === '19:00')],
      ['an activity under Playing', plan => plan.activities.some(id => id.startsWith('playing-'))],
      size('intimate'),
    ],
  },
  {
    name: 'guest-clash',
    start: [
      ['set_basics', { name: 'Housewarming', guests: { preferred: 15 } }],
      ['choose_places', { ids: ['home-my'] }],
    ],
    message: '19 people have already said yes.',
    checks: [
      ['plans for at least 19', plan => (plan.guestCount ?? 0) >= 19],
      ['keeps the preferred 15', plan => plan.guests?.preferred === 15],
      ['points out the clash with 15', (_, reply) => /15/.test(reply)],
    ],
  },
  {
    name: 'formality-guess',
    message: 'Wine and cheese night for 10 friends',
    checks: [
      ['saves a formality guess', plan => plan.formality?.confirmed === false],
      ['asks about formality', (_, reply) => /\?/.test(reply)],
    ],
  },
  {
    name: 'formality-confirm',
    start: [['set_basics', { name: 'Sam turns 40', formality: { level: 'casual', confirmed: false } }]],
    message: "It's dressier than that, more like a cocktail party.",
    checks: [['formality is confirmed as dressy', plan => plan.formality?.level === 'dressy' && plan.formality.confirmed]],
  },
  {
    name: 'drop-budget-item',
    start: [
      ['set_basics', { name: 'Game night', budgetTotal: 200 }],
      ['add_budget_item', { label: 'Pizza (3 large)', low: 40, high: 70 }],
      ['add_budget_item', { label: 'Decorations', amount: 30 }],
      ['add_budget_item', { label: 'Paper plates and cups', amount: 10 }],
    ],
    message: 'Drop the decorations.',
    checks: [
      ['decorations are gone', plan => !plan.budget.some(i => /decor/i.test(i.label))],
      ['pizza and plates stay', plan => plan.budget.some(i => /pizza/i.test(i.label)) && plan.budget.some(i => /plate/i.test(i.label))],
    ],
  },
  {
    name: 'move-schedule-item',
    start: [
      ['set_basics', { name: 'Dinner party', date: '2026-11-07' }],
      ['add_schedule_item', { time: '18:00', title: 'Setup' }],
      ['add_schedule_item', { time: '19:00', title: 'Dinner' }],
    ],
    message: 'Move dinner to 8pm.',
    checks: [
      ['dinner is at 8pm', plan => plan.schedule.some(i => /dinner/i.test(i.title) && i.time === '20:00')],
      ['nothing left at 7pm', plan => !plan.schedule.some(i => i.time === '19:00')],
      ['setup is untouched', plan => plan.schedule.some(i => /setup/i.test(i.title) && i.time === '18:00')],
    ],
  },
  {
    name: 'keep-existing-choices',
    start: [
      ['choose_places', { ids: ['home-my'] }],
      ['choose_activities', { ids: ['playing-board-games'] }],
    ],
    message: 'Add video games too.',
    checks: [
      hasActivity('playing-video-games'),
      ['board games stay', plan => plan.activities.includes('playing-board-games')],
      ['place stays', plan => plan.places.length === 1 && plan.places[0] === 'home-my'],
    ],
  },
  {
    name: 'no-matching-place',
    message: "Let's have it on a yacht.",
    checks: [
      ['does not pick a place silently', plan => plan.places.length === 0],
      ['says a yacht is not an option', (_, reply) => /yacht|boat/i.test(reply)],
    ],
  },
  {
    name: 'cake-lead-up',
    message: "Birthday for 12 at my place on Saturday, November 14. I'll get the cake from a bakery.",
    checks: [
      ['date is Nov 14', plan => plan.date === '2026-11-14'],
      [
        'a cake to-do days before the party',
        plan => plan.schedule.some(i => /cake/i.test(i.title) && i.date < '2026-11-14'),
      ],
      ['picking up the cake on the day', plan => plan.schedule.some(i => /cake/i.test(i.title) && /pick/i.test(i.title) && i.date === '2026-11-14')],
    ],
  },
  {
    name: 'check-off-todo',
    start: [
      ['set_basics', { name: 'Birthday', date: '2026-11-14' }],
      ['add_schedule_item', { date: '2026-11-07', title: 'Order the cake' }],
      ['add_schedule_item', { time: '19:00', title: 'Guests arrive' }],
    ],
    message: 'I ordered the cake today.',
    checks: [
      ['ordering the cake is checked off', plan => plan.schedule.some(i => /order/i.test(i.title) && i.done === true)],
      ['nothing else is checked off', plan => plan.schedule.filter(i => i.done).length === 1],
    ],
  },
  {
    name: 'tight-budget',
    message: 'Catered dinner for 40 people, and my budget is $200.',
    checks: [
      ['total budget is $200', plan => plan.budgetTotal === 200],
      [
        'stays within $200 or warns about it',
        (plan, reply) => budgetRange(plan.budget).high <= 200 || /over|exceed|tight|stretch|more than/i.test(reply),
      ],
    ],
  },
];

// ── Runner ───────────────────────────────────────────────────

interface Result {
  name: string;
  failures: string[];
  reply: string;
  plan: Plan | null;
  toolCalls: number;
  cost: number;
  ms: number;
}

function startPlan(calls: Case['start'] = []): Plan {
  let plan = emptyPlan();
  for (const [name, input] of calls) {
    const result = applyTool(plan, name, input);
    if (!result.ok) throw new Error(`Bad starting plan (${name}): ${result.error}`);
    plan = result.plan;
  }
  return plan;
}

async function runCase(c: Case): Promise<Result> {
  const started = Date.now();
  let reply = '';
  try {
    const run = await runAgent({
      callModel: makeCallModel(),
      plan: startPlan(c.start),
      history: [],
      userText: c.message,
      today: TODAY,
      emit: e => {
        // Like the chat panel: a new round's text replaces the reply so far
        if (e.type === 'round') reply = '';
        if (e.type === 'text') reply += e.delta;
      },
    });
    const failures = [...c.checks, ...RULES].filter(([, passes]) => !passes(run.plan, reply)).map(([d]) => d);
    if (run.stopReason !== 'end_turn') failures.unshift(`stopped with ${run.stopReason}`);
    return {
      name: c.name,
      failures,
      reply,
      plan: run.plan,
      toolCalls: run.toolCalls,
      cost: maxCost(run.inputTokens, run.outputTokens),
      ms: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: c.name, failures: [`threw: ${message}`], reply, plan: null, toolCalls: 0, cost: 0, ms: Date.now() - started };
  }
}

// Runs at most `limit` cases at a time, keeping results in case order
async function runAll(cases: Case[], limit: number): Promise<Result[]> {
  const results: Result[] = new Array(cases.length);
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const i = next++;
      results[i] = await runCase(cases[i]);
      const r = results[i];
      console.error(`${r.failures.length ? 'FAIL' : 'pass'}  ${r.name} (${(r.ms / 1000).toFixed(1)}s)`);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const dry = process.argv.includes('--dry');
const only = process.argv.slice(2).filter(arg => arg !== '--dry');
const unknown = only.filter(name => !CASES.some(c => c.name === name));
if (unknown.length) {
  console.error(`Unknown case(s): ${unknown.join(', ')}. Cases: ${CASES.map(c => c.name).join(', ')}`);
  process.exit(1);
}
const selected = only.length ? CASES.filter(c => only.includes(c.name)) : CASES;

if (dry) {
  // Only the case's own checks: the house rules would fail every empty reply and prove nothing
  const weak = selected.filter(c => c.checks.every(([, passes]) => passes(startPlan(c.start), '')));
  for (const c of weak) console.log(`passes without the model: ${c.name}`);
  console.log(weak.length ? `\n${weak.length} case(s) need stronger checks.` : `All ${selected.length} cases fail without the model.`);
  process.exit(weak.length ? 1 : 0);
}

console.error(`Running ${selected.length} case(s), ${CONCURRENCY} at a time...\n`);
const results = await runAll(selected, CONCURRENCY);

for (const r of results.filter(r => r.failures.length)) {
  console.log(`\n── ${r.name} ──`);
  for (const failure of r.failures) console.log(`  failed: ${failure}`);
  console.log(`  reply: ${r.reply.trim() || '(none)'}`);
  if (r.plan) console.log(`  plan: ${JSON.stringify(r.plan)}`);
}

const passed = results.filter(r => !r.failures.length).length;
const cost = results.reduce((sum, r) => sum + r.cost, 0);
const toolCalls = results.reduce((sum, r) => sum + r.toolCalls, 0);
console.log(`\n${passed}/${results.length} passed · ${toolCalls} tool calls · cost <= $${cost.toFixed(2)}`);
process.exit(passed === results.length ? 0 : 1);
