// The Claude call the terminal scripts share. Same request as api/agent.ts, which keeps its own copy
// because it reads the key from Vercel's ANTHROPIC_KEY.
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_MODEL, SYSTEM_PROMPT, type CallModel } from '../src/app/shared/agent';
import { PLAN_TOOLS } from '../src/app/shared/plan';

const anthropic = new Anthropic();

export function makeCallModel(onRound?: (message: Anthropic.Beta.BetaMessage) => void): CallModel {
  return async (messages, onText) => {
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
    onRound?.(message);
    return message;
  };
}

// Opus 5.5: $4/M input, $20/M output. An upper bound: cache reads are counted at the full input rate.
export function maxCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 4 + outputTokens * 20) / 1e6;
}
