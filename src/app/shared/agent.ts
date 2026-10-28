// The agent loop: Claude reads the plan, calls the plan tools, and the loop applies each call.
// No Angular and no network code: api/agent.ts passes in `callModel`, so tests can use a fake.
// The Anthropic imports are types only and compile away.
import type {
  BetaMessage,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { ACTIVITY_OPTIONS, PLACE_OPTIONS, type ActivityOption, type PlaceOption } from '../services/decision-tree';
import { applyTool, type Plan } from './plan';

export const AGENT_MODEL = 'claude-opus-5-5';
export const MAX_ROUNDS = 6; // model calls per user message

// ── Wire format (api/agent.ts → browser, one JSON object per line) ──

export type AgentEvent =
  | { type: 'text'; delta: string }
  // A new model call is starting after tool calls. Its text replaces the reply so far,
  // so notes Claude writes before calling tools don't end up in front of the real answer.
  | { type: 'round' }
  | { type: 'plan'; plan: Plan }
  // `messages` is this exchange in API form. The browser appends it to its history unchanged
  // and sends it back next time: the thinking blocks inside are only valid if nothing is edited.
  | { type: 'done'; plan: Plan; messages: BetaMessageParam[] }
  | { type: 'error'; error: string };

// ── System prompt ────────────────────────────────────────────

// "id: Label" lines, indented by depth. Categories are shown for context but aren't selectable.
function catalog(options: (PlaceOption | ActivityOption)[]): string {
  const lines: string[] = [];
  const walk = (nodes: (PlaceOption | ActivityOption)[], depth: number) => {
    for (const node of nodes) {
      const line = depth === 0 ? `${node.label} (category, not selectable)` : `${node.id}: ${node.label}`;
      lines.push(`${'  '.repeat(depth)}- ${line}`);
      if (node.children) walk(node.children, depth + 1);
    }
  };
  walk(options, 0);
  return lines.join('\n');
}

// Must stay byte-identical between requests: it's cached, and thinking blocks are bound to it.
// Per-request facts (today's date, the current plan) go in the user message instead.
export const SYSTEM_PROMPT = `You are Planit's event-planning assistant. You help the user plan one event by changing its plan with your tools. The app shows the plan next to this chat, so you don't need to repeat it back.

How to work:
- Make the changes the user asks for with the tools, then reply in one to three short sentences saying what you changed. Plain text, no markdown, no emoji.
- Don't write anything before or between tool calls. The user only sees your final reply.
- In replies, write times the way people say them ("7pm", "8:30pm") and dates like "Saturday, October 31".
- Places and activities must be ids from the lists below. If nothing fits what the user wants, say so and suggest the closest options rather than picking one silently.
- choose_places and choose_activities replace the whole list, so include the ids already in the plan that should stay.
- Dates are YYYY-MM-DD and times are 24-hour HH:MM. Work out relative dates ("next Saturday") from today's date, which is given with each message.
- Keep budget items within the total budget when there is one. If they would go over, say so.
- If you need something only the user knows (like the date or the head count) to do what they asked, make the changes you can and ask for the rest in one short question.
- If a tool returns an error, fix the input and try again. Don't tell the user about errors you were able to fix.

Places:
${catalog(PLACE_OPTIONS)}

Activities:
${catalog(ACTIVITY_OPTIONS)}`;

// ── Loop ─────────────────────────────────────────────────────

export type CallModel = (messages: BetaMessageParam[], onText: (delta: string) => void) => Promise<BetaMessage>;

export interface AgentRunInput {
  callModel: CallModel;
  plan: Plan;
  history: BetaMessageParam[]; // earlier exchanges, exactly as returned in `done` events
  userText: string;
  today: string; // YYYY-MM-DD
  emit: (event: AgentEvent) => void;
  maxRounds?: number;
}

export interface AgentRunResult {
  plan: Plan;
  messages: BetaMessageParam[]; // this exchange, to append to the history
  stopReason: string; // the API's stop_reason, or 'max_rounds'
  rounds: number;
  toolCalls: number;
  inputTokens: number; // uncached + cache reads + cache writes
  outputTokens: number;
}

export function userMessage(plan: Plan, userText: string, today: string): BetaMessageParam {
  return {
    role: 'user',
    content: [
      { type: 'text', text: `Today is ${today}. The current plan is:\n${JSON.stringify(plan)}` },
      { type: 'text', text: userText },
    ],
  };
}

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  const { callModel, history, emit, maxRounds = MAX_ROUNDS } = input;
  let plan = input.plan;
  const messages: BetaMessageParam[] = [userMessage(plan, input.userText, input.today)];
  const result = { stopReason: 'max_rounds', rounds: 0, toolCalls: 0, inputTokens: 0, outputTokens: 0 };

  while (result.rounds < maxRounds) {
    if (result.rounds > 0) emit({ type: 'round' });
    result.rounds++;
    const response = await callModel([...history, ...messages], delta => emit({ type: 'text', delta }));

    const { usage } = response;
    result.inputTokens +=
      usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
    result.outputTokens += usage.output_tokens;
    result.stopReason = response.stop_reason ?? 'unknown';

    // A refusal or a max_tokens cut can leave a half-written tool call, so the turn isn't kept
    // (an unanswered tool_use would also make the next request invalid). Earlier rounds still count.
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') break;

    messages.push({ role: 'assistant', content: response.content });
    if (response.stop_reason !== 'tool_use') break;

    const toolUses = response.content.filter((b): b is BetaToolUseBlock => b.type === 'tool_use');
    if (!toolUses.length) break;
    const results: BetaToolResultBlockParam[] = toolUses.map(tool => {
      result.toolCalls++;
      const applied = applyTool(plan, tool.name, (tool.input ?? {}) as Record<string, unknown>);
      if (!applied.ok) return { type: 'tool_result', tool_use_id: tool.id, is_error: true, content: applied.error };
      plan = applied.plan;
      emit({ type: 'plan', plan });
      return { type: 'tool_result', tool_use_id: tool.id, content: `OK. The plan is now:\n${JSON.stringify(plan)}` };
    });
    // All results for one turn go back in a single message
    messages.push({ role: 'user', content: results });
    result.stopReason = 'max_rounds'; // stays this way only if the cap ends the loop here
  }

  return { plan, messages, ...result };
}
