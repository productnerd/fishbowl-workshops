# Fishbowl — Self-Assessment Feature Spec

> One coherent, buildable plan for adding a self-assessment layer to Fishbowl,
> the anonymous workplace peer-feedback app. This synthesizes 11 framework
> designs and 4 architecture investigations into a single implementation spec.
>
> **Status:** draft for build · **Audience:** engineering + design · **Owner:** lead author

---

## 1. Overview & goals

Fishbowl today is a clean single loop: a subject creates a session (name + optional
email + optional context), shares **one** anonymous link, colleagues answer a fixed
22-question survey, and at **5 responses** a DB trigger fires the `fishbowl-ai-insights`
edge function. That function computes every number deterministically and asks Claude
for prose only, caches a `FishbowlReport` JSON, and `Results.tsx` renders it
Spotify-Wrapped style on the riso-paper design system.

This feature adds a **self layer**: the subject can describe themselves, and the report
becomes a **mirror** — how you see yourself, next to how your team sees you. Concretely:

- A **self-assessment** the subject takes privately (Big Five dials + a derived
  MBTI-style type card, plus self-side inputs for several overlay activities).
- **Overlaid report sections** comparing the subject's self-view to the team aggregate
  (Energizers vs Drains, virtues, and several new framework activities).
- An **email magic-link identity** so the subject reaches their private self-assessment
  and gated report from any device, while colleagues stay anonymous and login-less.
- A **partial-unlock report gate**: team-only sections show immediately; sections that
  need the subject's own input render but are **locked** (blur + lock icon) to nudge
  self-assessment. A first-view modal recommends self-assessing first.

### Goals

1. Make the report richer by contrasting self-perception with peer perception.
2. Keep the colleague experience **exactly as fast and anonymous as today** — no extra
   burden, no identity, no length creep beyond the current ~22-item budget.
3. Reuse existing primitives (question model, aggregation, sliders, gauges, the
   deterministic-numbers/AI-prose split, the cache hook, RLS patterns) rather than
   inventing parallel infrastructure.
4. Hold the core invariant absolutely: **respondents are anonymous to the subject;
   their identities never appear in the subject's report.**

### Non-goals

- No Supabase Auth / GoTrue (the project is anon-key only; we mint our own opaque
  bearer secret, mirroring the existing SECURITY DEFINER + service-role edge fn pattern).
- No clinical/validated psychometrics — every framework is framed as a playful mirror,
  not a diagnosis, in both copy and theory tooltips.
- The manager team report (`/manager-report`) is out of scope except where noted.

---

## 2. Key decisions (authoritative)

These are the user's decisions; the rest of the spec honors them exactly.

| # | Decision | Detail |
|---|----------|--------|
| D1 | **Personality** | BOTH — Big Five (OCEAN) trait dials AND a derived MBTI-style 4-letter type card. **Self-assessment only.** Colleagues never answer OCEAN/type items. |
| D2 | **Energizers vs Drains** | **SUBJECT + TEAM**, overlaid — two layers compared in the report. |
| D3 | **Report gate** | **PARTIAL UNLOCK.** Team-only sections show immediately. Self-dependent sections render but are **LOCKED** (background blur + lock icon). |
| D4 | **First-view modal** | On the subject's first "view team report" click without a self-assessment, show a modal: *"We recommend taking the self-assessment first for richer insights"* with two buttons: **"OK, I'll take it now"** and **"Show me the report, I'll do it later."** |
| D5 | **Identity** | **EMAIL MAGIC LINK.** Subject gives an email, gets a private tokened link to self-assess and view their (gated) report from any device. Reuses the pending **Resend** integration (needs `RESEND_API_KEY` + a from-address). |
| D6 | **Colleagues** | Stay **anonymous and login-less.** Unchanged public-by-slug flow at `/s/:slug`. |
| D7 | **Self is optional to start** | The subject can share colleague links immediately; self-assessment is **required to fully unlock** the self-dependent report sections. |
| D8 | **Invariant (unchanged)** | Respondents are anonymous to the subject; their identities never appear in the subject's report; aggregates only surface at ≥5 responses. |

---

## 3. Identity & access (email magic link)

### 3.1 Model

A **subject** is a row in `fishbowl_people` (exists today; `fishbowl_identify(email,name)`
upserts it). A **session** is "claimed" when `fishbowl_sessions.creator_person_id` is set
(column exists today). A magic link is **proof the requester controls that person's email**.

We never use GoTrue. We mint our own opaque secrets and reach the token tables only
through SECURITY DEFINER RPCs / service-role edge functions, exactly like the existing
`fishbowl_people` + `fishbowl_identify` pattern. Token tables store **hashes only**,
never raw tokens.

### 3.2 Two secrets, two lifetimes

| Secret | Stored as | Lifetime | Purpose |
|--------|-----------|----------|---------|
| **Magic link token** | `sha256` in `fishbowl_magic_tokens.token_hash` | 30 min, single-use | The emailed `#/claim/<token>` link. |
| **Subject bearer** | `sha256` in `fishbowl_subject_sessions.secret_hash` | 90 days, sliding | Device-portable credential held in `localStorage`; sent to the gated report fn. |

The bearer is the device bridge that satisfies "from any device" (D5): the emailed
link is short-lived and single-use, but once claimed the browser holds a long-lived
bearer so the subject doesn't re-email every visit.

### 3.3 Token lifecycle

```
CREATE (Create.tsx, unchanged shape)
  └─ subject enters name + optional email → createSession() sets creator_person_id if email given

REQUEST  POST fishbowl-send-magic-link { email, slug? }
  ├─ fishbowl_identify(email) → person_id
  ├─ claim session if creator_person_id is null AND slug supplied in same request (claim-on-first-link)
  ├─ mint raw token (32 random bytes, base64url); store sha256 in fishbowl_magic_tokens (expires now()+30m)
  ├─ send Resend email: link = `${FISHBOWL_APP_URL}#/claim/<token>`
  └─ ALWAYS return { ok: true }  (anti-enumeration; never leak whether the email/session exists)

CLAIM   POST fishbowl-claim-token { token }   (from /claim/:token)
  ├─ look up by sha256(token); reject if expired or consumed
  ├─ set consumed_at (single-use)
  ├─ mint bearer (32 bytes); store sha256 in fishbowl_subject_sessions (expires now()+90d)
  └─ return { bearer, person_id, slug, has_self }
        → client stores { bearer, person_id, slug } under localStorage key `fishbowl_subject_auth`
        → redirect to /self/:slug (self-assess) or /r/:slug (gated report)

USE     POST fishbowl-self-report { bearer, slug }   (every gated read)
  ├─ hash bearer → look up fishbowl_subject_sessions; verify not expired; bump last_seen_at (sliding)
  ├─ resolve person_id; assert session.creator_person_id == person_id (else 403)
  └─ return { teamReport, self|null, hasSelf, responseCount }

SUBMIT  rpc fishbowl_save_self_assessment(p_bearer, p_slug, …)   (SECURITY DEFINER)
  └─ verify bearer→person owns slug; upsert fishbowl_self_assessments; validate caps server-side

REVOKE  delete the person's fishbowl_subject_sessions rows ("sign out everywhere")
```

### 3.4 Edge functions (deno, same skeleton as `fishbowl-team-report`)

| Function | Method / body | Returns | Notes |
|----------|---------------|---------|-------|
| `fishbowl-send-magic-link` | POST `{ email, slug? }` | `{ ok: true }` always | Identify → claim → mint token → Resend email. Anti-enumeration. Secrets: `RESEND_API_KEY`, `FISHBOWL_FROM_EMAIL`, `FISHBOWL_APP_URL`. |
| `fishbowl-claim-token` | POST `{ token }` | `{ bearer, person_id, slug, has_self }` | Validate + consume → mint bearer. |
| `fishbowl-self-report` | POST `{ bearer, slug }` | `{ teamReport, self, hasSelf, responseCount }` | The **only** path that returns self-dependent payload. Verifies the bearer owns the slug. |

`fishbowl-ai-insights` (team report generation) is **unchanged** for gating; it may
later fold self-answers into prose, but the gate does not depend on that.

### 3.5 How public-by-slug becomes gated without breaking colleagues

**Gate by surface, not by tightening shared RLS.** Colleagues and the subject hit
different surfaces:

- **Colleague submit** (`/s/:slug` → `fishbowl_submit_response`): UNCHANGED. Anon,
  inserts to `fishbowl_responses`, bumps count, auto-generates at 5. No bearer.
- **Report view** (`/r/:slug`, `Results.tsx`): today reads `fishbowl_ai_insights`
  directly under the ≥5 RLS policy. **Change:** Results reads via `fishbowl-self-report`
  with the bearer. Keep the existing `fishbowl_ai_insights_select_after_threshold`
  RLS policy as-is (slug is unguessable: 8 chars from a 32-char alphabet; the colleague
  flow never reads insights). **The meaningful gate is that self-dependent sections
  only ship through the bearer-verified edge fn** — someone holding only the slug sees
  team sections, never the OCEAN/MBTI/overlay self payload.

### 3.6 Security properties

- Token tables have **no anon/authenticated RLS policies** — reachable only via
  service-role edge fns / SECURITY DEFINER RPCs (same as `fishbowl_people`).
- Only **hashes** are stored; a DB leak does not yield usable tokens.
- `fishbowl-send-magic-link` always returns `{ ok: true }` (no email/session enumeration).
- Claim-on-first-link only attaches a session whose `creator_person_id` **is null** and
  whose slug is supplied in the same request — one email cannot hijack another person's
  claimed session.
- The anonymity invariant is untouched: respondent authorship lives only in
  `fishbowl_response_authors` (service-role only) and is never joined into anything the
  bearer can read.

---

## 4. Information architecture & routes

There are **two report data sources** but a **single subject-facing surface**: the
personal/self cards are interleaved into the existing `/r/:slug` Wrapped deck, where
self-dependent cards render locked until the subject self-assesses.

### 4.1 Routes (`apps/fishbowl/src/App.tsx`, HashRouter)

| Route | Page | Status | Purpose |
|-------|------|--------|---------|
| `/` | `Landing` | unchanged | — |
| `/create` | `Create` | extended | Adds a 3-zone post-create hub (§7). |
| `/s/:slug` | `Questionnaire` | extended | Colleague survey; new pooled modules (§8). Still anon. |
| `/s/:slug/done` | `Done` | unchanged | — |
| `/r/:slug` | `Results` | extended | Reads via `fishbowl-self-report`; partial-unlock gating + entry modal. |
| `/manager-report` | `ManagerReport` | unchanged | Password-gated team view. |
| **`/claim/:token`** | **`ClaimToken`** (new) | new | Exchanges token → bearer; redirects. |
| **`/self/:slug`** | **`SelfAssessment`** (new) | new | OCEAN dials + derived type card + self-side overlay inputs. |

### 4.2 The two reports

- **Team report** — the existing peer deck. All team-only sections (headline, top
  strengths, ten virtues team layer, competencies, scenarios, appreciations, growth,
  closing) render immediately at ≥5 responses regardless of self-assessment.
- **Personal/self layer** — OCEAN dials, MBTI type card, and the self markers/overlays
  on each comparison activity. These need the subject's own answers and render locked
  until self-assessment.

---

## 5. Data model & migrations

All changes land in **one additive migration** `supabase/fishbowl_self.sql` (applied as
migration `fishbowl_self`), plus edits to questions/edge functions. Everything is
idempotent (`if not exists` / `create or replace`), respects the existing `fishbowl_`
prefix, the RLS-default-deny + SECURITY-DEFINER-RPC pattern, and the ≥5 gate.
Rollback = drop the new tables/RPCs/columns; nothing existing is mutated destructively.

### 5.1 Altered existing table

```sql
alter table public.fishbowl_sessions
  add column if not exists context text,        -- formalize the live ad-hoc col (used by client/seed/edge fn but absent from committed SQL)
  add column if not exists self_means jsonb,     -- subject's OWN per-dimension means; same shape as dimension_means; powers the overlay
  add column if not exists self_completed_at timestamptz;  -- stamped when the subject finishes; drives gating + the Create status pill
```

`creator_person_id` already exists (added in `fishbowl_identity.sql`); no DDL needed,
just populated on claim.

### 5.2 New table — `fishbowl_self_assessments` (one wide row per session)

Self-assessment is optional and answered as a whole, so a single wide JSON row beats
many child tables. **Kept out of `fishbowl_responses`** so it never pollutes the
colleague aggregate or the ≥5 count.

```sql
create table public.fishbowl_self_assessments (
  session_id        uuid primary key references public.fishbowl_sessions(id) on delete cascade,
  person_id         uuid not null references public.fishbowl_people(id),
  -- OCEAN self-Likert answers, keyed by item id (ocean_O1..ocean_N3), 1-5
  ocean_answers     jsonb not null default '{}'::jsonb,
  -- derived dials 0-100 { openness, conscientiousness, extraversion, agreeableness, neuroticism } + emotionalStability
  big_five          jsonb,
  -- derived 4-letter type { type:'ENFP', axes:{EI,SN,TF,JP} } — computed deterministically from big_five
  mbti              jsonb,
  -- self-side inputs for the overlay/self-dependent activities (see §9), namespaced by activity key:
  --   { energizers:{<activityId>:-2..2}, premortem:{text}, hats:{hat_white..hat_blue,wear_more},
  --     johari_self:[adj], via_top5:[slug], belbin:{<role>:chips}, radical_candor:{care_*,challenge_*},
  --     responsibility_tiers:{<respId>:1|2|3} }
  self_payload      jsonb not null default '{}'::jsonb,
  responsibilities  text[] not null default '{}',   -- subject's ≤5 (capped in the RPC); shared with colleagues at survey-build time
  completed         boolean not null default false,  -- true once finished; gates "fully unlocked" sections
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

**RLS:** enable; add **only** a `select` policy `using (true)` (the subject's own
non-identifying self-view, same exposure model as the slug-readable session). **No
insert/update policy** → writes are blocked for anon and happen only through the
SECURITY DEFINER RPC, which enforces token ownership and the ≤5 caps server-side.

### 5.3 New table — `fishbowl_magic_tokens`

```sql
create table public.fishbowl_magic_tokens (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references public.fishbowl_people(id) on delete cascade,
  session_id   uuid not null references public.fishbowl_sessions(id) on delete cascade,
  token_hash   text not null,
  purpose      text not null default 'access',
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index on public.fishbowl_magic_tokens (token_hash);
create index on public.fishbowl_magic_tokens (person_id);
-- RLS enabled, NO anon/authenticated policies (service-role only, like fishbowl_people)
```

### 5.4 New table — `fishbowl_subject_sessions` (device-portable bearer)

```sql
create table public.fishbowl_subject_sessions (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.fishbowl_people(id) on delete cascade,
  secret_hash   text not null,
  expires_at    timestamptz not null,           -- now()+90d, sliding
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index on public.fishbowl_subject_sessions (secret_hash);
-- RLS enabled, service-role only
```

### 5.5 New SECURITY DEFINER RPCs (mirror `fishbowl_identify`)

All `set search_path = public`, `revoke all … from public`, `grant execute … to anon, authenticated`.

- `fishbowl_save_self_assessment(p_bearer text, p_slug text, p_ocean_answers jsonb, p_big_five jsonb, p_mbti jsonb, p_self_payload jsonb, p_responsibilities text[], p_completed boolean) returns void`
  — verify bearer → person owns slug; raise if `array_length(p_responsibilities,1) > 5`
  or `array_length(via_top5,1) > 5` or any allocation sum exceeds its cap; upsert
  `fishbowl_self_assessments`; stamp `self_completed_at` on the session when
  `p_completed` is true.

> The bearer **is** the credential; the RPC is the gate. (Token resolution may instead
> live in the edge functions for symmetry with claim — recommend the RPC to match the
> existing `fishbowl_submit_response` convention. Pick one and keep it consistent.)

### 5.6 Team-side activity answers — extend `fishbowl_responses.answers`, no new table

New team-side activities (energizers, six hats, Belbin, radical candor, VIA, SDT fuel,
Johari, premortem, responsibilities) **ride the existing `answers` jsonb**. Rationale:

1. The ≥5 anonymity RLS gate already protects `answers`; a parallel table would have to
   duplicate it.
2. The edge fn already reads all answers in one `select answers` and looks up by id via
   `val(r, id) = r.answers?.[id] ?? r.answers?.[String(id)]`.
3. `fishbowl_submit_response(p_answers jsonb)` already accepts arbitrary JSON.

**Keying convention.** Numeric ids stay `1..22`; new team items use either numeric ids
`23+` (when they slot into the questionnaire as `Question` rows) or **namespaced string
keys** for structured payloads (arrays/maps), to avoid colliding with numeric ids:

```jsonc
answers = {
  "1": 4, ... "22": "…",          // existing
  "23": "premortem free-text",     // numeric new question
  "energizers": { "<activityId>": -2 },
  "johari_picks": ["bold", "caring"],
  "belbin": { "plant": 4, "shaper": 8 },
  "hats": { "hat_white": 5, "wear_more": "green" },
  "via_top5": ["creativity", "kindness", "humor", "perseverance", "hope"],
  "sdt_fuel": { "autonomy": 4, "competence": 2, "relatedness": 6, "purpose": 3, "safety": 3, "vitality": 2 },
  "radical_candor": { "23": 7, "24": 5 }   // likert items by id
}
```

> **Type change (one):** `Response.answers` widens from `Record<number, string|number>`
> to `Record<number|string, string|number|number[]|string[]|Record<string,number|string>>`
> in `packages/feedback-core/src/types.ts`. Aggregation's numeric lookups are unaffected.

### 5.7 New table — `fishbowl_personal_insights` (separate cache)

Mirrors `fishbowl_ai_insights` **exactly** (same columns, same threshold-gated RLS, read
by a **second instance** of the existing `createUseAiInsights` hook). It is separate, not
a column on the team cache, because its regeneration depends on **self-assessment changes
OR response_count**, not response_count alone.

```sql
create table public.fishbowl_personal_insights (
  session_id                       uuid primary key references public.fishbowl_sessions(id) on delete cascade,
  insights                         jsonb not null,
  response_count_at_generation     int not null,         -- same staleness contract → isStale works unchanged
  self_completed_at_generation     boolean not null default false,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);
-- RLS identical to fishbowl_ai_insights: select gated at response_count >= 5; writes service-role only.
```

> **Simplicity note / open question Q1:** the self-dependent overlay prose can also be
> emitted as **additive keys on the existing `fishbowl_ai_insights.insights` JSON**
> (no new table), since both are read at view time. The separate-table approach is
> cleaner for an independent regeneration trigger; the additive-keys approach is fewer
> moving parts. **Recommendation: additive keys on `fishbowl_ai_insights` for the
> overlay prose; a dedicated table only if a separate trigger proves necessary.** Decide
> before Phase 1 build. The spec below assumes additive keys unless stated.

### 5.8 Aggregates

- `self_means` (on the session) holds the subject's own per-dimension means in the same
  shape as `dimension_means`, enabling the self-vs-team overlay and a future percentile.
- Energizer/drain tallies, Johari quadrants, Belbin shares, etc. are derived at report
  time inside the insights edge fn from the `answers` JSON — they do not need columns.

### 5.9 Triggers

- Keep the existing `fishbowl_sessions_ai_insights_trigger` (fires team generation when
  `response_count` crosses 5).
- Add an **after-insert/update-of-`completed`** trigger on `fishbowl_self_assessments`
  that pg_net-posts to the insights edge fn (so a subject who self-assesses before 5
  colleagues still gets their personal cards; and a re-edit refreshes the overlay).
  Reuse the existing anon-key/pg_net approach in `fishbowl_percentile_and_autogen.sql`
  (and migrate that committed anon key to Vault per the standing TODO).

---

## 6. Gating UX

### 6.1 Section classification

Every Wrapped card declares `source: 'team' | 'self' | 'overlay'`.

- **team** — renders the moment `response_count >= 5`. (Today's behavior.)
- **self** — needs only the subject's own answers (OCEAN dials, MBTI card).
- **overlay** — needs both the team aggregate AND the subject's own answers.

`self` and `overlay` cards always render **structurally** so the subject sees they
exist, but are wrapped in `<LockedCard>` when `hasSelf === false`.

### 6.2 `<LockedCard>` treatment

A new wrapper renders the real card underneath with `blur-sm` / reduced opacity and
`pointer-events-none`, overlaid with a lock chip (🔒 — already the lock motif in
`Results.tsx` and `ManagerReport.tsx`) on a `card-3d` pill and a one-line nudge. Riso:
`border-[2.5px] border-ink`, `shadow-chunky-sm`, pink-deep accent. Tapping routes to
`/self/:slug` (prompting for email → magic link if no bearer is present).

Per-section nudge copy is specified per framework in §9 (e.g. *"Take the 2-min self-read
to reveal your traits + type."*).

### 6.3 First-view entry modal (D4)

On the **first** time a claimed subject opens `/r/:slug` with `hasSelf === false`, show a
centered `EntryModal` (framer-motion scale-in, like the ManagerReport password card):

- **Title:** "We recommend taking the self-assessment first for richer insights."
- **Button A (variant=blue):** "OK, I'll take it now" → routes to `/self/:slug`.
- **Button B (variant=paper):** "Show me the report, I'll do it later" → dismisses,
  sets `localStorage` flag `fishbowl_self_nudge_seen_<slug>` so it shows **once**.

After dismissal, team sections are visible and self/overlay sections stay locked.

### 6.4 UI state machine (`Results.tsx`)

Extends the current loading / missing / under-threshold / writing / ready ladder:

| State | Team (<5) | Team (≥5) |
|-------|-----------|-----------|
| **No self** | Existing "N more colleagues" lock screen **plus** a "take yours now" CTA (self needs no peers). | Full team deck renders; self/overlay cards **locked**; entry modal fires **once**. |
| **Self done** | Self cards (OCEAN, MBTI) render **unlocked & standalone**; team-layer halves show "unlocks at 5". | **Fully unlocked** — every overlay shows both layers; nothing blurred; no modal. |

Magic-link states on `/claim/:token`: valid → store bearer, redirect; expired/invalid →
riso error card with a "resend link" action (re-invokes `fishbowl-send-magic-link`).

---

## 7. Self-assessment & colleague flows

### 7.1 Self-first framing, parallel sharing (D7)

The post-create screen (`Create.tsx`) becomes a **3-zone hub** (no change to the
underlying create call):

- **Zone A — "Take yours first"** (primary, pink): CTA → `/self/:slug`.
  *"Your report is richer when you see yourself first. ~3–4 min."* This is the UI nudge.
- **Zone B — "Share with colleagues"** (always available, parallel): the existing
  `buildShareLink()` copy box + the count/`REQUIRED_RESPONSES` progress Card, untouched.
  The subject can share immediately without self-assessing.
- **Zone C — "See your report"** (appears at `count >= REQUIRED_RESPONSES`): routes to
  `/r/:slug` (now gated).

A `self_status` pill ("Self-assessment: not started / done") reads from
`self_completed_at`.

### 7.2 Self-assessment flow (`SelfAssessment.tsx` at `/self/:slug`)

Mirrors `Questionnaire.tsx` structure (Screen, sticky progress, per-item AnimatePresence,
the existing Button/Card/slider components). It is **self-only** and gated by the bearer.
Order:

1. **Warm intro** — *"A quick read on you — just for your report."*
2. **Responsibilities** (≤5) — captured here so they reach colleagues for the
   Responsibilities and Energizers activities (§9.D, §9.E) without adding friction to the
   public Create page.
3. **Big Five** — 15 self-Likert statements on the existing `LikertScale` (§9.A).
4. **"Computing your type…"** Wrapped beat → reveal the **type card** (§9.A).
5. **Self-side overlay inputs** for the activities that have a self layer (energizers
   swipe-deck, six-hats sliders, Belbin chips, radical-candor sliders, VIA/Johari picks,
   premortem text, responsibility self-tiers) — each is the same control the team sees,
   reworded in first person, and is individually skippable ("Do this later").

Submission → `fishbowl_save_self_assessment` (writes the wide row, stamps
`self_completed_at`, validates caps).

### 7.3 Colleague flow (`Questionnaire.tsx` at `/s/:slug`)

Unchanged contract: anonymous, login-less, one shared link, ≥5 to unlock. New team-side
activity items are added via the **modularization + sampling** strategy in §8 so the
per-respondent count stays flat (~18–22). The live "you vs them" compare nudge stays for
virtue items. Identity stays optional and, if given, is recorded only in
`fishbowl_response_authors` (service-role).

---

## 8. Survey-length / respondent-fatigue strategy

**The core risk:** bolting ~10 activities onto the 22-item colleague survey would roughly
double its length and crater completion. The self-assessment is a separate track, so it
does not tax colleagues — but the new **team-side** activities (energizers team layer,
six hats, Belbin, radical candor, VIA, SDT fuel, Johari, premortem) do.

### 8.1 Target

Keep the colleague survey at a hard **~18–22 items per respondent**. Do not exceed ~22.

### 8.2 Modularization

Refactor `questions.ts` from a flat array into **modules**:

```ts
interface Module {
  id: string
  title: string
  layer: 'self' | 'team' | 'both'
  sampling: 'core' | 'pooled'   // core = every colleague answers; pooled = sampled
  questions: Question[]
}
```

Add `getColleagueSurvey(name, seed)` which assembles **CORE + one or two pooled modules**
deterministically from a seed. Keep `getQuestionsForName` for the self track / back-compat.

- **CORE (every colleague, ~14 items):** the 10 virtue sliders + 3 free-text + 1 anchor
  scenario. (The current 22 minus what moves to the pool.)
- **POOLED (rotating, ~4–6 items shown per respondent):** the 6 competencies (2 packs),
  the 2 remaining scenarios, the energizers team layer, and the new team activities.

### 8.3 Per-respondent sampling

Because the team report **aggregates means and tolerates missing answers**
(`aggregateResponses` filters `undefined`), full coverage across ≥5 responses does **not**
require any single colleague to answer everything. Pull pooled modules by a fresh random
seed at survey-assembly time (colleagues are one-shot anonymous, so a per-load seed
maximizes coverage). Document the floor: pooled-derived sections need ~5 responses to be
usable — which aligns with `REQUIRED_RESPONSES`.

**Recommendation:** sample **2 pooled modules per visit** (raising per-respondent count
toward ~20) so each pooled module reliably gets ≥3 answers across 5 responses. Add a
`getColleagueSurvey` unit check asserting no respondent exceeds ~22 items.

### 8.4 Pacing

Keep the sticky section header + progress bar. Assemble CORE sections in fixed order, then
append the sampled pooled module(s) as their own titled section(s) — coherent sections,
not a random jumble. Keep auto-advance on discrete items; add a soft "halfway" marker to
reduce abandonment.

### 8.5 Activity → survey cost

| Framework | Layer | Sampling | New colleague items |
|-----------|-------|----------|---------------------|
| Aristotelian virtues (exists) | both | core | 0 (10, exists) |
| Competencies (exists) | team | pooled | 0 (6, split 3+3) |
| Scenarios (exists) | team | 1 core + 2 pooled | 0 (3, exists) |
| Free-text (exists) | team | core | 0 (3, exists) |
| Percentile/norms | — | derived | 0 |
| Big Five OCEAN | **self** | self track | 0 |
| MBTI type card | **self** | derived | 0 |
| Energizers vs Drains | both | pooled | ~5–17 (subject's ≤5 + generic 12, tap grid) |
| Six Thinking Hats | both | pooled | 7 (6 sliders + wear-more) |
| Belbin Team Roles | both | pooled | 1 (chip allocator) |
| Radical Candor | both | pooled | 6 (likert) |
| VIA Character Strengths | both | pooled | 1 (deck pick) |
| SDT "What You Fuel" | **team** | pooled | 1 (point allocation) |
| Johari Window | both | pooled | 1 (chip grid) |
| Pre-mortem | both | pooled | 1 (free-text) |
| Responsibilities | both | dynamic | 1–5 screens (only if subject authored) |
| Archetypes | derived | — | 0 (reads existing signals) |

> Not every activity needs to ship. Phase 1 ships the self spine (OCEAN/MBTI) + the
> energizers overlay; later phases add the rest behind sampling so colleague length stays
> flat. See §10.

---

## 9. Per-framework specs

Shared conventions for all frameworks:

- **Reuse the question model.** Most activities reuse existing `QuestionType`s
  (`virtue`, `likert`, `freetext`, `scenario`). Only **two** net-new types are
  introduced where genuinely needed: `budget_allocation` (Belbin) and `allocation`
  (SDT) — both analogous to how `virtue` was added.
- **Self answers** live in `fishbowl_self_assessments` (never in `fishbowl_responses`).
- **Team answers** live in `fishbowl_responses.answers` (anonymous, ≥5 gate).
- **Numbers are deterministic; only prose is AI-generated and cached.**
- **Anonymity invariant:** only aggregates surface; free-text is synthesized, never
  shown verbatim; counts never deanonymize.
- Full canonical content (item banks, role lists, adjective lists) is in **Appendix §12**.

### 9.A Big Five (OCEAN) + MBTI-style Type Card · **self only**

- **Who answers:** the subject only. Colleagues never see OCEAN/type items.
- **Theory hover:** *"The Big Five (OCEAN) is the most empirically validated model in
  personality science — decades of cross-cultural research show its five traits are
  stable and predictive. Your 4-letter type below is a playful Big-Five-to-MBTI
  approximation we generate for fun; it is NOT a real Myers-Briggs result and is not
  clinically validated."*
- **Self mechanic:** 15 first-person agree/disagree statements (3 per trait, one
  reverse-keyed per trait) on the existing `LikertScale` (1–5; lowLabel "Disagree",
  highLabel "Agree"). One warm intro screen, then 5 mini-sections of 3, shown 3-up
  (~2 min). Reverse items scored `6 − raw` silently. After the last item, a
  "computing your type…" beat reveals the type card.
- **Scoring:** trait = mean of its 3 items (1–5) → `(mean − 1) / 4 * 100` = 0–100.
  Neuroticism displayed as **Emotional stability** = `100 − neuroticism`.
- **Type mapping (approximation, omits Neuroticism):** `≥50 → high pole letter`,
  `<50 → low`. Extraversion→E/I, Openness→N/S, Agreeableness→F/T,
  Conscientiousness→J/P. Concatenate **E/I + S/N + T/F + J/P**. Exactly-50 rounds to the
  high-pole letter (E, N, F, J) via a **named constant** (`TYPE_TIE_HIGH_POLE`) so it's
  auditable. All 16 codes are reachable. Derived deterministically in
  `feedback-core` (`deriveType(bigFive)`), shared by client and edge fn.
- **Data shape:** `ocean_answers` keyed `ocean_O1..ocean_N3` (1–5); derived `big_five`
  {openness, conscientiousness, extraversion, agreeableness, neuroticism} 0–100 +
  `emotionalStability`; `mbti` { type, axes:{EI,SN,TF,JP} }. Stored on
  `fishbowl_self_assessments`.
- **Report viz (2 cards, both `self`):**
  1. **Five trait dials** — bipolar dials (reuse VirtueGauge/StatBar look), each labeled
     with both pole names (e.g. Reserved ← • → Outgoing) and a 0–100 marker; Neuroticism
     shown as Emotional stability. One-line blurb per trait.
  2. **Type card** — chunky `card-3d` with the 4-letter LABEL big in Fraunces, the
     nickname, 1-line flavour, 3 signature-trait chips. Footer microcopy: *"A playful
     Big-Five-to-MBTI approximation — fun, not science."* (i) theory tooltip by the title.
- **Self-dependency:** fully self-dependent — both cards are locked (blur + lock) until
  self-assessment. Locked caption: *"Take the 2-min self-read to reveal your traits +
  type."* No team-data fallback.

### 9.B Energizers vs Drains · **subject + team, overlaid** (D2)

- **Who answers:** both. Subject self-tags; colleagues tag the subject.
- **Theory hover:** Buckingham's strengths idea — a strength is an activity that
  *energizes* you (not merely one you're good at); the growth move is to spend more time
  in your energizing zone, not grind on what depletes you. (StandOut / "Go Put Your
  Strengths To Work"; the "loved it / loathed it" diary test.)
- **Scale (identical both sides):** signed integer **−2…+2** — Drains (🪫) / Tires (😮‍💨) /
  Neutral=skip (😐) / Lifts (🙂) / Energizes (⚡). Symmetric so the overlay is a signed diff.
- **Activity list:** the generic **12** (Appendix §12.G) **prepended** with the subject's
  ≤5 responsibilities; if no self-assessment, colleagues see the generic 12 only.
- **Self mechanic:** a "loved it / loathed it" **swipe deck** — one activity card at a
  time, 5 anchors as a segmented pill. Responsibilities first, then the generic 12.
- **Team mechanic:** a fast chip grid — each activity is a chip with a 5-segment pill;
  3rd-person framing ("When you picture {name} at their best…"); "Not sure" → 0.
- **Data shape:** session-stored `activities[]` (built at survey time so self & team see
  an identical ordered list). Self → `self_payload.energizers: Record<activityId, -2..2>`.
  Team → `answers.energizers: Record<activityId, -2..2>`. Aggregated:
  `{ teamMean, teamSigma, n, selfTag|null }` per activity.
- **Report viz (`overlay`):** per activity, a −2…+2 track ("Drains ←→ Energizes") with a
  **self marker (pink)** and a **team marker (pool-blue, with a faint spread band)**.
  Sort by team energize-strength descending. Three callout cards: **Your Spark Zone**
  (both high), **Hidden Battery** (team high, self low/absent), **Quiet Drain** (both
  low, framed gently). One headline stat ("Team agrees on N of your sparks").
- **Self-dependency:** partial. Team layer + Hidden-Battery/Quiet-Drain previews show at
  ≥5. The self marker + Spark-Zone + agreement headline need the self tags → locked until
  self-assessment. Locked caption: *"Take the 2-min self-check to see how your read
  compares to your team's."*

### 9.C Six Thinking Hats — Balance Profile · **subject + team, overlaid**

- **Who answers:** both (team primary, subject for the overlay).
- **Theory hover:** de Bono's six modes of thought (facts, feelings, optimism, caution,
  creativity, process). *Disclaimer:* we adapt them as a "too little / ideal / too much"
  balance lens — de Bono treats hats as modes to wear deliberately, not traits to balance.
- **Mechanic (both):** 6 bipolar **1–9 `virtue` sliders** (scoring `mean-is-best`, 5 =
  ideal), one per hat, reusing VirtueGauge. Plus a single-select **"wear more"** pick
  (team required, self optional): *"Which hat do you wish {name} wore MORE often?"*
- **Data shape:** dimensions `hat_white…hat_blue` (1–9) + `wear_more_hat` (string).
  Self → `self_payload.hats`. Team → `answers.hats`. Aggregation reuses `VirtueResult`
  (μ, σ, tendency, balanceScore = `1 − |μ−5|/4`; balanced band 3.5–6.5). Wear-more tally
  reuses the scenario/mc shape.
- **Report viz:** six bipolar gauges with **two markers** (team solid pool-blue, self
  pink); per-hat delta line when `|self − teamMean| ≥ ~2`; "biggest blind spot" callout =
  largest gap; a "hat they wish you wore more" hero card with vote share.
- **Self-dependency:** partial unlock — gauges + wear-more winner + AI prose show
  immediately at ≥5; the dual-marker overlay, delta lines, blind-spot callout, and
  "you wanted X; they want Y" contrast are locked until self-assessment.

### 9.D Responsibilities & Performance Levels · **subject + team, overlaid**

- **Who answers:** both. Subject authors ≤5 responsibilities + self-tiers; colleagues
  describe + tier each.
- **Theory hover:** a behaviorally-anchored rating scale (BARS) — performance described
  in concrete behaviors at three levels (Underperformed / Met / Exceeded) is more
  actionable and less halo-biased than a 1–10 score; crowd-sourced anchors turn one
  opinion into a shared rubric.
- **Tiers (fixed, always 3):** Underperformed (1, muted) / Met (2, pool-blue, baseline) /
  Exceeded (3, pink, sparkle).
- **Self mechanic:** Part A "List them" (≤5 chunky rows: title ≤60 chars + optional
  "what good looks like" hint ≤120). Part B "Rate yourself" — a 3-stop segmented control
  (ScenarioChoice styling) per authored responsibility; unselected = null.
- **Team mechanic:** one screen per authored responsibility — three guided free-text
  rungs (Underperformed/Met/Exceeded prompts) + one 3-stop tier tap with a 4th escape
  chip "Haven't seen enough" (→ null, excluded from tally). Skipped entirely if the
  subject authored none.
- **Data shape:** `fishbowl_sessions.responsibilities` is **not** where these live — they
  live on `fishbowl_self_assessments.responsibilities` (text[]) **but must reach
  colleagues before any response exists.** Build-time copy: when the subject authors
  responsibilities, also stamp them onto a session-readable field (a
  `session_activities` jsonb or reuse `self_means`-adjacent storage) so the survey can
  render them. Self tiers → `self_payload.responsibility_tiers: Record<respId,1|2|3|null>`.
  Colleague answers ride `answers` under synthetic ids: for responsibility index `k`,
  `base = 200 + (k-1)*10`; `base+1..base+3` = the three free-texts, `base+4` = tier tap
  (1|2|3). Aggregation mirrors `ScenarioResult` (tier tally → mode = teamTier + spread).
- **Report viz:** one swipeable card per responsibility — a vertical 3-rung ladder with
  AI-synthesized team descriptions per tier, a **team marker** on the winning tier (with
  spread hint), and a **self marker** on the subject's self-tier; headline insight on a
  gap ("You see this as Met — your team puts you at Exceeded ✨").
- **Self-dependency:** hybrid. Team rubric + team marker + spread show at ≥5. The self
  marker + gap callout are locked until self-assessment. If the subject authored **no**
  responsibilities, the whole section is omitted (no locked shell).

### 9.E Belbin Team Roles · **subject + team, overlaid**

- **Who answers:** both (team primary; self optional for contrast).
- **Theory hover:** Belbin's nine ways people contribute in a team (Plant, Monitor
  Evaluator, Specialist, Shaper, Implementer, Completer-Finisher, Co-ordinator,
  Teamworker, Resource Investigator), grouped Thinking / Action / People. A widely used
  OD model — a lens, not a clinical test.
- **Mechanic (both):** a **20-chip budget allocator** over 9 role cards (grouped by
  cluster); +/- steppers, sticky budget meter, sum ≤ 20, lopsided/under-spent allowed.
  *"You've got 20 chips to spend on {name}…"* / first-person for self.
- **Net-new type:** `budget_allocation` with `{ budget: 20, roles:[{key,name,cluster,
  short,full,weakness}×9] }`.
- **Data shape:** team → `answers.belbin: Record<roleKey, chips>` (validate sum ≤ 20 and
  each ∈ [0,20] **both client-side and in an edge guard** — RLS allows anon inserts).
  Self → `self_payload.belbin`. Aggregation: `teamShare[role] = teamChips[role] /
  totalChips`.
- **Report viz:** Card 1 (team-only) a ranked/stacked share bar of the 9 roles by chip
  share, cluster-colored, with signature-role tiles + a cluster summary + an AI
  team-composition note. Card 2 (overlay) the same layout with the subject's allocation
  overlaid (pink hatch) + per-role gap markers + an alignment score
  `1 − ½·Σ|self_share − team_share|`.
- **Self-dependency:** Card 1 + composition note show at ≥5. Card 2 (overlay + alignment)
  locked until self-assessment.

### 9.F Radical Candor (Care × Challenge) · **subject + team, overlaid**

- **Who answers:** both. Subject self-rates; colleagues rate the subject.
- **Theory hover:** Kim Scott's 2×2 — Care Personally (y) × Challenge Directly (x).
  Radical Candor is the goal corner; the other three (Ruinous Empathy, Obnoxious
  Aggression, Manipulative Insincerity) are common failure modes. Situational, not a
  fixed trait.
- **Mechanic (both):** 6 `likert` items (1–9, `higher-is-best`), 3 per axis. Axes are the
  `dimension` keys `care_personally` / `challenge_directly`. First-person for self,
  3rd-person ({name}) for team.
- **Data shape:** rides `answers` (likert by id). Self → `self_payload.radical_candor`.
  Per-axis mean (+σ) per layer; quadrant = `(care ≥5 hi/lo) × (challenge ≥5 hi/lo)`.
- **Report viz (`overlay`):** a riso 2×2 plot card; quadrants tinted (top-right = Radical
  Candor, pink). Plot a **team point** (pool-blue, optional σ halo) and a **self point**
  (pink hollow) with a dashed connector; caption names the gap.
- **Self-dependency:** self-dependent for the overlay. Team present + self absent →
  locked (team dot blurred + lock + nudge). Self present + team <5 → show only the self
  dot ("Share your link to see how your team places you"). Both → full overlay.

### 9.G VIA Character Strengths (Top-5 Deck) · **subject + team, overlaid**

- **Who answers:** both. Subject picks their signature 5; colleagues pick the 5 they see.
- **Theory hover:** the VIA Classification (Peterson & Seligman) — 24 character strengths
  under 6 virtues; your "signature strengths" (top ~5) feel most energizing and
  authentic. Taken by 30M+ people.
- **Mechanic (both):** a 24-card deck (virtue color-coded, shuffled per respondent),
  pick **exactly 5** into a tray. Selection order captured silently for a "#1 pick"
  flourish + tie-break.
- **Net-new aggregator (not a type):** frequency tally over 5-slug arrays + per-virtue
  bucketing (does not fit mc/rating/virtue handlers). Team → `answers.via_top5: string[5]`.
  Self → `self_payload.via_top5`.
- **Report viz:** State A (team-only) the team's top-5 fanned out with "% of your team saw
  this." State B (overlay) self vs seen — matched / hidden (self-only) / blind-spot
  (team-only) cards + a 6-segment virtue wheel. State C (team-only) virtue spread.
- **Self-dependency:** States A + C show at ≥5. State B locked until self-pick. Locked:
  *"Take the 60-second self-pick to unlock how your self-view compares to your team's."*

### 9.H What You Fuel (SDT needs profile) · **team only**

- **Who answers:** team only (the subject does NOT self-rate). The report shows what the
  subject gives collaborators. *Note:* still renders locked until the subject does **their
  own** (OCEAN) self-assessment, per D3 — team-only governs who answers, not whether the
  gate applies.
- **Theory hover:** Self-Determination Theory (Deci & Ryan) — three basic needs
  (autonomy, competence, relatedness), extended here with three SDT-adjacent needs
  (purpose, safety, vitality). Flips the lens: what do you leave in colleagues' tanks?
  *The first three are the canonical triad; the latter three are well-supported
  extensions.*
- **Mechanic (team):** **point allocation** — distribute exactly **20 points** across the
  6 needs ("After working with {name}, I feel…"). Steppers + running counter.
- **Net-new type:** `allocation` with `{ totalPoints: 20, buckets:[{key,label,feelStem}×6] }`.
- **Data shape:** `answers["<qid>"]` = JSON map summing to 20. Aggregation:
  `allocationResults { meanPoints, share, sigma, n, ranked }`.
- **Report viz:** a 6-spoke radar/hexagon "fuel fingerprint" (team average per need) + a
  hero stat (top need) + a ranked bar list + a σ "people split on this" insight + an AI
  narrative line. **No self/team overlay** (team-only activity).
- **Self-dependency:** team-sourced → unlocks at ≥5, but the whole report is gated by D3,
  so it renders locked until the subject completes their OCEAN self-assessment. Once
  unlocked it shows the full fuel profile (no missing-self placeholder).

### 9.I Johari Window · **subject + team, overlaid**

- **Who answers:** both. Subject picks adjectives; colleagues pick adjectives for the
  subject.
- **Theory hover:** Luft & Ingham's four panes — Open (both see), Blind Spot (others see,
  you don't), Hidden (you see, they don't), Unknown (neither). A reflective workshop
  framework, not a psychometric test.
- **Mechanic (both):** a multi-select chip grid of the canonical **56 adjectives**
  (Appendix §12.E), shuffled per session, **soft-floor 5 / hard-cap 10** picks, live
  counter. Binary membership (no scale). Self chips pool-blue; colleague chips pink.
- **Data shape:** team → `answers.johari_picks: string[]`. Self →
  `self_payload.johari_self: string[]`. Quadrants derived at view time: `self∩team` →
  Open; `team∖self` → Blind; `self∖team` → Hidden; neither → Unknown. Only **aggregate
  per-adjective counts** ever surface.
- **Report viz:** a 2×2 window (chunky mullions). Open = striped blue+pink; Blind Spot =
  pink chips with count badges (highest-value pane, gentle reveal); Hidden = blue chips;
  Unknown = ghosted/count. One AI blurb per occupied pane.
- **Self-dependency:** self-dependent (the partition needs the self set). Colleague picks
  tally regardless, but the window is locked until self-assessment. With self set but <5
  responses → threshold state ("waiting for N more colleagues"), never partial colleague
  data.

### 9.J Pre-mortem: The 6-Months-From-Now Wall · **subject + team, overlaid**

- **Who answers:** both. One guided free-text each.
- **Theory hover:** Gary Klein's pre-mortem (HBR 2007; prospective hindsight, Mitchell/
  Russo/Pennington 1989) — imagine the failure has *already happened* and explain why;
  ~30% better at naming plausible causes. Constructive, not blaming.
- **Mechanic (both):** ONE guided `freetext` item (no new type). Failure stated in **past
  tense / as certain** (the mechanism — must not soften to "might/could"); asks for **one
  habit** (a recurring pattern), not a list. Tappable sentence-starter chips. Soft
  280–400 char cap.
  - Self prompt: *"It's 6 months from now and you've hit a wall — things didn't go how you
    hoped. What habit of YOURS quietly contributed?"* Helper: *"One pattern, not a one-off.
    This is private to you — colleagues never see it."*
  - Team prompt (id 23, dimension `premortem`, section "In Their Words"): *"Imagine it's
    6 months from now and {name} hit a wall… what habit of theirs quietly contributed?
    Honest, not an attack — they'll never see who said what."*
- **Data shape:** self → `self_payload.premortem.text` (private). Team → `answers["23"]`
  (string, synthesized, never verbatim). AI output: `{ sharedThemes[], overlay{overlap,
  teamOnly, selfOnly}, earlyWarnings[], closing }`.
- **Report viz:** title card; **Shared Risk Themes** (team-only, 2–4 AI-synthesized themes
  with an intensity dot, never verbatim); **the overlay** (headline, self-dependent) — a
  two-layer strip (team-seen blue vs self-aware pink): Overlap = "You already know this",
  Team-only = "Worth a look" (blind spot), Self-only = "Quieter than you think";
  early-warning takeaways (watch-for + countermeasure); warm closing.
- **Self-dependency:** team themes unlock at ≥5. The overlay is locked until the subject's
  one pre-mortem answer. Locked ghost-preview should show blurred shapes + a count of team
  themes waiting, to make the nudge enticing.

### 9.K Your Archetype (Jungian / 12 Brand Archetypes) · **derived (both signals)**

- **Who answers:** nobody new — derived. Reads the subject's Big Five (self) + team-side
  virtue sliders, scenarios, and the energizers/drains overlay (and optionally VIA /
  Six Hats if those ship). Colleagues never see the word "archetype."
- **Theory hover:** the 12 universal characters Mark & Pearson distilled from Jung — the
  Hero, the Sage, the Jester, etc. We read it from how you and your team already answered,
  so the label is earned, not self-claimed. A fun narrative lens, not a diagnosis.
- **Derivation:** at report time, a fixed `ARCHETYPE_SIGNALS` weight map scores each of
  the 12 from normalized signals (virtue μ → `(μ−5)/4` with a per-archetype sign; Big Five
  z-scores; energizer domains add, drains subtract). Blend: self present → `0.5·team +
  0.5·self`; absent → team only. Tie-break: highest score, then strongest single signal.
  Archetype copy lives in a static `ARCHETYPES` constant in `feedback-core`.
- **Report viz (team report, renders immediately):** a big reveal crest + name (Fraunces)
  + {name}-personalized card copy; a "runner-up" line; a "why this came up" expandable
  receipt with each bullet tagged `[team]` / `[you]`; **only** the self-vs-team overlay
  mini-card ("You see X; your team sees Y") is self-dependent.
- **Self-dependency:** soft — the card renders from team signals alone (NOT locked). Self
  adds the Big Five blend + the overlay mini-card. Caveat: confirm VIA/Six Hats actually
  ship before wiring them; the derivation degrades gracefully (weights drop to zero) if
  not.

### 9.x Framework summary

| Framework | Respondent | Reused type / net-new | Overlay? | Locked until self? |
|-----------|-----------|----------------------|----------|--------------------|
| A. Big Five + Type card | self | `likert` + derived | n/a | yes (fully) |
| B. Energizers vs Drains | both | `energizer` tag (−2..2) | yes | self marker only |
| C. Six Thinking Hats | both | `virtue` + select | yes | overlay only |
| D. Responsibilities | both | `freetext` + `scenario`-style tier | yes | self marker only |
| E. Belbin | both | **`budget_allocation`** (new) | yes | Card 2 only |
| F. Radical Candor | both | `likert` | yes | overlay only |
| G. VIA Top-5 | both | deck aggregator (new) | yes | State B only |
| H. SDT What You Fuel | team | **`allocation`** (new) | no | yes (per D3) |
| I. Johari | both | multi-select (`string[]`) | yes | yes (partition) |
| J. Pre-mortem | both | `freetext` | yes | overlay only |
| K. Archetype | derived | none | mini only | no (renders) |

---

## 10. Phased roadmap

### Phase 1 — Foundations + self spine

**Deliverables**
- Migration `fishbowl_self.sql`: `fishbowl_self_assessments`, `fishbowl_magic_tokens`,
  `fishbowl_subject_sessions`; session columns (`context`, `self_means`,
  `self_completed_at`); the SECURITY DEFINER RPC(s); self-assessment trigger.
- Module refactor of `questions.ts` (Modules + `getColleagueSurvey(name, seed)`), with
  CORE unchanged so the colleague flow is behavior-identical for now.
- Big Five module (15 items) + `deriveType(bigFive)` in `feedback-core` (shared).
- Pages: `SelfAssessment.tsx` (`/self/:slug`), `ClaimToken.tsx` (`/claim/:token`).
- Edge fns: `fishbowl-send-magic-link`, `fishbowl-claim-token`, `fishbowl-self-report`;
  wire Resend (`RESEND_API_KEY`, `FISHBOWL_FROM_EMAIL`, `FISHBOWL_APP_URL`).
- Client: `subjectAuth.ts` (localStorage `fishbowl_subject_auth`); data helpers
  `requestMagicLink`, `claimToken`, `getSelfReport`, `submitSelf`.
- Components: `LockedCard.tsx`, `EntryModal.tsx`, `OceanDials.tsx` (trait dials),
  `TypeCard.tsx`.
- `Create.tsx` 3-zone hub + self-status pill; `Results.tsx` reads via
  `fishbowl-self-report` + locked self cards + first-view modal.

**Frameworks landed:** A (Big Five + MBTI). Existing virtues/scenarios/free-text/
percentile become module-wrapped.

**Acceptance criteria**
- Self-assess on `/self/:slug` → `fishbowl_self_assessments` row + `self_completed_at`
  set; OCEAN dials + a 4-letter type render.
- `Results` shows self cards unlocked after self-assess, blurred+locked before; the
  entry modal fires **exactly once** per slug.
- Colleague survey unchanged (CORE content/visual diff is null).
- Magic-link email delivers a working `#/claim/<token>` link that mints a bearer and
  opens self-assess on a **second device**.
- Existing 22-item team flow + report still generate identically.
- Token tables have no anon RLS; tokens stored as hashes; `send-magic-link` returns
  `{ ok: true }` regardless of input.

### Phase 2 — Overlay activities

**Deliverables**
- Energizers/drains: subject swipe-deck (self), team chip grid (pooled), `EnergyOverlay`
  card; `self_means` written alongside `dimension_means`; overlay computed in the insights
  fn.
- Responsibilities capture (≤5) in self-assessment + session-readable copy for colleagues
  + the team rubric ladder + self/team tier overlay.
- Competencies split into 2 pooled packs; 2 scenarios moved to pool; `getColleagueSurvey`
  enforces the ~18–22 cap (sampling 2 pooled modules/visit) with a unit assertion.
- Extend the cached report JSON with the new overlay keys (additive); `LockedCard`-wrap
  all overlay/self cards.

**Frameworks landed:** B (Energizers), D (Responsibilities). (C/E/F/G/I/J added here or in
Phase 3 as bandwidth allows — all behind sampling.)

**Acceptance criteria**
- Across 5 colleague responses each pooled module receives ≥3 answers (seeded simulation).
- No respondent sees >22 items (unit check on `getColleagueSurvey`).
- `aggregateResponses` classifies correctly with partial per-respondent coverage.
- The energizers overlay renders the self marker + team marker and is locked when no
  self-assessment exists; team-only Hidden-Battery/Quiet-Drain previews show at ≥5.
- Manager report unaffected.

### Phase 3 — Remaining frameworks, synthesis & polish

**Deliverables**
- Remaining activities behind sampling: Six Hats (C), Belbin (E, `budget_allocation`),
  Radical Candor (F), VIA (G), SDT What You Fuel (H, `allocation`), Johari (I),
  Pre-mortem (J), Archetype (K, derived).
- A synthesis meta-section: AI prose over self + team + overlay (a "what this all means"
  closing card) that degrades gracefully team-only.
- Report deck pacing/ordering finalized (team-only sections first so something always
  shows; self/overlay interleaved and locked); type-card visual polish; "X colleagues in,
  take yours to unlock N more sections" nudges; regenerate path verified to re-run with
  self data.

**Frameworks landed:** C, E, F, G, H, I, J, K + synthesis — all 11 integrated.

**Acceptance criteria**
- A subject with BOTH self + 5 team responses sees a fully unlocked deck with a synthesis
  card referencing both layers (existing dash-scrub passes).
- A subject with team-only sees team cards unlocked, self/overlay/synthesis locked, modal
  nudge present.
- Regenerate refreshes synthesis when new responses arrive.
- Visual QA against the riso design system (chunky shadows, Fraunces/Hanken intact).
- End-to-end on two devices via magic link.

### Framework → phase mapping

| Framework | Phase |
|-----------|-------|
| A. Big Five (OCEAN) + Type card | 1 |
| B. Energizers vs Drains | 2 |
| D. Responsibilities & Performance Levels | 2 |
| C. Six Thinking Hats | 3 |
| E. Belbin Team Roles | 3 |
| F. Radical Candor | 3 |
| G. VIA Character Strengths | 3 |
| H. SDT What You Fuel | 3 |
| I. Johari Window | 3 |
| J. Pre-mortem | 3 |
| K. Archetype (derived) | 3 |
| Synthesis meta-section | 3 |

---

## 11. Open questions & risks

1. **Resend not yet provisioned (blocker, D5).** `RESEND_API_KEY` + a verified
   `FISHBOWL_FROM_EMAIL` sender domain do not exist yet. Magic-link send/claim is
   buildable but cannot deliver email until both secrets land. Mitigation: a dev fallback
   that returns the claim URL in the response when an `APP_ENV=dev` secret is set.
2. **`FISHBOWL_APP_URL` for the email link.** The hash-router base must be passed to the
   edge fn (it can't read `window.location`). Confirm the deployed Pages URL.
3. **Personal-insights: separate table vs additive keys (§5.7).** Recommend additive keys
   on `fishbowl_ai_insights`; add the dedicated `fishbowl_personal_insights` table only if
   an independent regeneration trigger proves necessary. Decide before Phase 1 build.
4. **MBTI derivation source of truth.** Spec computes the 4-letter type deterministically
   in `feedback-core` (shared by client + edge fn) and stores it denormalized. Confirm
   that vs computing only at report time. Confirm the 4-axis mapping is acceptable as
   "MBTI-style" (it omits Neuroticism) and that the "fun, not science" disclaimer suffices.
5. **`context` column.** Live in prod (client/seed/edge fn) but absent from committed SQL;
   the migration `add column if not exists`. Confirm no dashboard migration already defines
   it (the statement is harmless if redundant).
6. **Claim-on-first-link policy.** Recommend only linking a session whose
   `creator_person_id` is null AND whose slug is supplied in the same request, to prevent
   one email hijacking another person's claimed session. Confirm.
7. **`fishbowl_ai_insights` RLS — keep vs tighten.** Recommend KEEP (slug unguessable; the
   real gate is the bearer-verified self-report fn). If the team report itself should be
   bearer-gated, that's a one-line policy change + routing all reads through
   `fishbowl-self-report`.
8. **Survey-length cap tolerance.** Recommend sampling 2 pooled modules/visit (~20 items)
   so pooled-derived sections clear a usable floor at 5 responses. Confirm ~20 is
   acceptable vs a strict 18; or raise `REQUIRED_RESPONSES` for pooled-derived sections.
9. **Sampling seed.** Recommend a fresh random seed at assembly (colleagues are one-shot
   anonymous) to maximize pool coverage. Confirm vs a stable per-device hash.
10. **`Response.answers` type widening (§5.6).** Confirm widening to allow `string[]` and
    nested maps for the new structured activities (the one net-new type change in
    `feedback-core`).
11. **`self_means` / self-assessment exposure.** These sit on slug-readable rows (same
    trust level as the current report). Confirm the subject's own OCEAN/MBTI/self-view is
    acceptable to expose to anyone holding the slug (consistent with `dimension_means`).
12. **Belbin third cluster color.** Thinking=pool-blue, Action=pink are the brand pair;
    People needs a third riso ink — propose warm yellow/ochre. Confirm.
13. **Net-new types vs fallbacks.** Belbin (`budget_allocation`) and SDT (`allocation`)
    are the only proposed new `QuestionType`s. Six-Likert fallbacks exist for both but lose
    the ipsative "fingerprint" quality. Confirm we add the two types.
14. **Six-Hats balanced band.** Widened to 3.5–6.5 (center = 5 on a 1–9 track) with
    `balanceScore = 1 − |μ−5|/4`. Confirm before shipping.
15. **Johari canonical 56.** A couple of near-synonym variants exist across published
    versions; whichever set is chosen must be the single locked array both self and team
    index against (Appendix §12.E), or quadrant set-math breaks. Confirm the set.
16. **Where team energizers surface.** Assumed the subject's personal `/r/:slug` report
    (the brief says "the report", singular). Confirm whether `ManagerReport` should also
    gain it.
17. **Move the committed anon key to Vault.** The existing pg_net trigger embeds the public
    anon key; the new self-assessment trigger reuses that pattern. Migrate both to Vault
    (standing TODO).

---

## 12. Appendix: full canonical content

### 12.A Big Five traits + sample item bank + Type mapping

**Five OCEAN traits** (0–100; both poles named):

| Trait | Low pole | High pole |
|-------|----------|-----------|
| Openness | Grounded (practical, concrete, proven) | Curious (imaginative, abstract, novelty) |
| Conscientiousness | Easygoing (flexible, spontaneous) | Organized (disciplined, planful) |
| Extraversion | Reserved (quiet, recharges alone) | Outgoing (sociable, expressive) |
| Agreeableness | Frank (direct, skeptical, competitive) | Warm (cooperative, trusting) |
| Neuroticism | Calm (even-keeled, resilient) | Sensitive (reactive). *Reported as Emotional Stability; NOT used in the type mapping.* |

**Item bank — 15 items, agree/disagree 1–5, 3 per trait, one reverse-keyed (R) per trait:**

- **Openness** — O1(+): "I get a kick out of new ideas, even half-baked ones." · O2(+):
  "I'd rather invent a new way than use the proven one." · O3(R): "I prefer the
  tried-and-true over the experimental."
- **Conscientiousness** — C1(+): "I finish what I start, even the boring parts." · C2(+):
  "I like a plan and I like to stick to it." · C3(R): "My desk (and my week) tends toward
  chaos."
- **Extraversion** — E1(+): "A room full of people leaves me energized, not drained." ·
  E2(+): "I think out loud and talk things through." · E3(R): "After a big social day, I
  need to hide and recharge."
- **Agreeableness** — A1(+): "I'd rather find the win-win than win the argument." · A2(+):
  "I give people the benefit of the doubt by default." · A3(R): "I'll bluntly say no when
  something's not worth it."
- **Neuroticism** — N1(+): "Small things can throw off my whole mood." · N2(+): "I replay
  stressful moments long after they pass." · N3(R): "I stay pretty unbothered when plans go
  sideways."

**Scoring:** reverse items = `6 − raw`. Trait = mean of 3 items → `(mean − 1) / 4 * 100`.
Emotional Stability = `100 − Neuroticism`.

**Big-Five → 4-letter type (approximation; omits Neuroticism; `≥50` = high pole,
exactly 50 → high-pole letter via `TYPE_TIE_HIGH_POLE`):**

| Axis | Driven by | High → | Low → |
|------|-----------|--------|-------|
| E/I | Extraversion | E | I |
| S/N | Openness | N (iNtuitive) | S (Sensing) |
| T/F | Agreeableness | F (Feeling) | T (Thinking) |
| J/P | Conscientiousness | J (Judging) | P (Perceiving) |

Concatenate **E/I + S/N + T/F + J/P**. Each card = 4-letter label + nickname + 1-line
flavour + 3 signature traits (from the high pole of each contributing trait). Examples:
ENFP "The Spark" (Outgoing · Curious · Warm); ISTJ "The Bedrock" (Reserved · Grounded ·
Organized); INTP "The Theorist" (Curious · Frank · Easygoing); ESFJ "The Host" (Outgoing ·
Warm · Organized). All 16 codes reachable; flavour + signature generated per code.

### 12.B VIA-24 character strengths (6 virtues)

**Wisdom & Knowledge:** Creativity · Curiosity · Judgment (Open-Mindedness) · Love of
Learning · Perspective.
**Courage:** Bravery · Perseverance · Honesty · Zest.
**Humanity:** Love · Kindness · Social Intelligence.
**Justice:** Teamwork · Fairness · Leadership.
**Temperance:** Forgiveness · Humility · Prudence · Self-Regulation.
**Transcendence:** Appreciation of Beauty & Excellence · Gratitude · Hope · Humor ·
Spirituality.

Store as 24 fixed cards `{ id (slug), name, virtue, oneLineDef }`. The 6-virtue grouping
drives the report's virtue-spread mini-viz.

### 12.C Belbin-9 team roles (3 clusters)

**Thinking ("the brains"):** Plant (PL) · Monitor Evaluator (ME) · Specialist (SP).
**Action ("the doers"):** Shaper (SH) · Implementer (IMP) · Completer-Finisher (CF).
**People ("the glue"):** Co-ordinator (CO) · Teamworker (TW) · Resource Investigator (RI).

Each card carries its canonical one-line description + allowable weakness (e.g. Plant —
"Creative, imaginative, free-thinking; generates ideas." Weakness: ignores details, poor
communicator). Keep the hyphens in "Completer-Finisher" and "Co-ordinator"; include
Specialist (modern 9-role set, not the older 8).

### 12.D Six Thinking Hats (de Bono) — 1–9 bipolar (5 = ideal)

| Hat | Mode | Too little (1) | Ideal (5) | Too much (9) |
|-----|------|----------------|-----------|--------------|
| White | Facts & info | Hand-wavy / ignores data | Grounds talk in real facts | Analysis paralysis |
| Red | Feelings & intuition | Bottles it up | Names the room's mood | Runs on pure gut |
| Yellow | Optimism & value | Sees no upside | Spots the real upside | Rose-tinted / Pollyanna |
| Black | Caution & risks | Skips the risks | Flags real risks early | Shoots it all down |
| Green | Creativity & ideas | Sticks to the known | Opens up new options | Endless ideas, no landing |
| Blue | Process & meta | Lets it sprawl | Keeps thinking on track | Over-controls |

"Wear more" single-select over the same six hats (one-line gloss each) → tallied winner.

### 12.E Johari 56 adjectives (single locked array — see Q15)

able · accepting · adaptable · bold · brave · calm · caring · cheerful · clever · complex ·
confident · dependable · dignified · empathetic · energetic · extroverted · friendly ·
giving · happy · helpful · idealistic · independent · ingenious · intelligent · introverted ·
kind · knowledgeable · logical · loving · mature · modest · nervous · observant · organized ·
patient · powerful · proud · quiet · reflective · relaxed · religious · responsive ·
searching · self-assertive · self-conscious · sensible · sentimental · shy · silly · smart ·
spontaneous · sympathetic · tense · trustworthy · warm · wise.

Quadrants: `self∩team` = Open · `team∖self` = Blind Spot · `self∖team` = Hidden · neither =
Unknown.

### 12.F SDT needs (6: canonical triad + 3 extensions)

| Key | Need | "I feel…" stem | Canonical? |
|-----|------|----------------|------------|
| autonomy | Autonomy | "…free and trusted to do it my own way" | core triad |
| competence | Competence | "…more capable and on top of my game" | core triad |
| relatedness | Relatedness | "…genuinely connected and part of a team" | core triad |
| purpose | Purpose | "…clear on why the work matters" | extension |
| safety | Safety | "…safe to speak up and be honest" | extension |
| vitality | Vitality | "…energized rather than drained" | extension |

20-point allocation across these six ("After working with {name}, I feel…").

### 12.G Energizers vs Drains — generic 12 activities + scale

Scale (signed int): −2 Drains 🪫 · −1 Tires 😮‍💨 · 0 Neutral/skip 😐 · +1 Lifts 🙂 · +2
Energizes ⚡.

1. Talking to people / building relationships (Connector) · 2. Presenting & public
speaking (Influencer) · 3. Deep-focus solo work (Creator) · 4. Planning & organizing ahead
(Organizer) · 5. Firefighting & handling the unexpected (Stimulator) · 6. Mentoring &
developing others (Teacher) · 7. Analysis & working with data (Analyst) · 8. Negotiating &
persuading (Influencer) · 9. Brainstorming & generating new ideas (Creator/Pioneer) ·
10. Detailed execution & finishing things (Provider) · 11. Leading & directing a group
(Leader) · 12. Reflecting, giving & receiving feedback (Advisor).

Subject's ≤5 responsibilities are prepended (`source:'responsibility'`, no zone).

### 12.H 12 Jungian / Brand Archetypes (Mark & Pearson)

**Stability & control:** Innocent · Everyman · Caregiver.
**Risk & achievement:** Hero · Outlaw · Magician.
**Love & belonging:** Lover · Jester · Explorer.
**Structure & legacy:** Creator · Ruler · Sage.

Each has a one-line essence + a {name}-personalized card line (e.g. Sage: *"{name} wants
the truth before the verdict — reads the docs, asks the sharp question, and is usually
right."*). Derived, never asked; copy lives in a static `ARCHETYPES` constant.

### 12.I Radical Candor quadrants (Care × Challenge)

| Quadrant | Care | Challenge | Meaning |
|----------|------|-----------|---------|
| **Radical Candor** (goal) | High | High | Care personally AND challenge directly. |
| **Ruinous Empathy** | High | Low | Care but withhold hard truths (most common failure). |
| **Obnoxious Aggression** | Low | High | Challenge without care ("front-stabbing"). |
| **Manipulative Insincerity** | Low | Low | Neither caring nor candid (worst). |

Axes are independent; measured at the receiving end; situational ("where you tend to
land," not a verdict). Quadrant = `(care ≥5) × (challenge ≥5)` on the 1–9 midpoint of 5.
