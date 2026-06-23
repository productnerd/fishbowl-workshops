-- ============================================================================
-- Fishbowl — identity foundation (teams + notifications), anonymous to subjects.
-- A respondent's identity is NEVER exposed to the person they reviewed: answers
-- stay in fishbowl_responses (readable at >=5), authorship lives in a separate
-- service-role-only table. Applied via migration "fishbowl_identity".
-- ============================================================================

create table if not exists public.fishbowl_people (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.fishbowl_people enable row level security;
-- (no anon policies: access only via the SECURITY DEFINER functions below)

alter table public.fishbowl_sessions add column if not exists creator_person_id uuid references public.fishbowl_people(id);

create table if not exists public.fishbowl_response_authors (
  response_id uuid primary key references public.fishbowl_responses(id) on delete cascade,
  respondent_person_id uuid not null references public.fishbowl_people(id),
  session_id uuid not null references public.fishbowl_sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.fishbowl_response_authors enable row level security;
create index if not exists fishbowl_response_authors_session_idx on public.fishbowl_response_authors(session_id);
create index if not exists fishbowl_response_authors_person_idx on public.fishbowl_response_authors(respondent_person_id);

-- Upsert a person by email, return their id.
create or replace function public.fishbowl_identify(p_email text, p_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare pid uuid;
begin
  insert into public.fishbowl_people (email, display_name)
  values (lower(trim(p_email)), nullif(trim(p_name), ''))
  on conflict (email) do update
    set display_name = coalesce(nullif(trim(p_name), ''), public.fishbowl_people.display_name)
  returning id into pid;
  return pid;
end;
$$;
revoke all on function public.fishbowl_identify(text, text) from public;
grant execute on function public.fishbowl_identify(text, text) to anon, authenticated;

-- Submit a response and (optionally) record its author atomically, keeping the
-- author out of the anon-readable responses table.
create or replace function public.fishbowl_submit_response(
  p_session_id uuid,
  p_answers jsonb,
  p_email text default null,
  p_name text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare rid uuid; pid uuid;
begin
  insert into public.fishbowl_responses (session_id, answers) values (p_session_id, p_answers) returning id into rid;
  if p_email is not null and trim(p_email) <> '' then
    pid := public.fishbowl_identify(p_email, p_name);
    insert into public.fishbowl_response_authors (response_id, respondent_person_id, session_id)
    values (rid, pid, p_session_id);
  end if;
end;
$$;
revoke all on function public.fishbowl_submit_response(uuid, jsonb, text, text) from public;
grant execute on function public.fishbowl_submit_response(uuid, jsonb, text, text) to anon, authenticated;
