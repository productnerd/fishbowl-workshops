# Fishbowl — Report & Question Design (for review)

Corporate peer-feedback app. One person shares an anonymous link; colleagues answer;
at **5 responses** the report unlocks and a Spotify-Wrapped-style reveal is generated.
Content below is the **structure**; the actual question wording is placeholder and will change.

## 1. Question model (additive types in `@fishbowl/feedback-core`)

Superset union (keeps B2C `mc`/`rating`/`freetext`, adds three):

```ts
type QuestionType = 'mc' | 'rating' | 'freetext' | 'likert' | 'scenario' | 'virtue'
type Tendency = 'deficient' | 'balanced' | 'excessive'

interface Question {
  id: number
  dimension: string                 // e.g. 'courage', 'follow_through' — groups answers for the report
  type: QuestionType
  text: string                      // for 'likert' this is the statement
  section: string
  sectionDescription: string
  scoring?: 'mean-is-best' | 'higher-is-best'   // virtue => mean-is-best; competency => higher-is-best
  // likert (1-5 agree/disagree):
  lowLabel?: string                 // 'Strongly disagree'
  highLabel?: string                // 'Strongly agree'
  // scenario (situational MC mapped to a tendency):
  options?: string[]
  optionTendencies?: Record<string, Tendency>
  // virtue (bipolar 1-5; 1 & 5 are vices, 3 is the virtue):
  virtue?: { name: string; deficientPole: string; excessivePole: string }
}
```

## 2. The 10 Aristotelian virtues (seed — bipolar sliders, 3 = the mean)

| dimension | virtue | deficiency (1) | excess (5) |
|---|---|---|---|
| courage | Courage | Timid / avoids risk | Reckless |
| candor | Candor | Evasive / withholds | Brutally blunt |
| confidence | Confidence | Self-deprecating | Arrogant |
| drive | Drive | Complacent | Ruthless |
| composure | Composure | Passive / pushover | Short-fused |
| collaboration | Collaboration | Lone wolf | Can't decide alone |
| rigor | Rigor | Sloppy | Nitpicky / can't ship |
| receptiveness | Receptiveness | Defensive | Spineless / over-accommodating |
| generosity | Generosity | Credit-hoarding | Self-sacrificing to a fault |
| decisiveness | Decisiveness | Indecisive | Impulsive |

## 3. Aggregation → scoring

- **virtue**: collect placements → μ (mean), σ (spread). `tendency`: μ<2.5 deficient · 2.5–3.5 balanced · >3.5 excessive.
  `balanceScore = 1 − |μ−3| / 2` (μ=3 → 1.0; pole → 0). High σ = "people read you very differently" (its own insight).
- **likert** (competency, higher-is-best): average 1–5.
- **scenario**: winner option + tendency tally.
- **freetext**: AI-synthesized themes — **not shown verbatim** (small-team anonymity). See §6.

## 4. Percentiles (live, no AI cost) — two scoring directions

Per dimension, the subject's score is ranked against all completed subjects (sessions ≥5 responses).
- **virtues (mean-is-best)**: rank by `balanceScore`. "You're in the **top 12%** for balanced Candor."
- **competencies (higher-is-best)**: rank by average. "**Top 5%** on follow-through."
- `<50` completed subjects on a dimension → seeded default norm (centered on the virtuous mean); `≥50` → live population only.
- Computed at view time from `fishbowl_sessions.dimension_means` via a SECURITY DEFINER rank function (raw distribution never exposed to the client).

## 5. Report JSON schema (the fixed contract)

The edge function caches the **narrative** (prose); **numbers** (μ, percentile, average) are merged live at view time.

```jsonc
{
  // ── AI-generated, cached by response_count ──
  "headline": "string — the meta-finding across all answers",
  "topStrengths": [ { "dimension": "...", "label": "...", "blurb": "..." } ],   // 3
  "appreciations": [ "synthesized theme 1", "...", "..." ],                      // 3, from freetext
  "virtues": [ { "dimension": "...", "blurb": "one line on where you land & why" } ], // 10
  "growthEdges": [ { "dimension": "...", "title": "≤5 words", "actions": ["≤14 words", "≤14 words"] } ], // 2-3
  "competencyNotes": [ { "dimension": "...", "interpretation": "..." } ],
  "closing": "string — warm sign-off",

  // ── computed live at view time, merged into the above by dimension ──
  "_live": {
    "virtues":      { "<dimension>": { "mu": 3.2, "tendency": "balanced", "balancePercentile": 88 } },
    "competencies": { "<dimension>": { "average": 4.3, "percentile": 95 } }
  }
}
```

Frontend renders Wrapped-style cards (reusing `@fishbowl/wrapped-ui`): opening headline → top-3 strengths
→ virtue gauges (bipolar, mean marked) with percentile → competency bars with percentile → appreciations
→ growth edges (2-bullet) → closing. A new `VirtueGauge`/`VirtueSlider` is the one net-new kit component.

## 6. Anonymity (stronger than B2C)

- Respondent identity never collected or stored (answers only). Reveal threshold = 5.
- **Free-text is AI-synthesized into themes, never shown verbatim** — verbatim quotes can identify a colleague by phrasing in a small team. (B2C shows verbatim; corporate does not.)

## 7. Seed question composition (~22 items, ~5 min)

- 10 virtue sliders (one per virtue above).
- ~6 Likert competency statements (placeholder: follow-through, clarity, ownership, responsiveness, mentoring, prioritization).
- ~3 scenario items (placeholder: handling a missed deadline / disagreement / credit).
- 3 free-text (what they appreciate · one growth area · one message).

## Open decisions for sign-off
1. Dual percentile model (balance for virtues, higher-is-better for competencies) — OK?
2. Free-text synthesized (not verbatim) for anonymity — OK?
3. Report sections in §5 — right set, or add/remove?
4. The 10 virtues — keep as-is for the seed?
