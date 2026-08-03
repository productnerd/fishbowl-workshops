// Supabase Edge Function: fishbowl-synthesis
// The deep, cross-referenced "full read": one synthesized portrait that weaves every
// activity together with personality + Jungian archetype, flags self-vs-team gaps,
// names strengths/weaknesses/biases, and ends with how to put it into practice.
// SELF-dependent, so bearer-gated and cached on the self row (ai_synthesis), keyed by
// the team response count. Generated with EXTENDED THINKING for quality.
//
// Deploy: supabase functions deploy fishbowl-synthesis --project-ref knftyqkhampkqchoncel --use-api
// Required secret: ANTHROPIC_API_KEY.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { gifPromptBlock } from './gifs.ts'

const MODEL = 'claude-opus-5'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = { ...cors, 'Content-Type': 'application/json' }
const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: json })
const round = (n: number) => Math.round(n * 10) / 10

async function sha256hex(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

async function verifyOwner(sb: any, bearer: string, slug: string) {
  if (!bearer || !slug) return { error: 'unauthorized', status: 401 as const }
  const hash = await sha256hex(bearer)
  const { data: sess } = await sb
    .from('fishbowl_subject_sessions')
    .select('id, person_id, expires_at')
    .eq('secret_hash', hash)
    .maybeSingle()
  if (!sess || new Date(sess.expires_at) < new Date()) return { error: 'unauthorized', status: 401 as const }
  const { data: session } = await sb
    .from('fishbowl_sessions')
    .select('id, creator_name, response_count, creator_person_id, context')
    .eq('slug', slug)
    .maybeSingle()
  if (!session) return { error: 'not found', status: 404 as const }
  if (session.creator_person_id !== sess.person_id) return { error: 'forbidden', status: 403 as const }
  return { session }
}

// Clean dashes and stray whitespace, but PRESERVE paragraph breaks (\n\n) so the
// client can render real paragraphs instead of one wall of text.
const stripDashes = (s: string): string =>
  s
    .replace(/¶+/g, '\n\n') // sentinel paragraph token -> real breaks (keeps model JSON newline-free)
    .replace(/[ \t]*[—–]+[ \t]*/g, ', ')
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const HAT_NAMES: Record<string, string> = {
  hat_white: 'White (facts & data)', hat_red: 'Red (feelings & intuition)', hat_yellow: 'Yellow (optimism)',
  hat_black: 'Black (caution & risk)', hat_green: 'Green (creativity)', hat_blue: 'Blue (process & meta)',
}
const BELBIN_NAMES: Record<string, string> = {
  plant: 'Plant (ideas)', monitor_evaluator: 'Monitor-Evaluator (judgement)', specialist: 'Specialist',
  shaper: 'Shaper (drive)', implementer: 'Implementer', completer_finisher: 'Completer-Finisher',
  coordinator: 'Co-ordinator', teamworker: 'Teamworker', resource_investigator: 'Resource Investigator',
}
const SDT_NAMES: Record<string, string> = {
  autonomy: 'Autonomy', competence: 'Competence', relatedness: 'Relatedness',
  purpose: 'Purpose', safety: 'Safety', vitality: 'Vitality',
  growth: 'Growth', recognition: 'Recognition', impact: 'Impact',
}

// Trait dimensions live in ./dimensions.ts (a hand-kept mirror of feedback-core, guarded
// by a parity test so it can't silently drift). Scored 0-100 from the same 1-7 self answers
// as the Big Five (reverse = 8-raw, mean -> (mean-1)/6*100).
import { ORIENTATION_TITLE, scoreDimensions } from './dimensions.ts'

// Supabase edge runtime global: keeps the isolate alive to finish a background task
// after the HTTP response is sent (up to the 400s wall-clock).
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const force = !!body.force
    // 'status' = cheap poll (no generation). 'start' (default) = kick off a background
    // generation and return immediately, so the browser never holds the connection open
    // past the 150s edge idle timeout. The heavy work runs under EdgeRuntime.waitUntil.
    const mode = String(body.mode || 'start')
    const arch = body.archetype && typeof body.archetype === 'object' ? body.archetype : null
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const v = await verifyOwner(sb, String(body.bearer || ''), String(body.slug || ''))
    if ('error' in v) return ok({ error: v.error }, v.status)
    const session = v.session
    const n = session.response_count || 0
    const name = session.creator_name || 'they'
    const workContext = session.context ? String(session.context).trim() : ''

    const { data: self } = await sb
      .from('fishbowl_self_assessments')
      .select('big_five, mbti, self_payload, completed, ai_synthesis, ocean_answers, synthesis_status, synthesis_started_at')
      .eq('session_id', session.id)
      .maybeSingle()
    if (!self || !self.completed) return ok({ synthesis: null, reason: 'no self yet' })

    const { data: ins } = await sb
      .from('fishbowl_ai_insights')
      .select('insights')
      .eq('session_id', session.id)
      .maybeSingle()
    const team: any = ins?.insights
    if (!team || n < 5) return ok({ synthesis: null, reason: 'no team report yet' })

    // Relationship mix (v1b): who did the assessing — colleagues vs friends/family.
    const relMix = team.relationshipMix || { work: n, personal: 0 }
    const mixedRel = relMix.work > 0 && relMix.personal > 0
    const relGuidance = mixedRel
      ? `\n=== WHO ANSWERED (weave in) ===\nThe people who assessed this person are a MIX: ${relMix.work} colleagues (work context) and ${relMix.personal} friends or family (personal context). This dual lens is rare and valuable. Where both groups clearly agree, treat it as a STABLE core trait ("this is just who you are, at work and at home"). Where they diverge, name the CONTEXT-SHIFT explicitly and warmly ("your team reads you as X, but the people closest to you see Y, so you may be a different person off the clock") — that contrast is one of the most memorable things in the whole report. Never assume every signal is workplace feedback.\n`
      : relMix.personal > 0
        ? `\n=== WHO ANSWERED (weave in) ===\nEveryone who assessed this person is a friend or family member (personal context, NOT work colleagues). Frame the entire read personally, never as workplace feedback, and do not assume a job, team, or manager.\n`
        : ''

    const cached = self.ai_synthesis
    const fresh = cached && cached.n === n
    const startedMs = self.synthesis_started_at ? Date.parse(self.synthesis_started_at) : 0
    const genRecent = self.synthesis_status === 'generating' && Date.now() - startedMs < 5 * 60 * 1000

    if (mode === 'status') {
      const status = fresh ? 'ready' : self.synthesis_status === 'error' ? 'error' : genRecent ? 'generating' : 'idle'
      return ok({ status, synthesis: fresh ? cached : null })
    }
    if (fresh && !force) return ok({ status: 'ready', synthesis: cached })
    if (genRecent && !force) return ok({ status: 'generating' })

    // Claim the slot so a second 'start' can't launch a duplicate generation.
    await sb.from('fishbowl_self_assessments')
      .update({ synthesis_status: 'generating', synthesis_started_at: new Date().toISOString(), synthesis_error: null })
      .eq('session_id', session.id)

    // Everything below runs in the BACKGROUND (EdgeRuntime.waitUntil); the request has
    // already returned 'generating'. On success it writes ai_synthesis + status='ready'
    // and emails the subject a link; on failure it records status='error'.
    const generate = async () => {
     try {
    // ── Assemble every signal, with self vs team overlaid where both exist ──
    const sp = self.self_payload || {}
    const refl = (sp.reflections || {}) as { aspiration?: string; fear?: string; blindspot?: string; manual?: string }
    const bf = self.big_five || {}
    // Trait dimensions from the raw self answers, grouped by orientation for the prompt.
    const dims = self.ocean_answers && typeof self.ocean_answers === 'object' ? scoreDimensions(self.ocean_answers) : []
    const dimsByOrientation = ['cognitive', 'interpersonal', 'motivational'].map((o) => ({
      title: ORIENTATION_TITLE[o],
      rows: dims.filter((d) => d.orientation === o && d.answered > 0),
    })).filter((g) => g.rows.length > 0)
    const selfV = sp.virtues || {}
    const selfEn = sp.energizers || {}
    const selfHats = sp.hats || {}
    const selfBelbin = sp.belbin || {}
    const selfVia: string[] = Array.isArray(sp.via) ? sp.via : []
    const selfJohari: string[] = Array.isArray(sp.johari) ? sp.johari : []
    const selfNohari: string[] = Array.isArray(sp.nohari) ? sp.nohari : []
    // New self-knowledge (Extended depth; conflict also Standard). Id->label maps kept in
    // sync with apps/fishbowl/src/data/selfExtras.ts so the prompt sees plain phrases.
    const selfValues = (sp.values || {}) as { top?: string[]; least?: string }
    const selfMot = (sp.motivation || {}) as Record<string, number>
    const selfRiasec: string[] = Array.isArray(sp.riasec) ? sp.riasec : []
    const selfLove = (sp.love || {}) as { show?: string; receive?: string }
    const selfConflict = (sp.conflict || {}) as { repair?: string; need?: string; worse?: string }
    const selfLifesat = (sp.lifesat || {}) as { answers?: Record<string, number>; alive?: string }
    const VAL_LBL: Record<string, string> = { autonomy: 'Freedom to do things their own way', stimulation: 'Novelty and challenge', enjoyment: 'Enjoying life', mastery: 'Being excellent at what they do', recognition: 'Influence and recognition', security: 'Security and stability', tradition: 'Tradition and doing what is expected', loyalty: 'Loyalty to those close to them', fairness: 'Fairness and care for everyone' }
    const RIASEC_LBL: Record<string, string> = { R: 'Realistic (hands-on)', I: 'Investigative (analysis)', A: 'Artistic (creating)', S: 'Social (developing people)', E: 'Enterprising (leading, persuading)', C: 'Conventional (systems, detail)' }
    const LOVE_LBL: Record<string, string> = { acts: 'doing things for them (acts of service)', words: 'saying it out loud (words)', time: 'time and full attention', presence: 'showing up, physical closeness', gifts: 'small gifts and tokens' }
    const CREPAIR_LBL: Record<string, string> = { talk: 'a direct talk that names what happened', space: 'space first, then talk', gesture: 'a gesture (a coffee, a joke, a small act)', apology_plan: 'an apology and a plan so it does not repeat', move_on: 'just moving on, no big talk' }
    const CNEED_LBL: Record<string, string> = { heard: 'to be heard, not fixed', straight: 'straight talk, no tiptoeing', cool: 'a minute to cool down', reassurance: 'reassurance you are still okay', solve: 'to solve it now and move on' }
    const CWORSE_LBL: Record<string, string> = { rushed: 'being rushed', vague: 'vagueness', raised: 'raised voices', placated: 'being managed or placated', public: 'a public callout' }
    const ALIVE_LBL: Record<string, string> = { work: 'work', relationships: 'relationships', health: 'health', growth: 'growth', play: 'play' }
    const motIntr = ((Number(selfMot.intr_work) || 0) + (Number(selfMot.intr_noticed) || 0)) / 2
    const motExtr = ((Number(selfMot.extr_reco) || 0) + (Number(selfMot.extr_pressure) || 0)) / 2
    const motDone = ['intr_work', 'intr_noticed', 'extr_reco', 'extr_pressure'].every((k) => typeof selfMot[k] === 'number')
    const motPos = motDone ? Math.round(50 + ((motIntr - motExtr) / 4) * 50) : null
    const lsAns = (selfLifesat.answers || {}) as Record<string, number>
    const lsDone = ['ideal', 'satisfied', 'again'].every((k) => typeof lsAns[k] === 'number')
    const lsScore = lsDone ? Math.round(((['ideal', 'satisfied', 'again'].reduce((s, k) => s + lsAns[k], 0) / 3 - 1) / 4) * 100) / 10 : null
    const valuesTop = (selfValues.top || []).map((id) => VAL_LBL[id] || id)
    const valuesLeast = selfValues.least ? (VAL_LBL[selfValues.least] || selfValues.least) : ''
    const riasecCode = selfRiasec.join('-')
    const riasecNames = selfRiasec.map((id) => RIASEC_LBL[id] || id)

    const virtueLines = (team.virtues || [])
      .map((vv: any) => {
        const s = typeof selfV[vv.dimension] === 'number' ? selfV[vv.dimension] : null
        const diff = s != null ? round(s - vv.mu) : null
        return { ...vv, self: s, diff }
      })
      .sort((a: any, b: any) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0))

    const teamJohari: string[] = (team.johari?.counts || []).map((c: any) => c.word)
    const johariOpen = teamJohari.filter((w) => selfJohari.includes(w))
    const johariBlind = (team.johari?.counts || []).filter((c: any) => !selfJohari.includes(c.word)).map((c: any) => `${c.word} (${c.count}/${team.johari?.n})`)
    const johariHidden = selfJohari.filter((w) => !teamJohari.includes(w))
    // The words colleagues reached for most often (Johari picks by count) + the team's
    // aura read, for the "how you come across" synthesis.
    const johariTop: string[] = (team.johari?.counts || []).slice().sort((a: any, b: any) => b.count - a.count).slice(0, 6).map((c: any) => c.word)
    const auraSummary: string = typeof team.auraSummary === 'string' ? team.auraSummary : ''

    const teamNohari: string[] = (team.nohari?.counts || []).filter((c: any) => c.count >= 2).map((c: any) => c.word)
    const nohariOpen = teamNohari.filter((w) => selfNohari.includes(w))
    const nohariBlind = (team.nohari?.counts || []).filter((c: any) => c.count >= 2 && !selfNohari.includes(c.word)).map((c: any) => `${c.word} (${c.count}/${team.nohari?.n})`)
    const nohariOwned = selfNohari.filter((w) => !teamNohari.includes(w))

    const teamViaIds: string[] = (team.via || []).map((x: any) => x.id)
    const viaMatched = teamViaIds.filter((id) => selfVia.includes(id))
    const viaBlind = (team.via || []).filter((x: any) => !selfVia.includes(x.id)).map((x: any) => `${x.id} (${x.count}/${x.n})`)
    const viaHidden = selfVia.filter((id) => !teamViaIds.includes(id))

    const hatLines = (team.hats || []).map((h: any) => {
      const s = typeof selfHats[h.key] === 'number' ? selfHats[h.key] : null
      return `- ${HAT_NAMES[h.key] || h.key}: team ${round(h.mu)}/9${s != null ? `, you ${s}/9` : ''} (1=too little, 5=ideal, 9=too much)`
    })

    const belbinTotalSelf = Object.values(selfBelbin).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    const belbinLines = (team.belbin || [])
      .sort((a: any, b: any) => b.teamShare - a.teamShare)
      .map((rr: any) => {
        const sp2 = belbinTotalSelf > 0 && selfBelbin[rr.key] ? Math.round((Number(selfBelbin[rr.key]) / belbinTotalSelf) * 100) : null
        return `- ${BELBIN_NAMES[rr.key] || rr.key}: team ${Math.round(rr.teamShare * 100)}%${sp2 != null ? `, you ${sp2}%` : ''}`
      })

    const sdtLines = (team.sdt || [])
      .sort((a: any, b: any) => b.meanPoints - a.meanPoints)
      .map((s: any) => `- ${SDT_NAMES[s.key] || s.key}: ${round(s.meanPoints)} pts (of 20)`)

    const energizerLines = Object.entries(selfEn).map(([id, val]) => `- ${id}: ${val} (-2 drains .. +2 energizes)`)

    const rc = team.radicalCandor
    const responsibilities = (team.responsibilities || []).map((r: any) =>
      `- "${r.label}": team tier ${r.teamTier}/3${(r.notes && r.notes.length) ? ` (${r.notes.map((x: string) => stripDashes(x)).join('; ')})` : ''}`)

    const type = self.mbti?.fullCode || self.mbti?.type || ''
    const nick = self.mbti?.nickname ? ` ("${self.mbti.nickname}")` : ''

    const systemPrompt = `You are writing the centerpiece of a Fishbowl report: a deep, synthesized portrait of ONE person that ties the whole report together. The person self-assessed; people who know them assessed them anonymously across many activities. This is the long, reflective read, roughly 2 to 4 A4 pages.
${relGuidance}

You are given, for this one person: their Big Five personality and playful 16-type; their Jungian archetype (with light and shadow); the TEAM's aggregated read across every activity (virtues, at-work competencies, signature strengths, thinking hats, team role, what they fuel in others, feedback style, Johari words, watch-outs, responsibilities, appreciations); and the PERSON's OWN read on the same frameworks, so you can see where self and team agree and diverge.
${workContext ? `\n=== THEIR CONTEXT (weave through the whole read) ===\n"${workContext}".\nIf a COUNTRY is given, DO make the cultural link at least once (do not skip it): where a trait plausibly reflects a norm of that country, name it as a gentle hypothesis, e.g. "in [country], [tendency like directness / status / deference / harmony] tends to be culturally common, so this may be partly cultural, not only personal." Keep it tasteful and tentative, never a hard stereotype, but do surface it. If a ROLE + company VERTICAL are given, infer the WORK ENVIRONMENT (e.g. product management at a tech company = fast-paced and ambiguous; investment banking = high-pressure and hierarchical) and read the numbers, watch-outs and advice through that lens. This context should make the read more well-rounded, not be quoted verbatim.\n` : ''}
=== YOUR JOB: SYNTHESIZE, DON'T LIST ===
The report already shows each activity on its own. Do NOT walk through them one by one. Instead find the THROUGH-LINES: the few traits, patterns and tensions that show up again and again across different exercises, and fold the repeated signals into one clear read with no duplication.
CROSS-REFERENCE constantly and explicitly. Whenever two activities point the same way, say so out loud and name both, e.g. "Your team pegs you as a Shaper, which tracks with your high Courage score and the Black hat coming in hot." Use personality and the Jungian archetype as the connective tissue that everything else hangs on.

=== COVER (woven into flowing prose, NOT a bare checklist) ===
1. WHO THEY ARE at the core (lead with this): a synthetic read grounded in personality + archetype + the strongest cross-activity themes.
2. STRENGTHS, summarized and cross-referenced.
3. The WAYS THEY LIKE TO WORK: energy, thinking style (hats), team role (Belbin), what fuels them (SDT), feedback style.
4. The biggest GAPS between how they see themselves and how the team sees them. Blind spots first (the team sees something they don't, including Johari/VIA blind spots and watch-outs they didn't own), then hidden strengths (they are harder on themselves than the team is). Use the pre-sorted gaps.
5. WEAKNESSES and WATCH-OUTS, named kindly but honestly: recurring vices (virtues pushed to an extreme) and the watch-outs colleagues flagged.
6. TENDENCIES and BIASES that likely flow from their profile: an archetype's shadow, a trait taken too far, the decision and social biases their exact mix predicts. Frame these as things to keep in the back of their mind.
7. HOW THEY SHOW UP day to day, in concrete situations (meetings, conflict, slipping deadlines, receiving feedback), drawing on the scenarios, hats and candor.
8. ACTION PLAN: the single most useful screen. Concrete stop/start behaviours, each GROUNDED in this person's specific data — above all where their SELF-read and the TEAM diverge (the gaps), plus thinking-hat holes, the archetype shadow, and blind spots. Name the exact thing + the move; this is self-aware ("you rate your candor a 2 but the team feels 6, so warm the opener").
9. SOFT SPOTS (REQUIRED): the tender, private read of the quiet insecurities they may carry — built from their stated FEAR vs what the team actually reported, imposter gaps (self lower than team), and the weakness they own. Reassurance-first, never a gut-punch. This is the "softSpots" output below and it is NOT optional when a fear or a real self-vs-team gap exists.

10. WHAT DRIVES + CONNECTS them (their own read, Extended depth): their top VALUES and where they land on the intrinsic vs extrinsic motivation SPECTRUM; how they SHOW care vs want to RECEIVE it (name the gap when the two differ); what they NEED in conflict and what REPAIRS it; their RIASEC career code; and their life-satisfaction read. Weave these into the relevant sections and captions, cross-referenced with the personality and team read; never just list them.

=== VOICE ===
Second person ("you", "your"). Warm, sharp, honest, a little playful, like a perceptive friend who has read everything about you and is leveling with you. Not a consultant, zero corporate-speak, zero horoscope vagueness. Every claim grounded in the data given; specific over generic. It can sting a little where the data is strong, never cruel, never a roast.

=== NO DASHES (critical) ===
Never use an em dash, en dash, double hyphen, or spaced hyphen anywhere. Use commas, periods, or parentheses.

=== NO DOUBLE QUOTES INSIDE VALUES (critical for valid JSON) ===
Never put a double-quote character (") inside any string value. If you quote a word or phrase (e.g. what the team calls them), wrap it in single quotes ' instead. Double quotes are ONLY the JSON string delimiters.

=== FORMATTING FOR SCANNABILITY (important) ===
Write in SHORT paragraphs, 2 to 4 sentences each. Separate paragraphs with the exact token ¶¶ (two pilcrows) and put NO actual line breaks anywhere in the JSON. NEVER write a wall of text; if a paragraph runs past ~4 sentences, split it with ¶¶. Keep sentences short and punchy.
Wrap the few most important phrases per paragraph in **bold** (the claims someone should catch while skimming). Use *italic* for framework names, playful asides, and soft emphasis. Never bold or italicize a whole sentence. The title and section headings have no bold or italic.
${gifPromptBlock('portrait, any of the sections[].body, and howYouComeAcross')}
=== OUTPUT (JSON only, no code fences, no prose outside the JSON) ===
{
  "title": "a short, evocative title for this person's read (<= 6 words, no bold, no dashes)",
  "portrait": "3 to 4 SHORT paragraphs (2 to 4 sentences each), ~250 to 350 words, on who they are at their core, grounded in personality + archetype + the strongest cross-activity themes. MUST separate every paragraph with the token ¶¶ (no line breaks). With **bold** and *italic*.",
  "sections": [
    { "heading": "Where you shine", "body": "3 to 4 SHORT paragraphs, ~220 to 300 words, cross-referenced across strengths/virtues/appreciations. **bold** and *italic*. MUST put ¶¶ between every paragraph (no line breaks)." },
    { "heading": "How you like to work", "body": "energy, thinking style (hats), team role (Belbin), what you fuel in others (SDT), feedback style. 3 to 4 SHORT paragraphs, ~220 to 300 words." },
    { "heading": "You vs. how they see you", "body": "the biggest self-vs-team gaps; blind spots first (Johari/VIA/watch-outs/virtues the team sees and you don't), then hidden strengths where you are harder on yourself than the team is. 3 to 4 SHORT paragraphs, ~220 to 300 words." },
    { "heading": "Watch-outs and vices", "body": "weaknesses named kindly: virtues pushed to an extreme, the watch-outs colleagues flagged. 3 to 4 SHORT paragraphs, ~200 to 280 words." },
    { "heading": "Tendencies and biases to keep in mind", "body": "what the profile predicts: the archetype's shadow, traits taken too far, the decision and social biases your exact mix tends toward. 3 to 4 SHORT paragraphs, ~200 to 280 words." },
    { "heading": "How you show up day to day", "body": "the concrete situational read: how you land in meetings, conflict, slipping deadlines and receiving feedback, drawing on scenarios, hats and candor. 3 to 4 SHORT paragraphs, ~200 to 280 words." }
  ],
  "actionPlan": {
    "stopNow": ["exactly 3 behaviours to STOP this week", "each grounded in THIS person's specific data (a self-vs-team gap, a blind spot, a virtue past the mean, a thinking hat that runs cold, the archetype's shadow) + a concrete how, <= 16 words, **bold** one phrase", "a third"],
    "startNow": ["exactly 3 to START this week. At LEAST ONE must be a concrete step toward their ASPIRATION (who they said they want to become), the rest grounded in a specific gap / blind spot / watch-out. Each with a concrete how, <= 16 words, **bold** one phrase", "second", "third"],
    "stopNext": ["exactly 3 MORE to stop once the first are habit (a level-up)", "second", "third"],
    "startNext": ["exactly 3 MORE to start once the first are habit. At LEAST ONE a bigger stretch toward the ASPIRATION.", "second", "third"]
  },
  "captions": {
    "strengths": "ONE punchy sentence (<= 18 words) on the through-line of their strengths",
    "virtues": "name BOTH in one line (~22 words ok): (a) which virtues they push PAST the golden mean (run too hot or too cold), AND (b) the single virtue where their OWN rating and the TEAM's differ the most (the biggest self-vs-team gap), said explicitly as a gap.",
    "hats": "ONE sentence on the SHAPE of how they think (which modes run hot, which run cold)",
    "energy": "ONE sentence on what energises vs drains them",
    "youVsTeam": "ONE sentence naming the single biggest self-vs-team gap and what it means",
    "blindspots": "ONE sentence contrasting their biggest blind spot with their biggest hidden strength",
    "watchouts": "ONE sentence on the main watch-out to keep in the back of their mind",
    "responsibilities": "ONE sentence on how the team reads their delivery on what they own",
    "vice": "ONE sentence: which strength, pushed too far, becomes the vice the team feels",
    "rooms": "ONE sentence naming the one situation (conflict / deadline / feedback) where their balance most breaks",
    "lockedDoor": "ONE sentence on how high confidence + low receptiveness keeps a blind spot shut",
    "drives": "ONE sentence tying their TOP VALUES to where they sit on the intrinsic vs extrinsic spectrum, with a gentle nudge toward intrinsic",
    "conflictRepair": "ONE sentence on what they most need in conflict and what actually repairs it (the through-line, not a list)",
    "loveLanguage": "ONE sentence on how they SHOW care vs how they want to RECEIVE it, naming the gap if the two differ",
    "lifeSatisfaction": "ONE warm, honest sentence on where they stand right now and where they feel most alive"
  },
  "throughLine": {
    "from": "their archetype in 1 to 3 words (e.g. The Hero)",
    "via": ["one driving trait or signal, <= 4 words", "a second driving trait or signal, <= 4 words"],
    "to": "the ONE core tension this combination creates, second person, <= 14 words"
  },
  "constellation": [ { "label": "a 1 to 3 word name for the shared root theme", "words": ["EXACT blind-spot words from the Johari BLIND / Nohari BLIND / watch-out lists above that share this root", "another"] } ],
  "oneOnOne": ["4 to 6 concrete things to raise in a routine 1:1 with their manager. EACH must be SELF-AWARE: anchored in where THEIR OWN read diverges from the TEAM's (a specific gap, blind spot, or watch-out), naming how they see it vs how the team does. A QUESTION to ask or something to SHARE, <= 22 words, starting with 'Ask: ' or 'Share: ' (e.g. 'Share: I rate my candor a 2 but the team reads 6, help me calibrate')."],
  "biases": ["4 to 6 SHORT punchy notes-to-self (<= 9 words each) of the tendencies, blind spots and biases to keep at the back of their mind. No 'Ask/Share' prefix, no bold, just the pattern in plain words (e.g. 'I decide before I loop people in')."],
  "greatAt": [ { "label": "a specific ROLE, RESPONSIBILITY or type of TASK this person would be great at and love (<= 6 words)", "why": "one short clause grounding it in a real STRENGTH + what ENERGIZES them, <= 16 words" } ],
  "softSpots": {
    "heading": "a warm, soft, human title for this section — NOT the word 'insecurities' (e.g. 'The things you carry quietly', 'Where you're hardest on yourself'). <= 6 words.",
    "body": "2 to 3 SHORT paragraphs (¶¶ between every paragraph, no line breaks), reassurance-FIRST. This is the FEARED self, and it is a SEPARATE, REQUIRED field from howYouComeAcross (which is the HOPED self) — put ALL fear-vs-reality material HERE, never fold it into howYouComeAcross. Surface, gently, the places this person may quietly feel insecure — each built from a REAL signal and ALWAYS paired with the counter-evidence: (a) their stated FEAR ('what they fear people feel about them, true or not') vs what the team actually reported (if the data contradicts the fear, say so warmly and plainly — most fears are heavier than the truth); (b) IMPOSTER GAPS where they rate themselves LOWER than the team does ('you're better at X than you let yourself believe'); (c) the weakness they OWN, held kindly, never as indictment; (d) any place a strength reads as effortful or over-proved, hinting at something they feel they must earn. Warm, tender, second person, never clinical, never a gut-punch, never diagnose. **bold** 1 to 2 gentle phrases. Return this whenever a FEAR or a real self-vs-team gap exists (it almost always does); only return heading and body as empty strings when there is genuinely neither — never invent an insecurity."
  },
  "howYouComeAcross": "2 to 3 sentences, second person, that hold up who you HOPE to be seen as (your ASPIRATION) against how you ACTUALLY land, drawing on the team's aura read and the words colleagues reach for most WHERE THEY EXIST. This is the HOPED self ONLY — do NOT discuss what they FEAR here (the feared self belongs in softSpots above). Name the overlap warmly and any gap honestly (never harsh). **bold** 1 to 2 phrases. If no ASPIRATION was given, return an empty string."
}
For "greatAt": propose 3 to 4, best first. Combine what the team rates them STRONGEST at (top strengths, high virtues, VIA) with what ENERGIZES them (their energizers) and the role they play, to name concrete things they'd thrive doing. Specific and real (e.g. "Own key client relationships", "Run the launch war-room"), never vague ("be a leader").
For "constellation": look ONLY at the words the team flagged that the person did NOT own (Johari blind spot, Nohari blind spot, watch-outs). If two or more of them trace to ONE underlying theme, group them into a named constellation (1, at most 2 groups). Use the words VERBATIM as given. If nothing coheres, return an empty array.
For "softSpots": this is the most tender part of the whole report — a private, kind mirror for the quiet worries this person carries. Draw on the FEARED SELF (their stated fear), the FEAR-vs-reality contrast, imposter gaps (self lower than team), the owned weakness, and any over-proved strength. The reader should finish it feeling SEEN and RELIEVED, not exposed. Reassurance leads and closes; every named soft spot is anchored to real evidence AND softened by counter-evidence. If you have no fear and no meaningful self-vs-team gap, return heading and body both as empty strings.
=== CAPTIONS + THROUGH-LINE (as important as the prose) ===
Each caption is the single one-line takeaway shown on that visual slide, so it must be SHARP and SPECIFIC to this person, never generic, never just restate the slide's title. Second person, one sentence, <= 18 words, **bold** the key phrase, no dashes.
CRUCIAL: read the ABSOLUTE result AND the self-vs-team gap. Whenever the person and their team meaningfully DISAGREE on that slide's topic (a gap of ~2+ on a 1-9 scale, or a clear blind spot / hidden strength), the caption MUST name that gap, not just the raw number. Where they agree, say what the number means. The through-line is the spine of the whole report: archetype -> two driving signals -> the one tension they create; make "to" sting a little and ring true.
This is a LONG read: aim for roughly 1800 to 2600 words across portrait + sections (2 to 4 full A4 pages). Rich and specific, cross-referenced, never padded, never repeat a point across sections. The captions, action plan, 1:1 points, biases and softSpots are separate short outputs — keep them tight. Do not stop short; the JSON is only COMPLETE when it includes "howYouComeAcross" AND the "softSpots" object (heading + body) as the final field — never omit softSpots when a fear or a real self-vs-team gap exists. Return the COMPLETE JSON.`

    const userPrompt = `SUBJECT: ${name}. Speak TO them in second person; never use their name.

=== PERSONALITY (Big Five, 0-100) ===
Openness ${Math.round(bf.openness ?? 0)}, Conscientiousness ${Math.round(bf.conscientiousness ?? 0)}, Extraversion ${Math.round(bf.extraversion ?? 0)}, Agreeableness ${Math.round(bf.agreeableness ?? 0)}, Neuroticism ${Math.round(bf.neuroticism ?? 0)} (Emotional stability ${Math.round(bf.emotionalStability ?? (100 - (bf.neuroticism ?? 0)))}).
Playful type: ${type}${nick}. (Use this exact type code if you mention it; never recompute or change it from the scores.)

=== JUNGIAN ARCHETYPE ===
${arch ? `${arch.name}: ${arch.essence || ''}\nLight: ${arch.light || ''}\nShadow: ${arch.shadow || ''}${arch.runnerUp ? `\nWith a touch of: ${arch.runnerUp}` : ''}` : '(not available)'}
${dimsByOrientation.length ? `
=== TRAIT DIMENSIONS (your own read, 0-100; grouped by orientation. Higher = more of that trait, not better) ===
${dimsByOrientation.map((g) => `${g.title}: ${g.rows.map((r) => `${r.label} ${r.score}`).join(', ')}`).join('\n')}
Use the standouts (very high or very low) to sharpen the read; do not just recite the numbers.
` : ''}
=== VIRTUES (golden mean; 1-9, 5=ideal balance; sorted by biggest self-vs-team gap) ===
${virtueLines.map((g: any) => `- ${g.name}: team ${round(g.mu)}${g.self != null ? `, you ${g.self}` : ''}${g.diff != null ? ` (diff ${g.diff})` : ''}. Tendency: ${g.tendency}. Poles: ${g.deficientPole} (low) .. ${g.excessivePole} (high).`).join('\n')}

=== AT-WORK COMPETENCIES (team, 1-5) ===
${(team.competencies || []).map((c: any) => `- ${stripDashes(c.statement)}: ${round(c.average)}/5. ${stripDashes(c.interpretation || '')}`).join('\n')}

=== TOP STRENGTHS (team-named) ===
${(team.topStrengths || []).map((s: any) => `- ${s.label}: ${stripDashes(s.blurb || '')}`).join('\n')}

=== WHAT COLLEAGUES MOST APPRECIATE ===
${(team.appreciations || []).map((a: string) => `- ${stripDashes(a)}`).join('\n')}

=== SIGNATURE STRENGTHS (VIA) ===
Both you and team: ${viaMatched.join(', ') || '(none)'}
Team sees, you didn't claim (blind): ${viaBlind.join(', ') || '(none)'}
You claim, team didn't name (hidden): ${viaHidden.join(', ') || '(none)'}

=== JOHARI WORDS ===
Open (both picked): ${johariOpen.join(', ') || '(none)'}
Blind spot (team picked, you didn't): ${johariBlind.join(', ') || '(none)'}
Hidden (you picked, team didn't): ${johariHidden.join(', ') || '(none)'}

=== WATCH-OUTS (Nohari; team words named by 2+ colleagues) ===
Open (both flagged): ${nohariOpen.join(', ') || '(none)'}
Blind spot (team flagged, you didn't): ${nohariBlind.join(', ') || '(none)'}
You own (you flagged, team didn't): ${nohariOwned.join(', ') || '(none)'}

=== THINKING HATS ===
${hatLines.join('\n') || '(none)'}

=== TEAM ROLE (Belbin) ===
${belbinLines.join('\n') || '(none)'}

=== WHAT YOU FUEL IN OTHERS (SDT, team) ===
${sdtLines.join('\n') || '(none)'}

=== FEEDBACK STYLE (Radical Candor, team; 1-9) ===
${rc ? `Care ${round(rc.teamCare)}, Challenge ${round(rc.teamChallenge)}.` : '(none)'}

=== ENERGY (your own read; -2 drains .. +2 energizes) ===
${energizerLines.join('\n') || '(none)'}

=== RESPONSIBILITIES (team tier 1=under, 2=meets, 3=exceeds) ===
${responsibilities.join('\n') || '(none)'}

=== IN THEIR OWN WORDS (self-written, private) ===
Wants the team to describe them as (their ASPIRATION — treat this as a GOAL, the person they are reaching to become): ${refl.aspiration || '(not given)'}
What they FEAR people might feel about them, true or not (their FEARED SELF — private, tender, may be pure anxiety not reality): ${refl.fear || '(not given)'}
A weakness they own / feedback they keep hearing: ${refl.blindspot || '(not given)'}
Their user manual for a new teammate: ${refl.manual || '(not given)'}
Use these where they add colour and voice: contrast the ASPIRATION with how the team actually describes them (a real self-vs-team signal), take the OWNED weakness seriously and connect it to the data, and let the user manual sharpen the practical advice. Quote their phrasing sparingly.
The ASPIRATION is not just colour — it is a destination. The action plan must actively help them BECOME that person, not only fix what's broken.
The FEAR feeds the "soft spots" section below: check each fear against what the team actually reported and, wherever the data contradicts the fear, say so plainly and warmly — most fears are heavier than the truth.

=== WHAT DRIVES YOU (your own read) ===
Values ranked HIGHEST: ${valuesTop.join(', ') || '(not given)'}
Value cared about LEAST: ${valuesLeast || '(not given)'}
Motivation: ${motPos != null ? `${motPos}/100 toward INTRINSIC (0 = fully extrinsic, driven by rewards/status/deadlines; 100 = fully intrinsic, driven by the work itself, autonomy, mastery, meaning). Extrinsic fuel is real but runs out; the growth move is to keep shifting weight toward intrinsic.` : '(not given)'}

=== HOW YOU CONNECT + REPAIR (your own read) ===
How you SHOW care: ${selfLove.show ? (LOVE_LBL[selfLove.show] || selfLove.show) : '(not given)'}
How you FEEL cared for: ${selfLove.receive ? (LOVE_LBL[selfLove.receive] || selfLove.receive) : '(not given)'}${selfLove.show && selfLove.receive && selfLove.show !== selfLove.receive ? ' (these DIFFER: name the give-vs-receive gap warmly)' : ''}
In conflict you NEED: ${selfConflict.need ? (CNEED_LBL[selfConflict.need] || selfConflict.need) : '(not given)'}
What REPAIRS it: ${selfConflict.repair ? (CREPAIR_LBL[selfConflict.repair] || selfConflict.repair) : '(not given)'}
What makes it WORSE: ${selfConflict.worse ? (CWORSE_LBL[selfConflict.worse] || selfConflict.worse) : '(not given)'}

=== CAREER FIT (RIASEC, your own read) ===
Work code: ${riasecCode || '(not given)'}${riasecNames.length ? ` (${riasecNames.join(', ')})` : ''}

=== LIFE SATISFACTION (your own read) ===
Satisfaction: ${lsScore != null ? `${lsScore}/10` : '(not given)'}; most alive right now in: ${selfLifesat.alive ? (ALIVE_LBL[selfLifesat.alive] || selfLifesat.alive) : '(not given)'}

=== HOW YOU LAND ON PEOPLE (team) ===
Your aura / vibe (team's read): ${auraSummary || '(not given)'}
The words colleagues reach for most: ${johariTop.join(', ') || '(none)'}

Return the JSON now.`

    const anthropicKey = Deno.env.get('FISHBOWL_API_KEY') || Deno.env.get('fishbowl_api_key') || Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!claudeRes.ok) {
      const details = await claudeRes.text()
      throw new Error(`claude api error ${claudeRes.status}: ${details.slice(0, 200)}`)
    }

    const claudeJson = await claudeRes.json()
    const textBlock = Array.isArray(claudeJson.content) ? claudeJson.content.find((b: any) => b.type === 'text') : null
    let raw = (textBlock?.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    // Keep only from the first '{'. opus-5 sometimes appends a stray trailing brace (or wraps
    // the JSON in a stray word), so walk back through the last few '}' positions, trying both
    // the raw form and a form with literal newlines/tabs escaped inside string values.
    const first = raw.indexOf('{')
    if (first > 0) raw = raw.slice(first)
    const escapeInStrings = (s: string) => {
      let inStr = false, esc = false, out = ''
      for (const ch of s) {
        if (esc) { out += ch; esc = false; continue }
        if (ch === '\\') { out += ch; esc = true; continue }
        if (ch === '"') { inStr = !inStr; out += ch; continue }
        if (inStr && ch === '\n') { out += '\\n'; continue }
        if (inStr && ch === '\r') { out += '\\r'; continue }
        if (inStr && ch === '\t') { out += '\\t'; continue }
        out += ch
      }
      return out
    }
    let prose: any
    let end = raw.lastIndexOf('}')
    for (let tries = 0; tries < 5 && end > first && !prose; tries++) {
      const cand = raw.slice(0, end + 1)
      try { prose = JSON.parse(cand) } catch {
        try { prose = JSON.parse(escapeInStrings(cand)) } catch { /* try an earlier end */ }
      }
      end = raw.lastIndexOf('}', end - 1)
    }
    if (!prose) throw new Error(`parse error (stop=${claudeJson.stop_reason}): ${raw.slice(0, 200)}`)

    // One-line, per-slide takeaways: keep them tidy (no newlines, dashes cleaned).
    const oneLine = (v: any) => stripDashes(String(v ?? '')).replace(/\s+/g, ' ').trim()
    const CAP_KEYS = ['strengths', 'virtues', 'hats', 'energy', 'youVsTeam', 'blindspots', 'watchouts', 'responsibilities', 'vice', 'rooms', 'lockedDoor', 'drives', 'conflictRepair', 'loveLanguage', 'lifeSatisfaction']
    const rawCaps = prose.captions && typeof prose.captions === 'object' ? prose.captions : {}
    const captions: Record<string, string> = {}
    for (const k of CAP_KEYS) {
      const c = oneLine(rawCaps[k])
      if (c) captions[k] = c
    }
    const tl = prose.throughLine && typeof prose.throughLine === 'object' ? prose.throughLine : null
    const throughLine = tl
      ? {
          from: oneLine(tl.from).slice(0, 40),
          via: (Array.isArray(tl.via) ? tl.via : []).map((s: any) => oneLine(s).slice(0, 44)).filter(Boolean).slice(0, 2),
          to: oneLine(tl.to),
        }
      : null
    const constellation = (Array.isArray(prose.constellation) ? prose.constellation : [])
      .filter((c: any) => c && c.label && Array.isArray(c.words))
      .map((c: any) => ({ label: oneLine(c.label).slice(0, 30), words: c.words.map((w: any) => oneLine(w)).filter(Boolean).slice(0, 5) }))
      .filter((c: any) => c.words.length >= 2)
      .slice(0, 2)
    const oneOnOne = (Array.isArray(prose.oneOnOne) ? prose.oneOnOne : []).map((s: any) => oneLine(s)).filter(Boolean).slice(0, 6)
    const biases = (Array.isArray(prose.biases) ? prose.biases : []).map((s: any) => oneLine(s)).filter(Boolean).slice(0, 6)
    const greatAt = (Array.isArray(prose.greatAt) ? prose.greatAt : [])
      .filter((g: any) => g && g.label)
      .map((g: any) => ({ label: oneLine(g.label).slice(0, 48), why: oneLine(g.why).slice(0, 120) }))
      .slice(0, 4)
    const three = (v: any) => (Array.isArray(v) ? v : []).map((s: any) => oneLine(s)).filter(Boolean).slice(0, 3)
    const ap = prose.actionPlan && typeof prose.actionPlan === 'object' ? prose.actionPlan : null
    const actionPlan = ap && (Array.isArray(ap.stopNow) || Array.isArray(ap.startNow))
      ? { stopNow: three(ap.stopNow), startNow: three(ap.startNow), stopNext: three(ap.stopNext), startNext: three(ap.startNext) }
      : null
    // Soft spots (the tender "insecurities" read). Only kept when the model wrote a real body.
    const ss = prose.softSpots && typeof prose.softSpots === 'object' ? prose.softSpots : null
    const softSpots = ss && typeof ss.body === 'string' && ss.body.trim()
      ? { heading: stripDashes(String(ss.heading || '')).slice(0, 60), body: stripDashes(String(ss.body)) }
      : null

    const synthesis = {
      title: stripDashes(String(prose.title || 'Your full read')),
      portrait: stripDashes(String(prose.portrait || '')),
      sections: (Array.isArray(prose.sections) ? prose.sections : [])
        .filter((s: any) => s && s.heading && s.body)
        .map((s: any) => ({ heading: stripDashes(String(s.heading)), body: stripDashes(String(s.body)) }))
        .slice(0, 6),
      captions,
      ...(throughLine && throughLine.to && throughLine.via.length ? { throughLine } : {}),
      ...(constellation.length ? { constellation } : {}),
      ...(oneOnOne.length ? { oneOnOne } : {}),
      ...(biases.length ? { biases } : {}),
      ...(greatAt.length ? { greatAt } : {}),
      ...(typeof prose.howYouComeAcross === 'string' && prose.howYouComeAcross.trim() ? { howYouComeAcross: stripDashes(prose.howYouComeAcross) } : {}),
      ...(softSpots ? { softSpots } : {}),
      ...(actionPlan && actionPlan.stopNow.length ? { actionPlan } : {}),
      n,
    }

    await sb.from('fishbowl_self_assessments')
      .update({ ai_synthesis: synthesis, synthesis_status: 'ready', synthesis_error: null })
      .eq('session_id', session.id)

    // Best-effort: email the subject that THIS report is ready (they may have left the tab).
    // A magic link (single-use, 7 days) so one tap opens the ready report on any device —
    // claiming mints a fresh device bearer and lands on /r/<slug>.
    try {
      const RESEND = Deno.env.get('RESEND_API_KEY')
      const { data: person } = await sb.from('fishbowl_people').select('email').eq('id', session.creator_person_id).maybeSingle()
      const email = person?.email as string | undefined
      // Skip synthetic per-device anonymous addresses (they can't receive mail).
      if (RESEND && email && email.includes('@') && !email.endsWith('@device.fishbowl')) {
        const FROM = Deno.env.get('FISHBOWL_FROM_EMAIL') || 'Fishbowl <onboarding@resend.dev>'
        const APP = Deno.env.get('FISHBOWL_APP_URL') || 'https://productnerd.github.io/fishbowl/'
        const rawArr = new Uint8Array(24)
        crypto.getRandomValues(rawArr)
        const raw = [...rawArr].map((x) => x.toString(16).padStart(2, '0')).join('')
        const token_hash = await sha256hex(raw)
        await sb.from('fishbowl_magic_tokens').insert({
          person_id: session.creator_person_id,
          session_id: session.id,
          token_hash,
          expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        })
        const link = `${APP}#/claim/${raw}`
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${RESEND}` },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: 'Your Fishbowl is ready 🐟',
            html: `<p>Hi ${name},</p><p>Your report just finished — here's your private link (opens on any device):</p><p><a href="${link}">Open my Fishbowl report →</a></p><p style="color:#5a4f45;font-size:13px">Single-use, expires in 7 days.</p>`,
          }),
        })
        await sb.from('fishbowl_self_assessments').update({ synthesis_notified_at: new Date().toISOString() }).eq('session_id', session.id)
      }
    } catch { /* email is best-effort; the report is already saved */ }
     } catch (e) {
       await sb.from('fishbowl_self_assessments')
         .update({ synthesis_status: 'error', synthesis_error: String((e as Error)?.message || e).slice(0, 400) })
         .eq('session_id', session.id)
     }
    }

    EdgeRuntime.waitUntil(generate())
    return ok({ status: 'generating' })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
