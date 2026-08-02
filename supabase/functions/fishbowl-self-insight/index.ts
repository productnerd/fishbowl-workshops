// Supabase Edge Function: fishbowl-self-insight
// Generates a private "you vs your team" self-awareness narrative for the SUBJECT.
// Bearer-verified and stored on the bearer-gated self row, NEVER in the slug-readable
// team insights, so self-derived prose can never leak to anyone with the report link.
//
// Deploy: supabase functions deploy fishbowl-self-insight --project-ref knftyqkhampkqchoncel --use-api
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
    .select('id, response_count, creator_person_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!session) return { error: 'not found', status: 404 as const }
  if (session.creator_person_id !== sess.person_id) return { error: 'forbidden', status: 403 as const }
  return { session }
}

const stripDashes = (s: string): string =>
  s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const force = !!body.force
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const v = await verifyOwner(sb, String(body.bearer || ''), String(body.slug || ''))
    if ('error' in v) return ok({ error: v.error }, v.status)
    const session = v.session
    const n = session.response_count || 0

    const { data: self } = await sb
      .from('fishbowl_self_assessments')
      .select('big_five, mbti, self_payload, completed, ai_self_insight')
      .eq('session_id', session.id)
      .maybeSingle()
    if (!self || !self.completed) return ok({ insight: null, reason: 'no self yet' })

    const { data: ins } = await sb
      .from('fishbowl_ai_insights')
      .select('insights')
      .eq('session_id', session.id)
      .maybeSingle()
    const team: any = ins?.insights
    if (!team || n < 5) return ok({ insight: null, reason: 'no team report yet' })

    // Cached and still in sync with the current team report? Return it.
    const cached = self.ai_self_insight
    if (cached && cached.n === n && !force) return ok({ insight: cached })

    // ── Compute the gaps deterministically (the AI only writes prose) ──
    const sp = self.self_payload || {}
    const selfVirtues = sp.virtues || {}
    const virtueGaps = (team.virtues || [])
      .filter((vv: any) => typeof selfVirtues[vv.dimension] === 'number')
      .map((vv: any) => ({
        name: vv.name,
        deficientPole: vv.deficientPole,
        excessivePole: vv.excessivePole,
        team: round(vv.mu),
        self: selfVirtues[vv.dimension],
        diff: round(selfVirtues[vv.dimension] - vv.mu),
      }))
      .sort((a: any, b: any) => Math.abs(b.diff) - Math.abs(a.diff))

    const selfEn = sp.energizers || {}
    const energizerGaps = (team.energizers || [])
      .filter((e: any) => e.n > 0 && typeof selfEn[e.id] === 'number')
      .map((e: any) => ({ label: e.label, team: round(e.teamMean), self: selfEn[e.id], diff: round(selfEn[e.id] - e.teamMean) }))
      .sort((a: any, b: any) => Math.abs(b.diff) - Math.abs(a.diff))

    if (virtueGaps.length === 0 && energizerGaps.length === 0) return ok({ insight: null, reason: 'no overlap' })

    const type = self.mbti?.fullCode || self.mbti?.type || ''

    const systemPrompt = `You write a short, sharp "you vs your team" self-awareness read for an app called Fishbowl. The person self-assessed; their colleagues assessed them anonymously. You are shown, per trait, where the TEAM places them and where THEY place themselves, so you can spot blind spots and hidden strengths.

=== HOW TO READ THE NUMBERS ===
Virtues are a 1 to 9 scale where 5 is the ideal balance, below 5 leans to the first (deficient) pole, above 5 leans to the second (excess) pole. "diff" is self minus team. A positive diff means they rate themselves further toward the excess pole than the team does, negative means further toward the deficient pole. A BLIND SPOT is where the team sees a vice (far from 5) that the person rates as more balanced. A HIDDEN read is where the person is harder on themselves than the team is. Small diffs (under ~1.0) mean you two basically agree. Energizers are a minus 2 to plus 2 scale (drains to energizes).

=== VOICE ===
Speak TO them in second person ("you", "your"). Write like a sharp, funny friend, not a consultant: casual, warm, a little cheeky, playfully teasing when the data invites it. Land the joke, then land the truth. No corporate-speak. Use contractions and short sentences. Never mean, never a roast.

=== NO DASHES (critical) ===
Never use an em dash, en dash, double hyphen, or spaced hyphen. Use commas, periods, or parentheses. A single dash invalidates the response.

=== BOLD ===
Wrap 1 to 2 key phrases per insight in **double asterisks**. Never bold a whole sentence. The headline has no bold.

=== OUTPUT (JSON only, no code fences) ===
{
  "headline": "<=10 words naming the overall self vs team theme. No bold, no dashes.",
  "insights": ["2 to 4 short items. Lead with the BIGGEST gaps (blind spots first), then note where you and the team strongly agree. Each 1 to 2 sentences, concrete, with **bold**."]
}
Focus on the 2 or 3 most interesting gaps. If self and team mostly agree, say so warmly and highlight the agreement.`

    const userPrompt = `Their playful type: ${type}

VIRTUES (sorted by biggest gap; 1-9, 5=ideal):
${virtueGaps.map((g: any) => `- ${g.name}: team ${g.team}, you ${g.self} (diff ${g.diff}). Poles: ${g.deficientPole} (low) ... ${g.excessivePole} (high).`).join('\n')}

ENERGIZERS (sorted by biggest gap; -2 drains .. +2 energizes):
${energizerGaps.length ? energizerGaps.map((g: any) => `- ${g.label}: team ${g.team}, you ${g.self} (diff ${g.diff}).`).join('\n') : '(none in common)'}

Return the JSON now.`

    const anthropicKey = Deno.env.get('FISHBOWL_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return ok({ error: 'ANTHROPIC_API_KEY not configured' }, 500)

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    })
    if (!claudeRes.ok) {
      const details = await claudeRes.text()
      return ok({ error: 'claude api error', status: claudeRes.status, details }, 502)
    }

    const claudeJson = await claudeRes.json()
    const textBlock = Array.isArray(claudeJson.content) ? claudeJson.content.find((b: any) => b.type === 'text') : null
    const cleaned = (textBlock?.text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    let prose: any
    try {
      prose = JSON.parse(cleaned)
    } catch {
      return ok({ error: 'parse error' }, 502)
    }

    const insight = {
      headline: stripDashes(String(prose.headline || '')),
      insights: (Array.isArray(prose.insights) ? prose.insights : []).map((s: any) => stripDashes(String(s))).slice(0, 4),
      n,
    }

    await sb.from('fishbowl_self_assessments').update({ ai_self_insight: insight }).eq('session_id', session.id)
    return ok({ insight })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
