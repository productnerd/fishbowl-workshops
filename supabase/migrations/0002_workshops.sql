-- Workshops P2: the trainer layer.
--
-- A trainer is not a new kind of account. They are a row in fishbowl_people, exactly like
-- a subject, reached through the magic-link machinery that already exists. What is new is
-- that a person can OWN workshops.
--
-- A workshop is one run of one topic, for one client, with one invite link. Participants
-- join it without anyone paying; billing reads the meter afterwards.

create table if not exists fb_workshops (
  id uuid primary key default gen_random_uuid(),
  trainer_person_id uuid not null references fishbowl_people(id) on delete cascade,

  name text not null,                 -- "Q3 Leadership Intensive"
  client_name text,                   -- "Acme Corp". Optional: solo trainers often have none.

  -- Which catalogue topic this runs. config_snapshot is the RESOLVED config including the
  -- trainer's customisations, frozen here. Participants read the snapshot, never the live
  -- topic, so editing a workshop cannot reshape a report someone is already answering.
  topic_key text not null,
  config_snapshot jsonb,

  -- What the share link and the QR code encode.
  invite_token text not null unique,

  opens_at timestamptz,
  closes_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fb_workshops_trainer_idx on fb_workshops (trainer_person_id);
create index if not exists fb_workshops_invite_idx on fb_workshops (invite_token);

-- Who joined, and how far they got.
--
-- This is the ONLY thing a trainer sees about an individual: that they joined and whether
-- they finished. Never the report, never an answer. That boundary is the product's trust
-- contract and the reason participants answer honestly, so it is enforced in the read
-- function rather than left to the UI.
create table if not exists fb_workshop_participants (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references fb_workshops(id) on delete cascade,
  session_id uuid references fishbowl_sessions(id) on delete set null,

  -- What the trainer sees on the roster. The participant types it when joining.
  display_name text,

  joined_at timestamptz not null default now(),
  unique (workshop_id, session_id)
);

create index if not exists fb_workshop_participants_workshop_idx
  on fb_workshop_participants (workshop_id);

-- Lets a session find its workshop without a reverse lookup, which the report path needs
-- in order to read config_snapshot.
alter table fishbowl_sessions
  add column if not exists workshop_id uuid references fb_workshops(id) on delete set null;

create index if not exists fishbowl_sessions_workshop_idx on fishbowl_sessions (workshop_id);

-- Both tables are read and written only through edge functions holding the service role,
-- the same pattern as fishbowl_people. No anon access.
alter table fb_workshops enable row level security;
alter table fb_workshop_participants enable row level security;

-- No billing table on purpose. Everything a price needs (reports generated, questions per
-- report, participants per workshop) is derivable by joining participants to sessions to
-- fishbowl_ai_insights, and an unused table that drifts from reality is worse than a join.

-- A trainer signing in for the first time owns no fishbowl of their own, but the magic
-- token table was built assuming every link points at a session. Allow a session-less
-- token so the same magic-link stack can authenticate a trainer.
-- No-op if the column is already nullable.
alter table fishbowl_magic_tokens alter column session_id drop not null;
