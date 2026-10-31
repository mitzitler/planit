-- Planit schema. Run once in the Supabase SQL Editor; safe to re-run.

-- ── events ─────────────────────────────────────────────────────
-- One row per event. `plan` holds the whole Plan object (src/app/shared/plan.ts),
-- written by both the manual wizard and the agent.
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The assistant conversation in API form (api/agent.ts appends each exchange), so it's still there
-- after a reload. Added after the table was created, hence the separate statement.
alter table public.events add column if not exists chat jsonb not null default '[]'::jsonb;

-- The secret in the event's subscribed calendar link (api/calendar.ts). Null until the host makes
-- a link on the Calendar tab; resetting it gives a new value, turning it off sets it back to null.
alter table public.events add column if not exists calendar_token uuid unique;

create index if not exists events_user_id_idx on public.events (user_id);

alter table public.events enable row level security;

-- Each user can only see and change their own events
drop policy if exists "events: owner can select" on public.events;
create policy "events: owner can select" on public.events
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "events: owner can insert" on public.events;
create policy "events: owner can insert" on public.events
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "events: owner can update" on public.events;
create policy "events: owner can update" on public.events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "events: owner can delete" on public.events;
create policy "events: owner can delete" on public.events
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ── agent_runs ─────────────────────────────────────────────────
-- One row per agent request: the rate limit counts these, and cost/latency come from here.
-- Only api/agent.ts writes it, using the service-role key (which bypasses RLS).
-- Users can read their own rows but cannot insert, update or delete, so they can't reset the limit.
create table if not exists public.agent_runs (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  event_id       uuid references public.events (id) on delete set null,
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  tool_calls     integer,
  stop_reason    text,
  latency_ms     integer,
  error          text,
  created_at     timestamptz not null default now()
);

create index if not exists agent_runs_user_created_idx on public.agent_runs (user_id, created_at desc);

alter table public.agent_runs enable row level security;

drop policy if exists "agent_runs: owner can select" on public.agent_runs;
create policy "agent_runs: owner can select" on public.agent_runs
  for select to authenticated using (user_id = (select auth.uid()));
