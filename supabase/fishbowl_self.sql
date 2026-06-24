-- ============================================================================
-- Fishbowl — self-assessment spine (Phase 1). Additive + idempotent.
-- The subject's self-assessment + their access tokens are PRIVATE: these tables
-- have RLS enabled with NO anon/authenticated policies, so they are reachable
-- ONLY through the service-role edge functions (send-magic-link, claim-token,
-- self-report, save-self). Self-data is therefore never slug-readable.
-- Applied via migration "fishbowl_self".
-- ============================================================================

-- Session columns. `context` is already used by the client/seed/edge fn but was
-- never in committed SQL; formalize it. `self_completed_at` is a non-sensitive
-- flag (drives the Create status pill); the self CONTENT stays bearer-gated.
alter table public.fishbowl_sessions
  add column if not exists context text,
  add column if not exists self_completed_at timestamptz;

-- One wide private row per session. Kept OUT of fishbowl_responses so it never
-- pollutes the anonymous colleague aggregate or the >=5 count.
create table if not exists public.fishbowl_self_assessments (
  session_id        uuid primary key references public.fishbowl_sessions(id) on delete cascade,
  person_id         uuid not null references public.fishbowl_people(id),
  ocean_answers     jsonb not null default '{}'::jsonb,   -- { ocean_O1..ocean_N3: 1-5 }
  big_five          jsonb,                                -- derived 0-100 dials
  mbti              jsonb,                                -- derived { type, nickname, flavour, signature, axes }
  self_payload      jsonb not null default '{}'::jsonb,   -- self-side inputs for later overlay activities
  responsibilities  text[] not null default '{}',         -- subject's <=5 (capped in the edge fn)
  completed         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.fishbowl_self_assessments enable row level security;
-- no anon/authenticated policies: bearer-gated, service-role only.

-- Emailed magic-link tokens (hash only, single-use, short-lived).
create table if not exists public.fishbowl_magic_tokens (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.fishbowl_people(id) on delete cascade,
  session_id   uuid not null references public.fishbowl_sessions(id) on delete cascade,
  token_hash   text not null,
  purpose      text not null default 'access',
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.fishbowl_magic_tokens enable row level security;
create index if not exists fishbowl_magic_tokens_hash_idx on public.fishbowl_magic_tokens(token_hash);
create index if not exists fishbowl_magic_tokens_person_idx on public.fishbowl_magic_tokens(person_id);
-- no anon/authenticated policies: service-role only.

-- Device-portable bearer credential (hash only, 90-day sliding).
create table if not exists public.fishbowl_subject_sessions (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.fishbowl_people(id) on delete cascade,
  secret_hash   text not null,
  expires_at    timestamptz not null,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
alter table public.fishbowl_subject_sessions enable row level security;
create index if not exists fishbowl_subject_sessions_hash_idx on public.fishbowl_subject_sessions(secret_hash);
-- no anon/authenticated policies: service-role only.
