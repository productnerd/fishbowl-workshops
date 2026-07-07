# Fishbowl over time: the before/after plan

Status: PLAN ONLY, nothing here is built. For Maria to tear apart.
Date: 7 July 2026

## The goal

People rerun their Fishbowl months later (the report already ends with a "book the
rematch" calendar slide). Three deliverables:

1. **Rerun flow**: identical to today's flow in every way, except the report.
2. **Delta-aware report**: each slide highlights change vs the previous report, produced
   by a specialised AI agent that consumes the old report + old assessments + the new ones.
3. **Progress page**: a separate before/after interface, reached from the dashboard, that
   distills (a) did what the last report flagged actually improve, (b) new problems,
   (c) anything else that changed significantly, and how.

## Principles (carried over from how the product already behaves)

- **If there is nothing to add, add nothing.** No delta chip, no verdict, no narrative
  where the change didn't clear an honesty gate.
- **Numbers are computed deterministically; the AI writes only prose.** Same separation
  the report uses today.
- **Anonymity is untouchable.** Nothing on any surface may make a single responder
  identifiable, which at n=3–9 means aggregates only, always.

---

## 1. What exists today (grounding, verified in code)

- `fishbowl_people` (unique email) + `fishbowl_sessions.creator_person_id` already give us
  a durable person identity. Bearers are **person-scoped** (`fishbowl_subject_sessions`
  stores the hash), so one bearer already unlocks all sessions a person owns. A "chain" of
  fishbowls needs **no new identity system**: it is `sessions where creator_person_id = X
  order by created_at`.
- Old artifacts persist untouched: `fishbowl_ai_insights.insights` (team report JSON,
  stamped `response_count_at_generation`), `fishbowl_self_assessments` (ocean answers,
  self payload, cached `ai_synthesis`), raw `fishbowl_responses`. Everything the delta
  agent needs from round 1 is already stored.
- `fishbowl_response_authors` links responses to people (service-role only) when the
  responder gave an email. This means **responder overlap between rounds is partially
  computable server-side as a count**, without deanonymizing anyone.

Constraints to fix (all confirmed in code):

| # | Constraint | Impact on reruns |
|---|---|---|
| C1 | `localStorage.fishbowl_my_session` is a single slot per browser; Create.tsx blocks a second create on the same device | rerun clobbers nav to the old report |
| C2 | One self-assessment per session (`completed` blocks retake) | fine: a rerun is a NEW session |
| C3 | `dimension_means` stamped once at generation | deltas must diff the two sessions' stamps, never trust a "live" value |
| C4 | Percentile pool is "all sessions at that moment" | round-1 vs round-2 percentiles are not comparable; compare raw stats only |
| C5 | Responders are anonymous and unlinked across rounds (unless email given) | team deltas may be an audience change, not a behaviour change; must be surfaced honestly |

---

## 2. Data model changes (small)

1. `fishbowl_sessions.previous_session_id uuid null` — an explicit chain link, set at
   rerun creation (belt and braces on top of the person-ordered chain; makes intent
   unambiguous if someone runs two concurrent fishbowls).
2. New table `fishbowl_deltas`:
   - `new_session_id uuid pk` (fk sessions), `prev_session_id uuid`,
   - `delta jsonb` (the delta agent's output, contract below),
   - `stats jsonb` (the deterministic delta computation that fed it),
   - `prev_n int`, `new_n int` (cache key: regen when either count changes),
   - `generated_at`.
   Service-role writes; bearer-gated reads (same posture as self data — deltas reveal
   growth-edge content, which is sensitive).
3. Client: `fishbowl_my_session` (single slot) migrates to `fishbowl_my_sessions` (array,
   newest first), read-compatible migration on first load. Fixes C1.

No changes to responses, insights, or self-assessment storage.

## 3. Rerun flow (identical UX, three touchpoints)

1. **Dashboard**: once a session has a completed report, show a "Run it again" card
   (copy: "same mirror, six months later"). It calls `createSession` with the same
   person (email or existing bearer), which sets `previous_session_id`. Everything after
   is byte-for-byte today's flow: fresh slug, fresh link to share, self-assessment,
   colleague survey, same thresholds, same report generation.
2. **Create.tsx**: the "you already have a session" device block becomes "open your
   dashboard OR start a rematch" (two buttons instead of a redirect).
3. **Report**: when `previous_session_id` exists AND the previous session has cached
   insights, the report requests the delta layer (below). If the previous round never
   reached n>=5 (no insights), the chain exists but no deltas are shown anywhere.

Open question for Maria: gate the rematch button by elapsed time (e.g. 90+ days) or
always allow it? My lean: always allow, show a gentle "the mirror works best with a few
months between looks" note under the button.

## 4. The delta agent (`fishbowl-delta` edge function)

**Deterministic stage first (no AI).** Server computes `stats`:
- per-virtue: mu/sigma/tendency then vs now; per-competency averages; hats mu; scenario
  tallies; johari/nohari/via word tallies then vs now; golden score then vs now;
  self-vs-team gap per dimension then vs now; responder counts; responder-overlap count
  where computable (from `response_authors`, count only).
- an **MDC gate** (minimum detectable change) per measure, computed from that team's
  actual sigma and n. Every delta is labelled `cleared` / `below-threshold`. With n=3–9
  the honest threshold is wide; that is a feature, not a bug.

**AI stage second.** claude-opus-4-8 (extended thinking) receives: the old report prose
(insights + synthesis), the old self payload, the new equivalents, and ONLY the
above-threshold stats + verdict candidates. Hard rule in the prompt: no below-threshold
measure may be described as changed (the analyst agent's key insight: filter significance
upstream of the model, or it will confabulate trends from tiny-n noise).

**Output contract (`delta` jsonb):**
```
verdictLine            one blunt opening sentence for the whole period
ledger[]               one row per ask from the OLD report (each growthEdge action,
                       each actionPlan stopNow/startNow item), quoted verbatim, with
                       verdict: kept | partial | missed | no-signal, plus evidence
newFlags[]             max 2; new problems (new nohari word with count>=2, virtue newly
                       in a vice pole, competency drop) each tagged
                       new-signal | new-lens (new-lens when responder composition shifted)
moved[]                other deltas that cleared the gate, both directions, with a
                       team-only corroboration flag (the 70/30 blend means self drift
                       can move a number; team-only column is the honest core)
keel[]                 3-4 things that did NOT move: repeated strengths, recurring
                       appreciation themes. Identity, not stagnation.
glowUp / stubbornSpot  the single biggest genuine improvement and the one edge that
                       refused to move (with a different KIND of tip than last time)
nextContract           2-3 rolled-forward asks + 1-2 new ones = action plan v2
slideDeltas{}          per-slide chips for the report (see 5), keyed by slide sec
honesty                header stats: n then/now, months elapsed, overlap count or
                       "unknown", the computed MDC in plain words
```
Cached in `fishbowl_deltas`, regenerated when either round's response count changes or on
force. Cost: one opus call per rematch report, same order of magnitude as synthesis.

## 5. In-report change highlights

The deck stays the same deck. Each data slide gets an optional, small **delta chip**
(`Slide.delta`), rendered only when `slideDeltas` has an entry for that sec AND it
cleared the gate:

- virtues slide: "candor moved toward the middle since March" chip + a ghost marker on
  the gauge showing the old position
- competencies: small ▲/▼ on bars that cleared the MDC, grey nothing otherwise
- archetype: "same archetype, second season" or "new lead character" line
- letter/appreciations: no chips (warm slides stay warm)
- growth edges / action plan: verdict chips from the ledger (kept/partial/missed)

Visual language: one muted chip style, consistent placement (under the slide kicker), no
per-slide creativity. The report should feel annotated, not redesigned.

## 6. The progress page (`/#/progress/:slug`)

Synthesis of three concept studies (coach / season-recap / analyst). The spine is the
coach's accountability ledger, wearing the recap's warmth, guarded by the analyst's
statistics. Six sections, in order:

1. **The fine print, first.** Compact header: n then vs now, months elapsed, responder
   overlap (count or "unknown"), and the plain-words detection threshold. Publishing the
   bar is what makes every arrow below it trustworthy.
2. **The verdict + promise ledger.** The agent's one-liner, a kept/partial/missed/
   no-signal tally, then one row per ask from last round's report, quoted verbatim, each
   with verdict chip + evidence. This is the page's reason to exist (Maria's priority #1).
3. **New flags.** Max two, tagged new-signal vs new-lens (priority #2). Kept strictly
   separate from the ledger so new problems never read as broken promises.
4. **What else moved.** One slopegraph across all comparable measures: grey lines for
   below-threshold moves, colour only for the handful that cleared the bar; tap to expand
   into self-delta vs team-delta decomposition (priority #3, cherry-picking-proof).
5. **The keel + the glow-up.** What held steady (identity), the single biggest genuine
   improvement, and any new superpower (word tallies are the most robust small-n signal).
   The emotional payoff, earned by sections 1-4.
6. **The next contract.** Action plan v2 + "book the next rematch" (reusing the calendar
   slide mechanics). The loop re-arms.

Dashboard entry: a "Your progress" card appears when a chained previous round with a
report exists. Route is bearer-gated like the report.

## 7. Honesty machinery (the hard part, made explicit)

- **Four-state verdicts** everywhere: improved / worsened / no-detectable-change /
  insufficient-evidence. Abstaining is a first-class outcome.
- **Double lock** for any headline claim (glow-up, new flag): the metric must clear the
  MDC AND the round's free-text must corroborate the direction (the agent checks; if the
  words disagree with the number, the claim degrades to "held steady").
- **Regression to the mean** disclosure on the ledger: last round's flagged items were
  selected for being extreme, so they drift back naturally; the ledger's evidence lines
  must cite team-only corroboration, not just the blended score.
- **70/30 blend awareness**: `moved[]` decomposes self-delta vs team-delta; a change
  driven purely by the self side is labelled as such.
- **New-lens tag**: when responder count or (computable) overlap shifted materially, team
  deltas get the softer framing ("a partly new jury reads you as...").

## 8. Phasing + rough effort

| Phase | Scope | Size |
|---|---|---|
| A | Schema (chain link + deltas table), my_sessions migration, rematch button + create flow | small: 1 migration, 3 client files |
| B | Deterministic delta stats + MDC gate (feedback-core module, mirrored + parity-tested like dimensions/gifs) | medium; fully unit-testable |
| C | `fishbowl-delta` edge function + output contract + caching | medium |
| D | Progress page (6 sections; reuses SelfTeamDumbbell, VirtueGauge, slopegraph is the only new visual) | the biggest UI chunk |
| E | In-report delta chips | small once C exists |

Suggested order A → B → C → D → E; B is testable without any UI, and D can be built
against a fixture delta while C stabilises.

## 9. Open questions for Maria

1. Rematch gating: allow anytime, or nudge-only-after-90-days?
2. When rounds have different survey versions (questions have evolved; e.g. scenario
   sliders replaced picks), the delta stats compare only measures present in BOTH rounds.
   Acceptable, or do we want a mapping shim for renamed/rescaled measures?
3. Share card on the progress page (then/now, scrubbed of anything negative): yes/no?
4. Should colleagues be softly encouraged to leave an email at submit time ("helps us
   measure responder overlap between rounds, never shown to {name}") to strengthen the
   overlap stat?
5. More than 2 rounds: the page compares consecutive rounds only (N vs N-1), with a tiny
   sparkline of golden score across all rounds. Enough for v1?
