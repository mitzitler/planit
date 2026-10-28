// Runs one real agent turn against the Claude API, without Supabase or the browser.
// Usage: npx tsx --env-file=.env.local scripts/agent-smoke.mts "birthday for 12 at my place, $300"
// Start from a saved plan with PLAN='{"places":["home-my"]}'. Costs a few cents per run.
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_MODEL, SYSTEM_PROMPT, runAgent, type CallModel } from '../src/app/shared/agent';
import { PLAN_TOOLS, normalizePlan } from '../src/app/shared/plan';

const anthropic = new Anthropic();

// Same request as api/agent.ts
const callModel: CallModel = async (messages, onText) => {
  const stream = anthropic.beta.messages.stream({
    model: AGENT_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' },
    system: SYSTEM_PROMPT,
    tools: PLAN_TOOLS as unknown as Anthropic.Beta.BetaTool[],
    messages,
  });
  stream.on('text', onText);
  const message = await stream.finalMessage();
  console.error(`\n[round] stop=${message.stop_reason} usage=${JSON.stringify(message.usage)}`);
  return message;
};

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

// Opus 5.5: $4/M input, $20/M output. Upper bound: counts cache reads at the full input rate.
const maxCost = (run.inputTokens * 4 + run.outputTokens * 20) / 1e6;
console.log('\n\nplan:', JSON.stringify(run.plan, null, 2));
console.log(
  `stop=${run.stopReason} rounds=${run.rounds} toolCalls=${run.toolCalls} ` +
    `in=${run.inputTokens} out=${run.outputTokens} cost<=$${maxCost.toFixed(3)} ${Date.now() - started}ms`,
);
