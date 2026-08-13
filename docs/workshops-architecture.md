# Fishbowl for Workshops: schema and migration spec

Status: draft for review. No code written yet.
Branch: `workshops`. v1 frozen at tag `v1-360-consumer` and still deployed from `claude/fishbowl-monorepo`.

## 1. What we are building

Fishbowl becomes a **catalogue of workshop topics** (leadership, soft skills, resilience, and so on) sold to
trainers and in-house corporate L&D. A trainer runs a cohort, shares a link, and each participant creates
their own fishbowl for that topic. The participant then shares it with people who answer as a **persona**
(boss, peer, report, mentor, parent, partner), replacing today's fixed colleague / friend-family lens.

Today's consumer report becomes **topic #1** in that catalogue, not a separate product.

The engine we already have (survey flow, aggregation, the seven-act report deck, the three AI calls, magic
links, dashboard) is reusable. What changes is that **content stops being code and becomes data**.

## 2. The constraint that shapes everything

Trainers can customise a lot, but customisation must be **compositional, not generative**.

| Trainers CAN | Trainers CANNOT |
|---|---|
| Choose which modules a topic uses | Invent a new scored construct |
| Include, exclude and reorder questions | Define new scoring or aggregation |
| Reword any question | Change what a slide fundamentally plots |
| **Add new items to an extensible module** | Add a new scored question type |
| Add free-text questions | |
| Choose personas and their question sets | |
| Pick length (quick / standard / extended) | |
| Include, exclude, reorder and retitle slides | |

**Extending within a module is safe and is the main customisation trainers will reach for.** A new
statement on the energy map, or another item on a personality trait, works because those modules score
generically over a list of items: the mean does not care how many items there are. That is materially
different from inventing a new construct, which would have no aggregation, no slide and no prompt.
Each module therefore declares whether it is `extensible`.

The reason is structural. Aggregation, every report slide, and all three AI prompts key off known module
ids. A brand new scored construct would have nothing to aggregate it, no slide able to draw it, and no
prompt able to narrate it. Free text is the one safe "new question", because it flows into the AI
narrative without needing to be scored.

**This must be said plainly in sales conversations.** "Customise everything" is not what we are shipping.
"Compose your workshop from our validated modules, and word it your way" is, and it is a stronger promise
anyway because the outputs stay coherent.

## 3. Domain model

```
org ─┬─ members (trainer / admin / owner)
     ├─ topics (custom, usually copied from a Fishbowl template)
     └─ cohorts ── participants ── fishbowl (session) ── responses (by persona)
                                              └── self assessment
                                              └── report (insights + synthesis)
```

- **Org**: a training practice or a company. A solo trainer still gets one.
- **Topic**: the catalogue item. Either a Fishbowl template (`org_id` null) or an org's customised copy.
  A topic is a **saved configuration**, never new code.
- **Module**: a framework unit we own and validate (virtues, thinking hats, Belbin, radical candor, SDT,
  Johari, values, motivation, RIASEC, love languages, conflict, life satisfaction, energizers,
  responsibilities, Big Five / dimensions). Each declares its questions, its scoring, and which slide
  types it can feed.
- **Persona**: who the responder is to the subject. Per topic, with its own question set (defaulting to
  the shared one) and its own minimum-n.
- **Cohort**: one run of one topic by one trainer. Owns seats and the invite link.

## 4. Schema

### Existing tables, extended

| Table | Change |
|---|---|
| `fishbowl_people` | unchanged |
| `fishbowl_subject_sessions`, `fishbowl_magic_tokens` | unchanged |
| `fishbowl_sessions` | add `topic_id`, `cohort_id`, `config_snapshot jsonb` |
| `fishbowl_responses` | add `persona text` (replaces `answers._relationship`) |
| `fishbowl_self_assessments` | unchanged shape; `self_payload` becomes module-keyed |
| `fishbowl_ai_insights` | unchanged mechanism |

`config_snapshot` matters more than it looks. If a trainer edits a topic while a cohort is in flight, the
participants already answering must not have their report change shape underneath them. Freeze the
resolved config onto the session at creation and read it from there forever.

### New tables

```
fb_orgs(id, name, kind['trainer'|'company'], created_at)

fb_org_members(org_id, person_id, role['owner'|'trainer'|'admin'])

fb_modules(key PK, name, description, version, spec jsonb)
  -- Fishbowl-owned. spec = questions, scales, aggregation id, slide types it can feed.

fb_topics(id, org_id NULL, key, name, description, is_template bool,
          based_on_topic_id NULL, status['draft'|'published'|'archived'],
          config jsonb, version, created_at)
  -- org_id NULL  = Fishbowl template
  -- org_id SET   = an org's copy, usually forked from a template

fb_cohorts(id, org_id, topic_id, name, seats_total, seats_used,
           invite_token, opens_at, closes_at, created_at)

fb_cohort_participants(cohort_id, session_id NULL, person_id NULL,
                       invited_email NULL, status['invited'|'started'|'self_done'|'report_ready'])
```

Seats are tracked on the cohort now even though billing comes later, because the participant count is the
thing money will eventually attach to, and retrofitting it is worse than carrying an unused column.

## 5. The topic config

This is the heart of the system. Everything a trainer customises lives here.

```jsonc
{
  "length": "standard",                  // quick | standard | extended
  "selfModules": ["bigfive", "virtues", "hats", "values", "conflict"],
  "modules": [
    { "key": "virtues", "questions": { "exclude": ["rigor"],
                                       "overrides": { "candor": { "text": "..." } } } },
    { "key": "hats" },
    { "key": "candor" }
  ],
  "personas": [
    { "key": "boss",  "label": "My manager", "minN": 2, "questionSet": "default" },
    { "key": "peer",  "label": "A peer",     "minN": 2, "questionSet": "default" },
    { "key": "report","label": "Someone I manage", "minN": 2,
      "questionSet": { "modules": ["virtues", "candor"], "overrides": {} } }
  ],
  "thresholds": { "minResponses": 3, "minPerPersona": 2 },
  "report": {
    "acts": [
      { "key": "team-sees-you", "title": "How the team sees you", "line": "...", "color": "#1366ac",
        "slides": [ { "type": "virtue-gauges", "module": "virtues" },
                    { "type": "candor-plot",   "module": "candor" } ] }
    ]
  }
}
```

A slide entry is valid only if its `module` is enabled and that module declares it can feed that slide
type. The builder enforces this, so a trainer physically cannot compose an unrenderable report.

## 6. Personas and the small-cohort problem

Per-persona breakdowns ("your manager reads your candor as high, your peers do not") are the most
compelling thing we can put in a workshop report. They are also the easiest way to accidentally
de-anonymise someone.

If a participant has exactly one manager and we show a manager-only column, that manager has effectively
signed their answers. So:

- Every persona carries a `minN`, default 2.
- Below `minN`, that persona's answers still count toward the pooled team read but never render as their
  own column.
- The report should say so out loud ("not enough manager answers yet to show separately"), because silent
  omission reads as a bug.

**Decided:** `minN` is a configurable number, not a hard-enforced floor. Maria's call is that a manager
being identifiable in this format is acceptable, since the persona breakdown is the point of the
exercise and these are workshop settings rather than performance reviews. The default stays at 2 so the
safe behaviour is what a trainer gets without thinking about it, and a trainer who wants a single-manager
column can set it to 1 deliberately. Revisit if we sell into performance-review use cases, where the
incentive to identify a respondent is much stronger.

## 7. What has to change in existing code

| Area | Today | Work |
|---|---|---|
| `data/questions.ts` | one fixed array, two-value lens via wording overrides and skip-lists | replaced by module specs resolved from topic config |
| `Results.tsx` | ~1900 lines, every slide hardwired to a framework | slides become a registry keyed by slide type; the deck renders from `config.report.acts` |
| `fishbowl-ai-insights` | prompt names the frameworks | prompt assembled from the enabled modules' fragments |
| `fishbowl-synthesis` | same, plus a fixed output schema | schema and prompt both assembled per topic |
| `fishbowl-workmanual` | fixed stems | stems become part of a module |
| identity | email + device bearer only | net-new: orgs, members, roles, cohorts |

The AI prompt assembly is the subtlest piece. Each module needs to own three fragments: what data to
present, what to say about it, and what its slice of the output schema looks like. The structured-output
work already done helps here, because the schema is already explicit rather than implied by prose.

## 8. Migration, and the proof that the abstraction is right

1. Encode the current modules in `fb_modules`.
2. Seed **topic #1, "How you show up at work"**, whose config reproduces today's exact question set,
   persona set (colleague / friend-family become two personas), thresholds and seven-act report layout.
3. Point the engine at config instead of the hardcoded arrays.
4. **Render `yu3bxtei` from config and diff it against the v1 output.**

Step 4 is the gate. If v1 cannot be reproduced purely as configuration, the module boundaries are wrong,
and we want to discover that in week one rather than after the builder UI exists. Nothing else starts
until that diff is clean.

### Progress: the survey half of the gate is closed

The question-set half is done and pinned by a test.

- `packages/feedback-core/src/topic.ts` holds the config types and `resolveSurvey`.
- `packages/feedback-core/src/topics.ts` holds the module registry and `TOPIC_WORK`.
- `apps/fishbowl/src/data/questions.ts` keeps the question bank; `getSurvey` is now a thin wrapper that
  maps the two lenses onto the two personas and delegates. Every hardcoded constant it used to carry
  (`COLLEAGUE_SKIP`, `WORK_ONLY`, `PERSONAL_TEXT`, `PERSONAL_SECTION`, `COLLEAGUE_ORDER`, the pool sets)
  is now data in `TOPIC_WORK`.
- `__tests__/fixtures/v1-survey.json` was emitted from the **old hardcoded** `getSurvey` before the
  rewrite, so it is a real record of v1 rather than a restatement of the new code. `topic-parity.test.ts`
  checks all twelve combinations of persona, length and responsibilities against it and they match
  exactly, wording included. **Do not regenerate that fixture:** if it fails, the change altered the v1
  survey.

The mapping came out almost one-to-one, which is the encouraging part: v1's constants were already a
single topic's config written as code. One correction fell out of the test rather than review, namely
that responsibilities carries `pool: 'role'` and so is full-only, not core.

### Progress: P1, the catalogue

Three topics ship, and the second and third exist to prove a topic can differ from v1 without new
code: **Leading a team** (four personas, a narrower module set, leadership wording, no quick length)
and **How you come across** (one length, four modules, no picker at all).

- `/topics` is the catalogue. `/create/t/:topicKey` and `/s/:slug/t/:topicKey` carry the topic through
  creation and response, so the share link itself names the topic and any device opening it gets the
  right survey.
- The Questionnaire renders its persona gate and its length options from the topic. Components that
  still speak in v1's two registers read the persona's `voice` rather than its key, which is what lets
  a leadership topic have four personas that all speak at work.
- `getSurvey` is gone. It had no callers left once the Questionnaire called `resolveSurvey` directly.

**The report needed no changes.** `Results.tsx` already guards every framework slide on data presence,
so a topic that omits a module simply renders fewer slides. That was the load-bearing discovery of this
phase: the slide registry is not a prerequisite for a second topic, it is a prerequisite for a trainer
*choosing* slides, which is P3.

Still open on the gate: the **report** half. Slides are still hardwired to frameworks, so step 4's diff
of a rendered report is not yet possible, and no trainer can reorder or drop a slide. That is the next
piece of work and it is the larger half.

### Where it runs

The workshops build is a **separate repo and a separate Pages site**, so v1 cannot be affected:

| | v1 consumer | workshops |
|---|---|---|
| repo | `productnerd/fishbowl` | `productnerd/fishbowl-workshops` |
| branch | `claude/fishbowl-monorepo` | `main` (pushed from local `workshops`) |
| workflow | `deploy-fishbowl.yml` | `deploy-workshops.yml` |
| base | `/fishbowl/` | `/fishbowl-workshops/` |
| url | productnerd.github.io/fishbowl/ | productnerd.github.io/fishbowl-workshops/ |

The workflow was renamed on the workshops branch rather than duplicated, so the new repo has exactly
one deploy workflow and cannot build with v1's base path. Both sites were confirmed live and serving
their own assets after the split, and the existing demo and survey links still resolve.

The deploy runs `npm test`, which includes the v1 parity test, so a config change that silently alters
the original question set fails the deploy instead of shipping.

### Deployed

`fishbowl-ai-insights` and `fishbowl-synthesis` were deployed to `knftyqkhampkqchoncel` on 2026-08-13
with the module-aware prompt assembly and the per-topic framing. **Both products share that Supabase
project**, so the change is live for v1 as well as workshops. Verified by regenerating v1's sample
report (`yu3bxtei`, 9 responses): all 10 virtues and all 6 competencies came back with blurbs and no
empty sections, and the new per-dimension `n` is populated (collaboration reads `n=8` against 9
elsewhere, so it is a genuine per-question count rather than the response total).

Deploying must be done from the project directory. Running from `~` picks up a stray
`~/supabase/config.toml` for an unrelated project that the installed CLI cannot parse.

Still unverified: a report for a topic that omits modules. That needs a leadership fishbowl with three
responses, which does not exist yet. The mechanism is proven (the `n` filter is live and counting); its
effect on a reduced topic is not yet observed end to end.

### Not yet real

Topic persistence. `fishbowl_sessions` has no topic column, so the topic travels in the share link and
is remembered on the creating device. `supabase/migrations/0001_topic_and_persona.sql` adds
`topic_key`, `config_snapshot` and `fishbowl_responses.persona` (backfilling persona from the
`_relationship` v1 already wrote) and has **not been applied**. Until it is, a subject who opens their
dashboard on a different device rebuilds the share link against the default topic.

Per-persona report breakdowns are also not built yet. The data is being captured per persona from now
on, which is the prerequisite, but no slide splits by it.

## 8b. What a report actually costs

Measured from the prompt assembly in `fishbowl-ai-insights`, not estimated. Numeric answers are
aggregated to means and standard deviations **before** the prompt is built. Only free text is passed
through per respondent.

| Variable | Cost impact | Why |
|---|---|---|
| 3 → 33 respondents | negligible, about a cent | numbers collapse to means regardless of n; only free text grows |
| 10 → 50 questions | real, roughly linear | every construct must be narrated, which drives output tokens at 5x the input price |
| 10 → 50 slides | mild | a slide mostly costs one caption; the visuals render client-side from data that already exists |

**Therefore price on length, not on headcount.** Short / standard / extended is a genuine cost tier
(roughly $0.25 to $0.55 per report). Charging per respondent is margin, not cost recovery.

**Pricing rule (agreed, implement later):** a topic includes up to **40 questions**. Every additional
10 questions costs extra. This needs a question counter in the builder that totals the resolved set
per persona, and a hard stop or upsell prompt when a trainer crosses a tier.

**Generation trigger (agreed):** generate the first report when the minimum response count is hit
(default 3, configurable up per topic by the trainer). After that, regenerate lazily: only when the
participant opens the report **and** responses have arrived since the last generation. This is already
exactly how v1 behaves, so only the configurable minimum is new work.

## 9. Phasing

| Phase | Deliverable | Gate |
|---|---|---|
| P0 | Schema, module specs, topic #1 seeded, engine reads config | v1 report reproduced from config |
| P1 | Topic catalogue: pick a topic at creation, per-topic personas | a second, genuinely different topic renders |
| P2 | Trainer + cohort layer, invite links, completion tracking, cohort aggregate view | a trainer can run a cohort end to end |
| P3 | Builder UI: compose modules, reword, reorder, pick slides and length | a trainer creates a custom topic without us |
| P4 | Seats and billing hooks | seats enforced |

P0 is unglamorous and is most of the risk. P3 is what gets demoed, but it is only safe once P0's
boundaries are proven.

## 10. Open questions

1. **Does a participant belong to a cohort forever, or can they keep their fishbowl afterwards?**
   Affects whether reports outlive the cohort and who pays for a regeneration later.
2. **Can one participant do several topics?** If yes, is there a combined view over time? This connects to
   the longitudinal compare idea already parked.
3. **Cost per seat.** A report is roughly $0.55 in AI spend today, and every new response regenerates it.
   For a 30-person cohort with responses trickling in, that could be many regenerations. Recommend
   milestone-based regeneration (see the note in the existing regeneration behaviour) before launch, or it
   quietly erodes margin.
4. **Who owns a custom topic if a trainer leaves the org?**
5. **Do corporate buyers need data residency or deletion guarantees?** Likely yes for EU HR data, and it
   is cheaper to design for now than retrofit.
