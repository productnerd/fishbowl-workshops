-- Auto-generate AI insights as soon as a session reaches 5+ responses,
-- and regenerate whenever a new response arrives afterward.
--
-- This fires the tte-ai-insights Edge Function asynchronously via pg_net
-- whenever tte_sessions.response_count changes and is >= 5. The edge
-- function is idempotent (it checks the cache via response_count_at_generation
-- before calling Claude), so it's safe even if fired redundantly.
--
-- Prerequisites:
--   1. The "pg_net" extension (Supabase: Database → Extensions → enable pg_net)
--   2. The tte-ai-insights edge function deployed
--   3. A Supabase secret / vault entry with the anon key (used only as a
--      valid auth header — the function itself uses its own service role
--      client for DB access).
--
-- Run this in the Supabase SQL editor AFTER deploying the edge function.

create extension if not exists pg_net;

-- Drop prior versions so this script is re-runnable
drop trigger if exists tte_sessions_ai_insights_trigger on public.tte_sessions;
drop function if exists public.tte_trigger_ai_insights();

create or replace function public.tte_trigger_ai_insights()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  function_url text := 'https://knftyqkhampkqchoncel.supabase.co/functions/v1/tte-ai-insights';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZnR5cWtoYW1wa3FjaG9uY2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NDg4MzYsImV4cCI6MjA2NzAyNDgzNn0.fugiTRvgoD3YqAZPQMV3R6Eu0Wx_9vgE6ZK8zjqFutg';
begin
  -- Fire-and-forget: pg_net returns a request id immediately and runs
  -- the HTTP call on a background worker, so it won't block the insert.
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'session_id', NEW.id::text,
      'force', true
    )
  );
  return NEW;
end;
$$;

create trigger tte_sessions_ai_insights_trigger
after update of response_count on public.tte_sessions
for each row
when (
  NEW.response_count >= 5
  and NEW.response_count is distinct from OLD.response_count
)
execute function public.tte_trigger_ai_insights();

-- Back-fill: fire once for any existing session that already has >= 5
-- responses but no cached insights (e.g. frank, created before this trigger).
do $$
declare
  s record;
  function_url text := 'https://knftyqkhampkqchoncel.supabase.co/functions/v1/tte-ai-insights';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZnR5cWtoYW1wa3FjaG9uY2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NDg4MzYsImV4cCI6MjA2NzAyNDgzNn0.fugiTRvgoD3YqAZPQMV3R6Eu0Wx_9vgE6ZK8zjqFutg';
begin
  for s in
    select ts.id
    from public.tte_sessions ts
    left join public.tte_ai_insights ai on ai.session_id = ts.id
    where ts.response_count >= 5
      and (ai.session_id is null or ai.response_count_at_generation < ts.response_count)
  loop
    perform net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'apikey', anon_key
      ),
      body := jsonb_build_object('session_id', s.id::text, 'force', true)
    );
  end loop;
end $$;
