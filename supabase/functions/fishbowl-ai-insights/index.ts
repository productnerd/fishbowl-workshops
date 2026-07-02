// Supabase Edge Function: fishbowl-ai-insights
// Generates the Fishbowl corporate feedback report from a session's responses.
//
// Numbers are computed deterministically here (virtue mu/sigma/tendency,
// competency averages -> dimension_means for the live percentile layer); Claude
// writes ONLY the prose, which we then merge with the numbers. LLMs are bad at
// arithmetic, so we never let the model compute a statistic.
//
// Deploy:
//   supabase functions deploy fishbowl-ai-insights --project-ref knftyqkhampkqchoncel
// Required secret: ANTHROPIC_API_KEY (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY auto-injected).

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const THRESHOLD = 3
const MODEL = 'claude-opus-4-8'

type Tendency = 'deficient' | 'balanced' | 'excessive'
interface Q {
  id: number
  type: 'virtue' | 'likert' | 'scenario' | 'freetext'
  dimension: string
  text: string
  virtue?: { name: string; deficientPole: string; excessivePole: string }
  options?: string[]
  optionTendencies?: Record<string, Tendency>
}

// Mirrors apps/fishbowl/src/data/questions.ts (ids must match).
// 10 virtue sliders (1=deficiency vice, 5=the virtue, 9=excess vice) + 6 competencies
// (1-5 agree, higher is better) + 3 scenarios + 3 free-text.
const QUESTIONS: Q[] = [
  { id: 1, type: 'virtue', dimension: 'courage', text: 'Where does {name} sit on facing risk and hard calls?', virtue: { name: 'Courage', deficientPole: 'Avoids all risk', excessivePole: 'Recklessly bold' } },
  { id: 2, type: 'virtue', dimension: 'candor', text: 'Where does {name} sit on directness?', virtue: { name: 'Candor', deficientPole: 'Evasive', excessivePole: 'Brutally blunt' } },
  { id: 3, type: 'virtue', dimension: 'confidence', text: 'Where does {name} sit on self-assurance?', virtue: { name: 'Confidence', deficientPole: 'Self-deprecating', excessivePole: 'Arrogant' } },
  { id: 4, type: 'virtue', dimension: 'drive', text: 'Where does {name} sit on ambition?', virtue: { name: 'Drive', deficientPole: 'Complacent', excessivePole: 'Ruthless' } },
  { id: 5, type: 'virtue', dimension: 'composure', text: 'Where does {name} sit under pressure?', virtue: { name: 'Composure', deficientPole: 'Pushover', excessivePole: 'Short-fused' } },
  { id: 6, type: 'virtue', dimension: 'collaboration', text: 'Where does {name} sit on working with others?', virtue: { name: 'Collaboration', deficientPole: 'Lone wolf', excessivePole: 'Cannot decide alone' } },
  { id: 7, type: 'virtue', dimension: 'rigor', text: 'Where does {name} sit on attention to detail?', virtue: { name: 'Rigor', deficientPole: 'Sloppy', excessivePole: 'Nitpicky, cannot ship' } },
  { id: 8, type: 'virtue', dimension: 'receptiveness', text: 'Where does {name} sit on taking input?', virtue: { name: 'Receptiveness', deficientPole: 'Defensive', excessivePole: 'Over-accommodating' } },
  { id: 9, type: 'virtue', dimension: 'generosity', text: 'Where does {name} sit on sharing credit and helping?', virtue: { name: 'Generosity', deficientPole: 'Credit-hoarding', excessivePole: 'Self-sacrificing to a fault' } },
  { id: 10, type: 'virtue', dimension: 'decisiveness', text: 'Where does {name} sit on making decisions?', virtue: { name: 'Decisiveness', deficientPole: 'Indecisive', excessivePole: 'Impulsive' } },
  { id: 11, type: 'likert', dimension: 'follow_through', text: '{name} reliably delivers on what they commit to.' },
  { id: 12, type: 'likert', dimension: 'clarity', text: '{name} communicates clearly and concisely.' },
  { id: 13, type: 'likert', dimension: 'ownership', text: '{name} takes ownership when things go wrong.' },
  { id: 14, type: 'likert', dimension: 'responsiveness', text: '{name} is responsive and easy to reach when needed.' },
  { id: 15, type: 'likert', dimension: 'mentoring', text: '{name} helps others grow and shares knowledge generously.' },
  { id: 16, type: 'likert', dimension: 'prioritization', text: '{name} focuses on what matters most.' },
  { id: 17, type: 'scenario', dimension: 'conflict_style', text: "When {name} disagrees with a teammate's approach, they usually...", options: ['Avoid it and let it slide', 'Raise it directly and hear them out', 'Push hard until they win'], optionTendencies: { 'Avoid it and let it slide': 'deficient', 'Raise it directly and hear them out': 'balanced', 'Push hard until they win': 'excessive' } },
  { id: 18, type: 'scenario', dimension: 'deadline_style', text: 'Facing a slipping deadline, {name} tends to...', options: ['Quietly hope it works out', 'Flag it early and re-plan', 'Pull all-nighters and burn out'], optionTendencies: { 'Quietly hope it works out': 'deficient', 'Flag it early and re-plan': 'balanced', 'Pull all-nighters and burn out': 'excessive' } },
  { id: 19, type: 'scenario', dimension: 'feedback_style', text: 'Given critical feedback, {name}...', options: ['Gets defensive', 'Considers it and adjusts', 'Over-corrects and loses their own view'], optionTendencies: { 'Gets defensive': 'deficient', 'Considers it and adjusts': 'balanced', 'Over-corrects and loses their own view': 'excessive' } },
  { id: 20, type: 'freetext', dimension: 'appreciation', text: 'What do you most appreciate about working with {name}?' },
  { id: 21, type: 'freetext', dimension: 'growth', text: 'What is one thing that would make {name} even more effective?' },
  { id: 22, type: 'freetext', dimension: 'message', text: 'If {name} could read one thing from this feedback, what should it be?' },
]

const VIRTUES = QUESTIONS.filter((q) => q.type === 'virtue')
const COMPETENCIES = QUESTIONS.filter((q) => q.type === 'likert')
const SCENARIOS = QUESTIONS.filter((q) => q.type === 'scenario')
const FREETEXT = QUESTIONS.filter((q) => q.type === 'freetext')

// Energizers vs Drains — mirrors packages/feedback-core/src/energizers.ts (ids must match).
const ENERGIZER_ACTIVITIES = [
  { id: 'connect', label: 'Talking to people & building relationships' },
  { id: 'present', label: 'Presenting & public speaking' },
  { id: 'deepwork', label: 'Deep-focus solo work' },
  { id: 'plan', label: 'Planning & organizing ahead' },
  { id: 'firefight', label: 'Firefighting & the unexpected' },
  { id: 'mentor', label: 'Mentoring & developing others' },
  { id: 'analyze', label: 'Analysis & working with data' },
  { id: 'negotiate', label: 'Negotiating & persuading' },
  { id: 'ideate', label: 'Brainstorming & new ideas' },
  { id: 'execute', label: 'Detailed execution & finishing things' },
  { id: 'lead', label: 'Leading & directing a group' },
  { id: 'reflect', label: 'Giving & receiving feedback' },
]

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const stdDev = (xs: number[]) => {
  if (!xs.length) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
}
const classifyTendency = (mu: number): Tendency => (mu < 4 ? 'deficient' : mu <= 6 ? 'balanced' : 'excessive')
const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const session_id: string | undefined = body.session_id
    const force: boolean = !!body.force
    if (!session_id) {
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: jsonHeaders })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: session, error: sessionErr } = await supabase
      .from('fishbowl_sessions')
      .select('id, creator_name, response_count, context, responsibilities')
      .eq('id', session_id)
      .single()
    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: 'session not found' }), { status: 404, headers: jsonHeaders })
    }
    if ((session.response_count || 0) < THRESHOLD) {
      return new Response(JSON.stringify({ error: 'not enough responses' }), { status: 403, headers: jsonHeaders })
    }

    if (!force) {
      const { data: cached } = await supabase
        .from('fishbowl_ai_insights')
        .select('insights, response_count_at_generation')
        .eq('session_id', session_id)
        .maybeSingle()
      if (cached && cached.response_count_at_generation === session.response_count) {
        return new Response(JSON.stringify({ insights: cached.insights, cached: true }), { headers: jsonHeaders })
      }
    }

    const { data: responses, error: respErr } = await supabase
      .from('fishbowl_responses')
      .select('answers')
      .eq('session_id', session_id)
    if (respErr || !responses || responses.length === 0) {
      return new Response(JSON.stringify({ error: 'no responses' }), { status: 404, headers: jsonHeaders })
    }

    const name = session.creator_name
    const workContext = session.context ? String(session.context).trim() : ''
    const val = (r: any, id: number) => r.answers?.[id] ?? r.answers?.[String(id)]

    // ── Deterministic aggregation ──
    const dimensionMeans: Record<string, number> = {}

    const virtueStats = VIRTUES.map((q) => {
      const scores = responses.map((r: any) => Number(val(r, q.id))).filter((n: number) => n >= 1 && n <= 9)
      const mu = scores.length ? mean(scores) : 5
      dimensionMeans[q.dimension] = round(mu)
      return { dimension: q.dimension, name: q.virtue!.name, deficientPole: q.virtue!.deficientPole, excessivePole: q.virtue!.excessivePole, mu: round(mu), sigma: round(stdDev(scores)), tendency: classifyTendency(mu), balanceScore: round(1 - Math.abs(mu - 5) / 4, 3) }
    })

    const competencyStats = COMPETENCIES.map((q) => {
      const scores = responses.map((r: any) => Number(val(r, q.id))).filter((n: number) => n >= 1 && n <= 5)
      const avg = scores.length ? mean(scores) : 0
      dimensionMeans[q.dimension] = round(avg)
      return { dimension: q.dimension, statement: q.text.replace(/\{name\}/g, name), average: round(avg, 1) }
    })

    const scenarioStats = SCENARIOS.map((q) => {
      const tally: Record<Tendency, number> = { deficient: 0, balanced: 0, excessive: 0 }
      const counts: Record<string, number> = {}
      for (const r of responses as any[]) {
        const v = val(r, q.id)
        if (typeof v !== 'string' || !v) continue
        counts[v] = (counts[v] || 0) + 1
        const t = q.optionTendencies?.[v]
        if (t) tally[t]++
      }
      const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      return { dimension: q.dimension, prompt: q.text.replace(/\{name\}/g, name), winner, tally }
    })

    const freetext = FREETEXT.map((q) => ({
      dimension: q.dimension,
      prompt: q.text.replace(/\{name\}/g, name),
      answers: (responses as any[]).map((r) => val(r, q.id)).filter((v) => typeof v === 'string' && v.trim()),
    }))

    // Energizers vs Drains — team mean per activity (-2..2). Deterministic, no AI.
    const energizerStats = ENERGIZER_ACTIVITIES.map((a) => {
      const vals = (responses as any[])
        .map((r) => (r.answers?.energizers || {})[a.id])
        .filter((n: any) => typeof n === 'number' && n >= -2 && n <= 2)
      return { id: a.id, label: a.label, teamMean: vals.length ? round(mean(vals), 2) : 0, n: vals.length }
    })

    // Responsibilities — team modal tier (1=under, 2=meets, 3=exceeds) per responsibility.
    const sessionResp: string[] = Array.isArray(session.responsibilities) ? session.responsibilities : []
    const responsibilityStats = sessionResp.map((label: string, index: number) => {
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
      let n = 0
      for (const r of responses as any[]) {
        const v = (r.answers?.responsibility_tiers || {})[String(index)]
        if (typeof v === 'number' && v >= 1 && v <= 3) {
          counts[v]++
          n++
        }
      }
      const teamTier = n ? Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) : 2
      return { index, label, teamTier, n }
    })
    // Verbatim colleague notes per responsibility (synthesized by the AI, never shown raw).
    const responsibilityNotes = sessionResp.map((_label: string, index: number) =>
      (responses as any[])
        .map((r) => (r.answers?.responsibility_notes || {})[String(index)])
        .filter((t: any) => typeof t === 'string' && t.trim())
    )

    // ── Phase 3 frameworks — deterministic, key-agnostic aggregation ──
    const R = responses as any[]
    // Six Hats: mean 1-9 per hat key present.
    const hatKeys = new Set<string>()
    for (const r of R) for (const k of Object.keys(r.answers?.hats || {})) hatKeys.add(k)
    const hatsStats = [...hatKeys].map((key) => {
      const vals = R.map((r) => (r.answers?.hats || {})[key]).filter((n: any) => typeof n === 'number' && n >= 1 && n <= 9)
      return { key, mu: vals.length ? round(mean(vals), 2) : 5, n: vals.length }
    })
    // Radical Candor: mean care / challenge (1-9), by id prefix.
    const careVals: number[] = []
    const challVals: number[] = []
    for (const r of R) {
      for (const [k, v] of Object.entries(r.answers?.radical_candor || {})) {
        if (typeof v !== 'number') continue
        if (k.startsWith('care')) careVals.push(v)
        else if (k.startsWith('challenge')) challVals.push(v)
      }
    }
    const radicalCandor = careVals.length || challVals.length
      ? { teamCare: round(mean(careVals) || 5, 2), teamChallenge: round(mean(challVals) || 5, 2), n: Math.max(careVals.length, challVals.length) }
      : null
    // SDT: mean points per need key.
    const sdtKeys = new Set<string>()
    for (const r of R) for (const k of Object.keys(r.answers?.sdt || {})) sdtKeys.add(k)
    const sdtStats = [...sdtKeys].map((key) => {
      const vals = R.map((r) => (r.answers?.sdt || {})[key]).filter((n: any) => typeof n === 'number')
      return { key, meanPoints: vals.length ? round(mean(vals), 1) : 0, n: vals.length }
    })
    // Belbin: team chip share per role key.
    const belbinTotals: Record<string, number> = {}
    let belbinGrand = 0
    let belbinN = 0
    for (const r of R) {
      const b = r.answers?.belbin
      if (!b || typeof b !== 'object') continue
      let any = false
      for (const [k, v] of Object.entries(b)) {
        if (typeof v === 'number' && v > 0) { belbinTotals[k] = (belbinTotals[k] || 0) + v; belbinGrand += v; any = true }
      }
      if (any) belbinN++
    }
    const belbinStats = Object.entries(belbinTotals).map(([key, chips]) => ({ key, teamShare: belbinGrand ? round(chips / belbinGrand, 3) : 0, n: belbinN }))
    // VIA: frequency tally of picked strength ids.
    const viaCounts: Record<string, number> = {}
    let viaN = 0
    for (const r of R) {
      const arr = r.answers?.via
      if (!Array.isArray(arr)) continue
      viaN++
      for (const id of arr) if (typeof id === 'string') viaCounts[id] = (viaCounts[id] || 0) + 1
    }
    const viaStats = Object.entries(viaCounts).map(([id, count]) => ({ id, count, n: viaN })).sort((a, b) => b.count - a.count)
    // Johari: adjective tally.
    const johariCounts: Record<string, number> = {}
    let johariN = 0
    for (const r of R) {
      const arr = r.answers?.johari
      if (!Array.isArray(arr)) continue
      johariN++
      for (const w of arr) if (typeof w === 'string') johariCounts[w] = (johariCounts[w] || 0) + 1
    }
    const johariStats = { counts: Object.entries(johariCounts).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count), n: johariN }
    // Nohari: weakness/watch-out tally (same shape as Johari).
    const nohariCounts: Record<string, number> = {}
    let nohariN = 0
    for (const r of R) {
      const arr = r.answers?.nohari
      if (!Array.isArray(arr)) continue
      nohariN++
      for (const w of arr) if (typeof w === 'string') nohariCounts[w] = (nohariCounts[w] || 0) + 1
    }
    const nohariStats = { counts: Object.entries(nohariCounts).map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count), n: nohariN }

    // Goodness per dimension to pick strengths/growth deterministically.
    const goodness = [
      ...virtueStats.map((v) => ({ dimension: v.dimension, label: v.name, score: v.balanceScore })),
      ...competencyStats.map((c) => ({ dimension: c.dimension, label: c.statement, score: c.average / 5 })),
    ].sort((a, b) => b.score - a.score)
    const topStrengthDims = goodness.slice(0, 5).map((g) => g.dimension)
    // Growth tips target the BIGGEST VICES: the virtues furthest from the mean.
    const growthDims = virtueStats
      .slice()
      .sort((a, b) => a.balanceScore - b.balanceScore)
      .slice(0, 3)
      .map((v) => v.dimension)

    // ── Build the prompt (prose only) ──
    const statsBlock = [
      'VIRTUES (1-9 scale; 1=deficiency vice, 5=the virtue/mean, 9=excess vice):',
      ...virtueStats.map((v) => `- ${v.dimension} (${v.name}): mean ${v.mu}/9 -> ${v.tendency} (${v.tendency === 'deficient' ? v.deficientPole : v.tendency === 'excessive' ? v.excessivePole : 'balanced'}), spread ${v.sigma}`),
      '',
      'COMPETENCIES (1-5 agree, higher is better):',
      ...competencyStats.map((c) => `- ${c.dimension}: avg ${c.average}/5, "${c.statement}"`),
      '',
      'SCENARIOS (most common choice):',
      ...scenarioStats.map((s) => `- ${s.dimension}: "${s.winner}" (deficient ${s.tally.deficient} / balanced ${s.tally.balanced} / excessive ${s.tally.excessive})`),
      '',
      'FREE TEXT:',
      ...freetext.map((f) => `- ${f.dimension} ("${f.prompt}"):\n${f.answers.map((a) => `    • ${a}`).join('\n') || '    (none)'}`),
      ...(sessionResp.length
        ? [
            '',
            'RESPONSIBILITIES (team tier 1=under / 2=meets / 3=exceeds, plus verbatim colleague notes on HOW they exceed/fall short):',
            ...responsibilityStats.map(
              (r) =>
                `- [${r.index}] "${r.label}": team tier ${r.teamTier}/3 (n=${r.n})\n${(responsibilityNotes[r.index] || []).map((nt) => `    • ${nt}`).join('\n') || '    (no notes)'}`
            ),
          ]
        : []),
    ].join('\n')

    const systemPrompt = `You are an insightful, kind workplace-feedback analyst for an app called "Fishbowl". ${responses.length} colleagues anonymously assessed a person named ${name} on Aristotelian virtues (the good is the MEAN between two vices), competencies, situational tendencies, and free text. Write a warm, specific, honest report that ${name} will read about themselves.${workContext ? ` Context about ${name}: "${workContext}". Use it to ground every insight and tip in their real situation. If a COUNTRY is given, DO surface the cultural angle at least once (gently, as a hypothesis, never a hard stereotype): where a trait plausibly reflects a norm of that country, say so, e.g. "in [country], [directness / status / deference / harmony] tends to be culturally common, so this may be partly cultural, not only personal." If a ROLE + company VERTICAL are given, infer the work ENVIRONMENT (e.g. a product manager at a tech company = fast-paced, ambiguity-heavy; investment banking = high-pressure, hierarchical) and factor that into what the scores mean and what advice actually fits.` : ''}

=== VOICE ===
Speak TO ${name} in second person ("you", "your"). Never use their name. Write like a sharp, funny friend who knows them well, NOT a consultant: casual, warm, a little cheeky, and playfully teasing when the data invites it (especially the over-the-top stuff). Land the joke, then land the truth. Smart, dry, observational humor with taste, the kind that makes them laugh AND nod. Never mean, never sarcastic at their expense, never punching down, never a roast. Kill all corporate-speak (no "leverage", "stakeholders", "areas of opportunity", "strengths and weaknesses", "it's important to note", "at the end of the day"). Use contractions, short punchy sentences, the odd well-placed aside. Still: grounded in the data, honest, and genuinely useful. The virtue ideal is the MIDDLE (5 on the 1-9 scale), not the maximum: too little AND too much are both weaknesses, and overshooting a virtue is fair game for a gentle ribbing.

=== NO DASHES (critical) ===
NEVER use an em dash "—" (U+2014), an en dash "–" (U+2013), a double hyphen "--", or a spaced hyphen " - " as a connector or aside. They scream "written by AI" and are completely banned. Use commas, periods, colons, semicolons, or parentheses instead, or split into two sentences. A single dash of any kind invalidates the whole response, so reread and strip them before finishing.

=== BOLD ===
In every blurb/interpretation/appreciation and advice bullet, wrap 2 to 3 key phrases in **double asterisks**. Never bold full sentences. The "headline" and advice "title" must NOT contain bold.

=== GROWTH TIPS (growthEdges) ===
The growthEdges are ${name}'s BIGGEST VICES: the virtues furthest from the balanced middle. For each, give a short title and TWO concrete tips for what to DO to move back toward the mean. "actions" MUST be a JSON array of EXACTLY 2 bullets, each its own sentence, MAX 16 words, each with one **bold** segment, from two DIFFERENT angles (one behavioural, one mindset).${workContext ? ` Make the tips SPECIFIC and practical for their role and company (see the work context above).` : ''}

=== ACTION PLAN (actionPlan) ===
The most practical part of the whole report and the single most useful screen, so make it EXCELLENT. Every item must be CONCRETE and GROUNDED in a specific signal from the data above (a virtue running hot or cold and its pole, a thinking hat that runs cold, a watch-out colleagues named, a low competency, a scenario tendency), and pair the behaviour with a small, doable HOW, never a platitude. Cross-reference like a sharp coach: name the exact thing and the move. Short imperative, one **bold** phrase each. "stopNow" and "startNow" are EACH exactly 3 to change THIS WEEK. "stopNext" and "startNext" are EACH exactly 3 MORE, to add only once the first set is a habit (a level-up).

=== OUTPUT (JSON only, no code fences) ===
{
  "headline": "<=12 words, the meta-finding across everything. No bold, no dashes.",
  "virtues": { ${virtueStats.map((v) => `"${v.dimension}": "2 sentences on where you land between ${v.deficientPole} and ${v.excessivePole} and what it means at work"`).join(', ')} },
  "competencies": { ${competencyStats.map((c) => `"${c.dimension}": "1 to 2 sentence interpretation"`).join(', ')} },
  "topStrengths": [ ${topStrengthDims.map((d) => `{ "dimension": "${d}", "label": "<=4 words", "blurb": "2 sentences celebrating this strength specifically" }`).join(', ')} ],
  "growthEdges": [ ${growthDims.map((d) => `{ "dimension": "${d}", "title": "<=5 words imperative, no bold", "actions": ["concrete tip 1", "concrete tip 2"] }`).join(', ')} ],
  "appreciations": ["3 distinct themes synthesized from the appreciation free-text, each 1 sentence with **bold**", "...", "..."],
  "closing": "2 warm sentences sending them off.",
  "actionPlan": { "stopNow": ["a behaviour to stop this week, **bold** 1 phrase", "a second one", "a third one"], "startNow": ["a behaviour to start this week, **bold** 1 phrase", "a second one", "a third one"], "stopNext": ["a stop to add once the first are habit", "a second one", "a third one"], "startNext": ["a start to add once the first are habit", "a second one", "a third one"] }${sessionResp.length ? `,
  "responsibilities": { ${responsibilityStats.map((r) => `"${r.index}": ["2 to 3 short bullet points on HOW the team reads you on this responsibility — concrete behaviours showing where you ${r.teamTier === 1 ? 'fall short' : r.teamTier === 3 ? 'exceed and delight' : 'meet expectations'}, drawn from the colleague notes; synthesize, never quote anyone, **bold** one phrase in each"]`).join(', ')} }` : ''}
}
Include ALL ${virtueStats.length} virtue keys and ALL ${competencyStats.length} competency keys. Never reveal or quote any individual respondent verbatim; synthesize themes only (the team is small and quotes could identify people).`

    const userPrompt = `Computed results for ${name} (n=${responses.length}):\n\n${statsBlock}\n\nReturn the JSON now.`

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: jsonHeaders })
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    })
    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return new Response(JSON.stringify({ error: 'claude api error', status: claudeRes.status, details: errText }), { status: 502, headers: jsonHeaders })
    }

    const claudeJson = await claudeRes.json()
    const textBlock = Array.isArray(claudeJson.content) ? claudeJson.content.find((b: any) => b.type === 'text') : null
    const cleaned = (textBlock?.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    let prose: any
    try {
      prose = JSON.parse(cleaned)
    } catch {
      return new Response(JSON.stringify({ error: 'failed to parse claude response', raw: textBlock?.text }), { status: 502, headers: jsonHeaders })
    }

    // Strip any dashes deterministically.
    const stripDashes = (s: string): string => s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim()
    const scrub = (node: any): any =>
      typeof node === 'string' ? stripDashes(node)
        : Array.isArray(node) ? node.map(scrub)
          : node && typeof node === 'object' ? Object.fromEntries(Object.keys(node).map((k) => [k, scrub(node[k])])) : node
    prose = scrub(prose)

    const toBullets = (v: unknown): string[] => {
      let b: string[] = Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : typeof v === 'string' ? [v] : []
      b = b.flatMap((s) => s.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter(Boolean))
      b = b.slice(0, 2)
      while (b.length < 2) b.push('')
      return b
    }
    // Like toBullets but keeps each array item intact (no sentence-splitting).
    const toN = (v: unknown, n: number): string[] => {
      const b = (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []).map((s) => String(s).trim()).filter(Boolean).slice(0, n)
      while (b.length < n) b.push('')
      return b
    }

    // ── Merge prose + numbers into the final report ──
    const insights = {
      headline: prose.headline || '',
      topStrengths: (prose.topStrengths || []).map((s: any) => {
        const g = goodness.find((x) => x.dimension === s.dimension)
        return { dimension: s.dimension, label: s.label || g?.label || s.dimension, blurb: s.blurb || '' }
      }),
      virtues: virtueStats.map((v) => ({ ...v, blurb: prose.virtues?.[v.dimension] || '' })),
      competencies: competencyStats.map((c) => ({ ...c, interpretation: prose.competencies?.[c.dimension] || '' })),
      scenarios: scenarioStats,
      growthEdges: (prose.growthEdges || []).map((e: any) => ({ dimension: e.dimension, title: e.title || '', actions: toBullets(e.actions) })),
      appreciations: Array.isArray(prose.appreciations) ? prose.appreciations.slice(0, 3) : [],
      closing: prose.closing || '',
      actionPlan: prose.actionPlan
        ? {
            stopNow: toN(prose.actionPlan.stopNow, 3),
            startNow: toN(prose.actionPlan.startNow, 3),
            stopNext: toN(prose.actionPlan.stopNext, 3),
            startNext: toN(prose.actionPlan.startNext, 3),
          }
        : null,
      energizers: energizerStats,
      responsibilities: responsibilityStats.map((r) => {
        const rn = prose.responsibilities && prose.responsibilities[String(r.index)]
        return { ...r, notes: Array.isArray(rn) ? rn : rn ? [String(rn)] : [] }
      }),
      hats: hatsStats,
      radicalCandor,
      sdt: sdtStats,
      belbin: belbinStats,
      via: viaStats,
      johari: johariStats,
      nohari: nohariStats,
    }

    // Stamp per-dimension means for the live percentile layer.
    await supabase.from('fishbowl_sessions').update({ dimension_means: dimensionMeans }).eq('id', session_id)

    const { error: upsertErr } = await supabase.from('fishbowl_ai_insights').upsert({
      session_id,
      insights,
      response_count_at_generation: session.response_count,
      updated_at: new Date().toISOString(),
    })
    if (upsertErr) {
      return new Response(JSON.stringify({ error: 'failed to persist insights', details: upsertErr.message }), { status: 500, headers: jsonHeaders })
    }

    return new Response(JSON.stringify({ insights, cached: false }), { headers: jsonHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders })
  }
})
