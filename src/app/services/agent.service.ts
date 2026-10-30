import { Injectable, inject } from '@angular/core';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { SupabaseService } from './supabase';
import type { AgentEvent } from '../shared/agent';

// An error from api/agent.ts before the stream starts, with its HTTP status (429 is the daily limit)
export class AgentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Talks to api/agent.ts. The response is one JSON AgentEvent per line, read as it streams in.
@Injectable({ providedIn: 'root' })
export class AgentService {
  private supabase = inject(SupabaseService);

  async *send(eventId: string, message: string, history: BetaMessageParam[]): AsyncGenerator<AgentEvent> {
    const token = this.supabase.currentSession?.access_token;
    if (!token) throw new Error('Log in to use the assistant.');

    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      // The time zone lets the server work out today's date as the user sees it
      body: JSON.stringify({ eventId, message, history, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });

    // Errors before the stream starts come back as { error } with a 4xx/5xx status
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      throw new AgentError(body?.error ?? `The assistant is unavailable (${response.status}).`, response.status);
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // the last piece may be an incomplete line
      for (const line of lines) if (line.trim()) yield JSON.parse(line) as AgentEvent;
    }
    if (buffer.trim()) yield JSON.parse(buffer) as AgentEvent;
  }
}
