-- ============================================================================
-- Fishbowl — live percentile rank fn + auto-generate trigger.
-- Applied via Supabase migration "fishbowl_percentile_and_autogen".
-- ============================================================================

-- ── Live percentile rank (SECURITY DEFINER; never exposes the raw distribution) ──
-- Returns { n_subjects, percentile } for a dimension given the subject's score.
-- percentile = % of completed subjects this subject is at-or-above (so "top X%"
-- = 100 - percentile). For virtues (higher_is_best=false) goodness = balance
-- (closeness to the mean 3); for competencies (true) goodness = the raw score.
-- percentile is null when < 50 subjects, signalling the caller to use the seeded
-- default norm instead.
create or replace function public.fishbowl_dimension_percentile(
  p_dimension text,
  p_score numeric,
  p_higher_is_best boolean
) returns jsonb
language sql
security definer
set search_path = public
as $$
  with vals as (
    select (value::numeric) as m
    from public.fishbowl_sessions s, jsonb_each_text(s.dimension_means)
    where key = p_dimension
      and s.response_count >= 5
      and s.dimension_means is not null
  ),
  scored as (
    select case when p_higher_is_best then m else 1 - abs(m - 3) / 2 end as g from vals
  ),
  me as (
    select case when p_higher_is_best then p_score else 1 - abs(p_score - 3) / 2 end as g
  )
  select jsonb_build_object(
    'n_subjects', (select count(*) from scored),
    'percentile', case
      when (select count(*) from scored) < 50 then null
      else round(100.0 * (select count(*) from scored where g <= (select g from me)) / nullif((select count(*) from scored), 0))
    end
  );
$$;

revoke all on function public.fishbowl_dimension_percentile(text, numeric, boolean) from public;
grant execute on function public.fishbowl_dimension_percentile(text, numeric, boolean) to anon, authenticated;

-- ── Auto-generate the report the moment a session crosses the 5-response gate ──
-- Fires the fishbowl-ai-insights edge function once (fire-and-forget via pg_net).
-- NOTE: anon_key is the PUBLIC anon key (same one shipped in the client bundle),
-- used only as a valid auth header. Move to Supabase Vault later (tracked).
create extension if not exists pg_net;

create or replace function public.fishbowl_trigger_ai_insights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  function_url text := 'https://knftyqkhampkqchoncel.supabase.co/functions/v1/fishbowl-ai-insights';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZnR5cWtoYW1wa3FjaG9uY2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NDg4MzYsImV4cCI6MjA2NzAyNDgzNn0.fugiTRvgoD3YqAZPQMV3R6Eu0Wx_9vgE6ZK8zjqFutg';
begin
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object('session_id', NEW.id::text, 'force', true)
  );
  return NEW;
end;
$$;

drop trigger if exists fishbowl_sessions_ai_insights_trigger on public.fishbowl_sessions;
create trigger fishbowl_sessions_ai_insights_trigger
  after update of response_count on public.fishbowl_sessions
  for each row
  when (OLD.response_count < 5 and NEW.response_count >= 5)
  execute function public.fishbowl_trigger_ai_insights();
