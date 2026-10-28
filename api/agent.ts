// POST /api/agent — runs the planning agent on one of the signed-in user's events.
//
// Request:  Authorization: Bearer <Supabase access token>
//           { eventId, message, history }   (history = earlier `done.messages`, concatenated)
// Response: newline-delimited JSON AgentEvents (src/app/shared/agent.ts), streamed.
//
// Reads and saves the event as the user, so row-level security applies. Only the agent_runs
// log uses the service-role key, because users can't write that table.
//
// Env: ANTHROPIC_KEY (or ANTHROPIC_API_KEY), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import Anthropic from '@anthropic-ai/sdk';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { createClient } from '@supabase/supabase-js';
import { AGENT_MODEL, SYSTEM_PROMPT, runAgent, type AgentEvent, type CallModel } from '../src/app/shared/agent';
import { PLAN_TOOLS, normalizePlan } from '../src/app/shared/plan';

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_BYTES = 200_000; // the whole history is resent (and billed) on every call

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vercel names the key ANTHROPIC_KEY; ANTHROPIC_API_KEY is the SDK's default, used locally
const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_KEY'] ?? process.env['ANTHROPIC_API_KEY'] });
const tools = PLAN_TOOLS as unknown as Anthropic.Beta.BetaTool[];

const callModel: CallModel = async (messages, onText) => {
  const stream = anthropic.beta.messages.stream({
    model: AGENT_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' }, // picking from fixed lists doesn't need deep reasoning
    // A request the safety classifiers decline is retried server-side on the recommended model
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    cache_control: { type: 'ephemeral' }, // caches the prefix, so later rounds re-read it cheaply
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });
  stream.on('text', onText);
  return stream.finalMessage();
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const started = Date.now();
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json(500, { error: 'Server is missing Supabase config.' });

  // ── Who is asking ──
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'Log in to use the assistant.' });

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await db.auth.getUser(token);
  const user = userData.user;
  if (!user) return json(401, { error: 'Your session has expired. Log in again.' });

  // ── What they sent ──
  let body: { eventId?: unknown; message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Body must be JSON.' });
  }
  const { eventId, message, history = [] } = body;
  if (typeof eventId !== 'string' || !UUID.test(eventId)) return json(400, { error: 'eventId must be a UUID.' });
  if (typeof message !== 'string' || !message.trim()) return json(400, { error: 'message is required.' });
  if (message.length > MAX_MESSAGE_CHARS) {
    return json(400, { error: `Keep messages under ${MAX_MESSAGE_CHARS} characters.` });
  }
  if (!Array.isArray(history)) return json(400, { error: 'history must be an array.' });
  if (JSON.stringify(history).length > MAX_HISTORY_BYTES) {
    return json(413, { error: 'This conversation is too long. Reload the page to start a new one.' });
  }

  // ── Their event (RLS returns nothing for someone else's) ──
  const { data: event, error: loadError } = await db.from('events').select('plan').eq('id', eventId).maybeSingle();
  if (loadError) return json(500, { error: 'Could not load the event.' });
  if (!event) return json(404, { error: 'Event not found.' });
  const startPlan = normalizePlan(event.plan);

  // ── Run, streaming events as they happen ──
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'));
      const log: Record<string, unknown> = { user_id: user.id, event_id: eventId, model: AGENT_MODEL };

      try {
        const run = await runAgent({
          callModel,
          plan: startPlan,
          history: history as BetaMessageParam[],
          userText: message.trim(),
          today: new Date().toISOString().slice(0, 10),
          emit,
        });
        Object.assign(log, {
          input_tokens: run.inputTokens,
          output_tokens: run.outputTokens,
          tool_calls: run.toolCalls,
          stop_reason: run.stopReason,
        });

        if (JSON.stringify(run.plan) !== JSON.stringify(startPlan)) {
          const { error } = await db.from('events').update({ plan: run.plan }).eq('id', eventId);
          if (error) throw new Error(`Saving the plan failed: ${error.message}`);
        }

        if (run.stopReason === 'refusal') {
          emit({ type: 'error', error: "The assistant can't help with that request." });
        } else if (run.stopReason === 'max_tokens' || run.stopReason === 'max_rounds') {
          emit({ type: 'error', error: 'The assistant stopped before finishing. Try a smaller request.' });
        }
        emit({ type: 'done', plan: run.plan, messages: run.messages });
      } catch (err) {
        log['error'] = err instanceof Error ? err.message : String(err);
        console.error('agent run failed', err);
        emit({ type: 'error', error: friendlyError(err) });
      } finally {
        log['latency_ms'] = Date.now() - started;
        await logRun(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, log);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return 'The assistant is busy. Try again in a minute.';
  if (err instanceof Anthropic.AuthenticationError) return 'The assistant is not set up correctly.';
  if (err instanceof Anthropic.BadRequestError) return 'The assistant could not read this conversation. Reload the page to start over.';
  if (err instanceof Anthropic.APIError) return 'The assistant is unavailable right now. Try again shortly.';
  return 'Something went wrong. Try again.';
}

async function logRun(url: string, serviceKey: string | undefined, row: Record<string, unknown>) {
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; agent run not logged', row);
    return;
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.from('agent_runs').insert(row);
  if (error) console.error('agent_runs insert failed', error);
}
