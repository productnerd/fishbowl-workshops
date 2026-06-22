-- ============================================================================
-- Fishbowl — corporate peer-feedback schema (mirrors tte_, threshold 5).
-- All tables prefixed fishbowl_ to namespace them in the shared SeeHer project.
-- Applied via Supabase migration "fishbowl_schema".
-- ============================================================================

-- ── fishbowl_sessions: one per person collecting feedback ──
create table if not exists public.fishbowl_sessions (
  id uuid primary key default gen_random_uuid(),
  creator_name text not null check (char_length(creator_name) between 1 and 80),
  slug text unique not null check (char_length(slug) between 4 and 20),
  created_at timestamptz not null default now(),
  response_count int not null default 0,
  -- per-dimension subject means, stamped at report time (percentile layer).
  -- Same exposure as the slug-accessible report; the population distribution is
  -- never exposed (that goes through a SECURITY DEFINER rank fn, added later).
  dimension_means jsonb
);
create index if not exists fishbowl_sessions_slug_idx on public.fishbowl_sessions(slug);

-- ── fishbowl_responses: one per colleague who answers (anonymous) ──
create table if not exists public.fishbowl_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.fishbowl_sessions(id) on delete cascade,
  answers jsonb not null,
  completed_at timestamptz not null default now()
);
create index if not exists fishbowl_responses_session_id_idx on public.fishbowl_responses(session_id);

-- ── fishbowl_ai_insights: cached AI report (service_role writes only) ──
create table if not exists public.fishbowl_ai_insights (
  session_id uuid primary key references public.fishbowl_sessions(id) on delete cascade,
  insights jsonb not null,
  response_count_at_generation int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Trigger: auto-increment response_count (client can't fake it) ──
create or replace function public.fishbowl_increment_response_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fishbowl_sessions
  set response_count = response_count + 1
  where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists fishbowl_on_response_insert on public.fishbowl_responses;
create trigger fishbowl_on_response_insert
  after insert on public.fishbowl_responses
  for each row
  execute function public.fishbowl_increment_response_count();

-- ============================================================================
-- ROW LEVEL SECURITY (mirrors tte_)
-- ============================================================================
alter table public.fishbowl_sessions enable row level security;
alter table public.fishbowl_responses enable row level security;
alter table public.fishbowl_ai_insights enable row level security;

drop policy if exists "fishbowl_sessions_insert_anyone" on public.fishbowl_sessions;
create policy "fishbowl_sessions_insert_anyone"
  on public.fishbowl_sessions for insert to anon, authenticated with check (true);

drop policy if exists "fishbowl_sessions_select_anyone" on public.fishbowl_sessions;
create policy "fishbowl_sessions_select_anyone"
  on public.fishbowl_sessions for select to anon, authenticated using (true);

drop policy if exists "fishbowl_responses_insert_anyone" on public.fishbowl_responses;
create policy "fishbowl_responses_insert_anyone"
  on public.fishbowl_responses for insert to anon, authenticated with check (true);

-- Responses only readable once 5+ collected (anonymity threshold).
drop policy if exists "fishbowl_responses_select_after_threshold" on public.fishbowl_responses;
create policy "fishbowl_responses_select_after_threshold"
  on public.fishbowl_responses for select to anon, authenticated
  using (
    exists (
      select 1 from public.fishbowl_sessions s
      where s.id = fishbowl_responses.session_id
      and s.response_count >= 5
    )
  );

-- Cached report readable once 5+ collected (same gate). Writes are service_role only.
drop policy if exists "fishbowl_ai_insights_select_after_threshold" on public.fishbowl_ai_insights;
create policy "fishbowl_ai_insights_select_after_threshold"
  on public.fishbowl_ai_insights for select to anon, authenticated
  using (
    exists (
      select 1 from public.fishbowl_sessions s
      where s.id = fishbowl_ai_insights.session_id
      and s.response_count >= 5
    )
  );
