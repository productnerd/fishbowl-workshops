// Supabase Edge Function: fishbowl-workmanual
// A focused, standalone call (NOT part of the big synthesis) that writes "[Name]'s Work
// Manual": short first-person operating instructions across fixed life-at-work contexts,
// grounded in the person's self + team signals. SELF-dependent, bearer-gated. Cached
// client-side by (slug, response_count), so this endpoint just generates on request.
//
// Deploy: supabase functions deploy fishbowl-workmanual --project-ref knftyqkhampkqchoncel --use-api
// Required secret: ANTHROPIC_API_KEY.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const MODEL = 'claude-opus-5'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = { ...cors, 'Content-Type': 'application/json' }
const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: json })
const round = (n: number) => Math.round(n * 10) / 10
const clean = (s: any) =>
  String(s ?? '')
    .replace(/[ \t]*[—–]+[ \t]*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()

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

// The fixed contexts (order matters). `stem` is rendered before the AI's completion.
const CONTEXTS = [
  { key: 'leader', stem: 'As a leader, I' },
  { key: 'stress', stem: 'Under stress, I' },
  { key: 'clients', stem: 'With clients, I' },
  { key: 'team', stem: 'As part of a team, I' },
  { key: 'best', stem: "When I'm at my best, I" },
  { key: 'conflict', stem: 'In a disagreement, I' },
  { key: 'bestwork', stem: 'To do my best work, I need' },
  { key: 'feedback', stem: 'When you give me feedback, I' },
  { key: 'drains', stem: 'What quietly drains me is' },
]

// Structured-output schema: the API constrains the response to exactly this shape, so the
// JSON is valid by construction (no more model-dependent malformed nesting or stray braces).
const MANUAL_SCHEMA = {
  type: 'object',
  properties: {
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', enum: CONTEXTS.map((c) => c.key) },
          text: { type: 'string' },
        },
        required: ['key', 'text'],
        additionalProperties: false,
      },
    },
    clashWith: { type: 'string' },
    thriveWith: { type: 'string' },
  },
  required: ['entries', 'clashWith', 'thriveWith'],
  additionalProperties: false,
}

const HAT_NAMES: Record<string, string> = {
  hat_white: 'White (facts)', hat_red: 'Red (feelings)', hat_yellow: 'Yellow (optimism)',
  hat_black: 'Black (caution)', hat_green: 'Green (creativity)', hat_blue: 'Blue (process)',
}
const SDT_NAMES: Record<string, string> = {
  autonomy: 'Autonomy', competence: 'Competence', relatedness: 'Relatedness', purpose: 'Purpose', safety: 'Safety', vitality: 'Vitality',
  growth: 'Growth', recognition: 'Recognition', impact: 'Impact',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const v = await verifyOwner(sb, String(body.bearer || ''), String(body.slug || ''))
    if ('error' in v) return ok({ error: v.error }, v.status)
    const session = v.session
    const n = session.response_count || 0
    const name = session.creator_name || 'they'
    const workContext = session.context ? String(session.context).trim() : ''

    const { data: self } = await sb
      .from('fishbowl_self_assessments')
      .select('big_five, mbti, self_payload, completed')
      .eq('session_id', session.id)
      .maybeSingle()
    if (!self || !self.completed) return ok({ manual: null, reason: 'no self yet' })

    const { data: ins } = await sb.from('fishbowl_ai_insights').select('insights').eq('session_id', session.id).maybeSingle()
    const team: any = ins?.insights
    if (!team || n < 5) return ok({ manual: null, reason: 'no team report yet' })

    // ── Compact grounding: enough signal for honest first-person instructions ──
    const sp = self.self_payload || {}
    const refl = (sp.reflections || {}) as { aspiration?: string; blindspot?: string; manual?: string }
    const bf = self.big_five || {}
    const selfV: any = sp.virtues || {}

    const virtueLines = (team.virtues || [])
      .map((vv: any) => {
        const s = typeof selfV[vv.dimension] === 'number' ? selfV[vv.dimension] : null
        return { name: vv.name, mu: vv.mu, self: s, diff: s != null ? round(s - vv.mu) : null, tendency: vv.tendency, lo: vv.deficientPole, hi: vv.excessivePole }
      })
      .sort((a: any, b: any) => Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0))

    const hatLines = (team.hats || []).map((h: any) => `- ${HAT_NAMES[h.key] || h.key}: ${round(h.mu)}/9 (5=ideal)`)
    const sdtLines = (team.sdt || []).sort((a: any, b: any) => b.meanPoints - a.meanPoints).map((s: any) => `- ${SDT_NAMES[s.key] || s.key}: ${round(s.meanPoints)}/20`)
    const rc = team.radicalCandor
    const nohariBlind = (team.nohari?.counts || []).filter((c: any) => c.count >= 2).map((c: any) => c.word)
    const selfEn = sp.energizers || {}
    const drains = Object.entries(selfEn).filter(([, v]) => Number(v) < 0).map(([id]) => id)
    const lifts = Object.entries(selfEn).filter(([, v]) => Number(v) > 0).map(([id]) => id)

    const systemPrompt = `You are writing "${name}'s Work Manual": a short, honest, first-person operating manual, the kind a thoughtful person hands a new teammate so they know how to work with them. It reads like typed instructions.

You are given this person's own self-read and how their colleagues actually see them (self-vs-team gaps included). Ground EVERY line in that data, never generic. First person ("I", "me", "you" only when addressing the reader). Warm, direct, self-aware, a little wry. Own the rough edges honestly (especially the watch-outs and the gaps between how they see themselves and how the team does). This is useful, not a brag sheet.

You will complete a fixed set of sentence STEMS. Write ONLY the completion for each (it will be printed right after the stem), grammatically continuing it. 1 to 2 short sentences each, ~12 to 30 words. Make each one specific and actionable: what to expect from me, and what I need from you.
${workContext ? `\nCONTEXT: "${workContext}". Read the person through their role/company/country where it fits (e.g. fast-paced tech, high-pressure finance; a cultural norm as a gentle hypothesis, never a hard stereotype).` : ''}

=== NO DASHES ===
Never use an em dash, en dash, double hyphen, or spaced hyphen. Use commas, periods, or parentheses.
=== NO DOUBLE QUOTES INSIDE VALUES ===
Never put a double-quote character inside a string value; use single quotes if you must quote.

=== OUTPUT (JSON only, no code fences; ONE FLAT object, no nested objects) ===
{ "entries": [ ${CONTEXTS.map((c) => `{ "key": "${c.key}", "text": "completion for: ${c.stem} ___" }`).join(', ')} ], "clashWith": "...", "thriveWith": "..." }
Return all ${CONTEXTS.length} entries in this exact order, then "clashWith" and "thriveWith" as TOP-LEVEL keys (do NOT wrap them in another object). No prose outside the JSON, and nothing after the final closing brace.

=== clashWith / thriveWith (write these two in SECOND PERSON, "you", NOT first person) ===
From this whole read (personality, candor, watch-outs, energy, virtues, what you fuel in others), cast TWO short working-style personas: clashWith = the kind of colleague YOU would most grate against or find draining; thriveWith = the kind YOU would most trust and thrive alongside. 2 to 3 sentences each, concrete about the behaviours (not adjectives), **bold** one phrase each. Never name a real person.`

    const userPrompt = `SUBJECT: ${name} (write as them, first person).

=== PERSONALITY (Big Five 0-100) ===
Openness ${Math.round(bf.openness ?? 0)}, Conscientiousness ${Math.round(bf.conscientiousness ?? 0)}, Extraversion ${Math.round(bf.extraversion ?? 0)}, Agreeableness ${Math.round(bf.agreeableness ?? 0)}, Emotional stability ${Math.round(bf.emotionalStability ?? (100 - (bf.neuroticism ?? 0)))}.

=== VIRTUES (1-9, 5=ideal; sorted by biggest self-vs-team gap) ===
${virtueLines.map((g: any) => `- ${g.name}: team ${round(g.mu)}${g.self != null ? `, self ${g.self}` : ''}${g.diff != null ? ` (gap ${g.diff})` : ''}, ${g.tendency}. Low=${g.lo}, high=${g.hi}.`).join('\n')}

=== TOP STRENGTHS (team) ===
${(team.topStrengths || []).map((s: any) => `- ${s.label}`).join('\n') || '(none)'}
=== WATCH-OUTS (team flagged, 2+) ===
${nohariBlind.join(', ') || '(none)'}
=== THINKING HATS ===
${hatLines.join('\n') || '(none)'}
=== WHAT I FUEL IN OTHERS (SDT) ===
${sdtLines.join('\n') || '(none)'}
=== FEEDBACK STYLE (Radical Candor 1-9) ===
${rc ? `Care ${round(rc.teamCare)}, Challenge ${round(rc.teamChallenge)}` : '(none)'}
=== ENERGY (my own read) ===
Lifts me: ${lifts.join(', ') || '(none)'}. Drains me: ${drains.join(', ') || '(none)'}.
=== IN MY OWN WORDS ===
I want to be described as: ${refl.aspiration || '(not given)'}
A weakness I own: ${refl.blindspot || '(not given)'}
My note to a new teammate: ${refl.manual || '(not given)'}

Now write the completions.`

    const anthropicKey = Deno.env.get('FISHBOWL_API_KEY') || Deno.env.get('fishbowl_api_key') || Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return ok({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: MANUAL_SCHEMA } },
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!claudeRes.ok) {
      const details = await claudeRes.text()
      return ok({ error: 'claude api error', status: claudeRes.status, details }, 502)
    }

    const claudeJson = await claudeRes.json()
    const textBlock = Array.isArray(claudeJson.content) ? claudeJson.content.find((b: any) => b.type === 'text') : null
    let raw = (textBlock?.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const first = raw.indexOf('{')
    if (first > 0) raw = raw.slice(first)
    // opus-5 occasionally appends a stray trailing brace; walk back through the last few
    // '}' positions until one yields valid JSON.
    let parsed: any
    let end = raw.lastIndexOf('}')
    for (let tries = 0; tries < 5 && end > first; tries++) {
      try { parsed = JSON.parse(raw.slice(0, end + 1)); break } catch { end = raw.lastIndexOf('}', end - 1) }
    }
    if (!parsed) {
      return ok({ error: 'parse error', raw: raw.slice(0, 800), stop: claudeJson.stop_reason }, 502)
    }

    const byKey: Record<string, string> = {}
    for (const e of Array.isArray(parsed.entries) ? parsed.entries : []) {
      if (e && typeof e.key === 'string' && typeof e.text === 'string') byKey[e.key] = clean(e.text)
    }
    const entries = CONTEXTS.map((c) => ({ key: c.key, stem: c.stem, text: byKey[c.key] || '' })).filter((e) => e.text)
    if (entries.length < 4) return ok({ error: 'too few entries', raw: raw.slice(0, 400) }, 502)

    // Two AI-cast working-style personas, generated alongside the manual so the big synthesis
    // call stays lean. Flat top-level keys (a nested object confused the model). Kept only
    // when both sides came back.
    const colleagueFit = typeof parsed.clashWith === 'string' && parsed.clashWith.trim() && typeof parsed.thriveWith === 'string' && parsed.thriveWith.trim()
      ? { clashWith: clean(parsed.clashWith), thriveWith: clean(parsed.thriveWith) }
      : null

    return ok({ manual: { entries, n, ...(colleagueFit ? { colleagueFit } : {}) } })
  } catch (e) {
    return ok({ error: String(e) }, 500)
  }
})
