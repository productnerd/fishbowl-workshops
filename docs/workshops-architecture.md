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
| Add free-text questions | Add a new scored question type |
| Choose personas and their question sets | |
| Pick length (quick / standard / extended) | |
| Include, exclude, reorder and retitle slides | |

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

- Every persona carries a `minN` (default 2, and 2 is the floor we should enforce in code, not just
  config).
- Below `minN`, that persona's answers still count toward the pooled team read but never render as their
  own column.
- The report should say so out loud ("not enough manager answers yet to show separately"), because silent
  omission reads as a bug.

This is worth being strict about. In a corporate rollout the first time someone feels identified is the
last time anyone answers honestly.

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
