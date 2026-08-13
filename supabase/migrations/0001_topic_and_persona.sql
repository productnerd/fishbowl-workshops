-- Workshops P0: give a fishbowl a topic, and a response a persona.
--
-- Scope is deliberately only what the running app needs. The org / cohort / builder
-- tables in docs/workshops-architecture.md belong to P2 and P3 and are not created here,
-- because nothing reads them yet and an unused table is a liability.
--
-- Until this runs, the app carries the topic in the share link and remembers it on the
-- creating device (apps/fishbowl/src/lib/sessionTopic.ts). After it runs, that store
-- becomes a fallback for links created beforehand.

-- Which catalogue topic this fishbowl is for. Nullable, and NULL reads as the default
-- topic, so every session that existed before this migration keeps working untouched.
alter table fishbowl_sessions
  add column if not exists topic_key text;

-- The resolved config, frozen at creation. Without this, a trainer editing a topic while a
-- cohort is mid-flight would change the shape of reports for people already answering.
alter table fishbowl_sessions
  add column if not exists config_snapshot jsonb;

-- Who the respondent is to the subject. v1 stored this inside answers as `_relationship`
-- with values 'work' and 'personal'; those are now simply two persona keys, so the
-- backfill is a straight copy.
alter table fishbowl_responses
  add column if not exists persona text;

update fishbowl_responses
   set persona = answers->>'_relationship'
 where persona is null
   and answers ? '_relationship';

-- Reports read every response for a session and group by persona.
create index if not exists fishbowl_responses_session_persona_idx
  on fishbowl_responses (session_id, persona);

create index if not exists fishbowl_sessions_topic_idx
  on fishbowl_sessions (topic_key);
