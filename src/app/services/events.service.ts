import { Injectable, inject } from '@angular/core';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { SupabaseService } from './supabase';
import { applyTool, emptyPlan, normalizePlan, type Plan } from '../shared/plan';

export interface EventRow {
  id: string;
  plan: Plan;
  updatedAt: string;
}

export interface EventWithChat extends EventRow {
  chat: BetaMessageParam[]; // the assistant conversation, as api/agent.ts saved it
  calendarToken: string | null; // the secret in its subscribed calendar link, if the host made one
}

// Reads and writes the `events` table. RLS limits every query to the signed-in user's rows.
@Injectable({ providedIn: 'root' })
export class EventsService {
  private supabase = inject(SupabaseService);

  async list(): Promise<EventRow[]> {
    const { data, error } = await this.supabase.client
      .from('events')
      .select('id, plan, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data.map(toRow);
  }

  async get(id: string): Promise<EventWithChat | null> {
    const { data, error } = await this.supabase.client
      .from('events')
      .select('id, plan, updated_at, chat, calendar_token')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data && {
      ...toRow(data),
      chat: Array.isArray(data.chat) ? data.chat : [],
      calendarToken: data.calendar_token ?? null,
    };
  }

  // The name goes through set_basics, so it's tidied the same way as a rename
  async create(name: string): Promise<string> {
    const named = applyTool(emptyPlan(), 'set_basics', { name });
    if (!named.ok) throw new Error(named.error);
    const { data, error } = await this.supabase.client
      .from('events')
      .insert({ plan: named.plan })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  // Agent run logs are kept; their event_id is cleared by the foreign key
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('events').delete().eq('id', id);
    if (error) throw error;
  }

  async clearChat(id: string): Promise<void> {
    const { error } = await this.supabase.client.from('events').update({ chat: [] }).eq('id', id);
    if (error) throw error;
  }

  // A new token resets the calendar link (old subscriptions stop updating); null turns it off
  async setCalendarToken(id: string, token: string | null): Promise<void> {
    const { error } = await this.supabase.client.from('events').update({ calendar_token: token }).eq('id', id);
    if (error) throw error;
  }

  async savePlan(id: string, plan: Plan): Promise<void> {
    const { error } = await this.supabase.client.from('events').update({ plan }).eq('id', id);
    if (error) throw error;
  }
}

function toRow(row: { id: string; plan: Partial<Plan> | null; updated_at: string }): EventRow {
  return { id: row.id, plan: normalizePlan(row.plan), updatedAt: row.updated_at };
}
