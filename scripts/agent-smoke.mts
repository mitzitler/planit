// Runs one real agent turn against the Claude API, without Supabase or the browser.
// Usage: npx tsx --env-file=.env.local scripts/agent-smoke.mts "birthday for 12 at my place, $300"
// Start from a saved plan with PLAN='{"places":["home-my"]}'. Costs a few cents per run.
import { runAgent } from '../src/app/shared/agent';
import { normalizePlan } from '../src/app/shared/plan';
import { makeCallModel, maxCost } from './claude.mts';

const callModel = makeCallModel(message =>
  console.error(`\n[round] stop=${message.stop_reason} usage=${JSON.stringify(message.usage)}`),
);

const prompt = process.argv[2] ?? 'Birthday for 12 at my place next Saturday, board games, $300 budget';
const started = Date.now();
const run = await runAgent({
  callModel,
  plan: normalizePlan(process.env['PLAN'] ? JSON.parse(process.env['PLAN']) : null),
  history: [],
  userText: prompt,
  today: new Date().toISOString().slice(0, 10),
  emit: e => {
    if (e.type === 'text') process.stdout.write(e.delta);
  },
});

console.log('\n\nplan:', JSON.stringify(run.plan, null, 2));
console.log(
  `stop=${run.stopReason} rounds=${run.rounds} toolCalls=${run.toolCalls} ` +
    `in=${run.inputTokens} out=${run.outputTokens} cost<=$${maxCost(run.inputTokens, run.outputTokens).toFixed(3)} ${Date.now() - started}ms`,
);
