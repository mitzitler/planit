import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase';
import { emptyPlan, normalizePlan, type Plan } from '../shared/plan';

export interface EventRow {
  id: string;
  plan: Plan;
  updatedAt: string;
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

  async get(id: string): Promise<EventRow | null> {
    const { data, error } = await this.supabase.client
      .from('events')
      .select('id, plan, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data && toRow(data);
  }

  async create(): Promise<string> {
    const { data, error } = await this.supabase.client
      .from('events')
      .insert({ plan: emptyPlan() })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
}

function toRow(row: { id: string; plan: Partial<Plan> | null; updated_at: string }): EventRow {
  return { id: row.id, plan: normalizePlan(row.plan), updatedAt: row.updated_at };
}
