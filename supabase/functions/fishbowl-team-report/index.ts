// Supabase Edge Function: fishbowl-team-report
// Manager-only. Validates a fixed shared password, reports which team emails have
// completed their Fishbowl (>=5 responses), and — once ALL have and the manager
// asks — generates a team-level report from members' dimension means.
//
// Deploy: supabase functions deploy fishbowl-team-report --project-ref knftyqkhampkqchoncel --use-api
// Optional secret: FISHBOWL_MANAGER_PASSWORD (defaults to 'fishbowl2026').

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const PASSWORD = Deno.env.get('FISHBOWL_MANAGER_PASSWORD') || 'fishbowl2026'
const MODEL = 'claude-opus-4-8'
const THRESHOLD = 5

const VIRTUES: Record<string, { name: string; lo: string; hi: string }> = {
  courage: { name: 'Courage', lo: 'Avoids all risk', hi: 'Recklessly bold' },
  candor: { name: 'Candor', lo: 'Evasive', hi: 'Brutally blunt' },
  confidence: { name: 'Confidence', lo: 'Self-deprecating', hi: 'Arrogant' },
  drive: { name: 'Drive', lo: 'Complacent', hi: 'Ruthless' },
  composure: { name: 'Composure', lo: 'Pushover', hi: 'Short-fused' },
  collaboration: { name: 'Collaboration', lo: 'Lone wolf', hi: 'Cannot decide alone' },
  rigor: { name: 'Rigor', lo: 'Sloppy', hi: 'Cannot ship' },
  receptiveness: { name: 'Receptiveness', lo: 'Defensive', hi: 'Over-accommodating' },
  generosity: { name: 'Generosity', lo: 'Credit-hoarding', hi: 'Self-sacrificing' },
  decisiveness: { name: 'Decisiveness', lo: 'Indecisive', hi: 'Impulsive' },
}
const COMPETENCIES: Record<string, string> = {
  follow_through: 'Delivers on commitments',
  clarity: 'Communicates clearly',
  ownership: 'Takes ownership',
  responsiveness: 'Responsive and reachable',
  mentoring: 'Helps others grow',
  prioritization: 'Focuses on what matters',
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    if ((body.password || '') !== PASSWORD) {
      return new Response(JSON.stringify({ error: 'wrong password' }), { status: 200, headers: jsonHeaders })
    }
    const emails: string[] = Array.from(
      new Set((body.emails || []).map((e: string) => String(e).trim().toLowerCase()).filter(Boolean))
    )
    if (emails.length === 0) {
      // Password-only check (e.g. the gate before any team is added).
      return new Response(JSON.stringify({ roster: [], allComplete: false, team: null }), { headers: jsonHeaders })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: people } = await supabase.from('fishbowl_people').select('id, email, display_name').in('email', emails)
    const personByEmail = new Map((people || []).map((p: any) => [p.email, p]))
    const personIds = (people || []).map((p: any) => p.id)

    const { data: sessions } = personIds.length
      ? await supabase
          .from('fishbowl_sessions')
          .select('slug, creator_name, response_count, dimension_means, creator_person_id')
          .in('creator_person_id', personIds)
      : { data: [] as any[] }
    // Best session per person = the one with the most responses.
    const bestByPerson = new Map<string, any>()
    for (const s of sessions || []) {
      const cur = bestByPerson.get(s.creator_person_id)
      if (!cur || (s.response_count || 0) > (cur.response_count || 0)) bestByPerson.set(s.creator_person_id, s)
    }

    const roster = emails.map((email) => {
      const person: any = personByEmail.get(email)
      const s = person ? bestByPerson.get(person.id) : null
      return {
        email,
        name: s?.creator_name || person?.display_name || null,
        responseCount: s?.response_count || 0,
        completed: (s?.response_count || 0) >= THRESHOLD,
        slug: s?.slug || null,
      }
    })
    const allComplete = roster.length > 0 && roster.every((r) => r.completed)

    let team: any = null
    if (body.generate && allComplete) {
      // Team aggregate per dimension across members.
      const members = roster.map((r) => {
        const person: any = personByEmail.get(r.email)
        const s = person ? bestByPerson.get(person.id) : null
        return { name: r.name || 'A teammate', means: (s?.dimension_means || {}) as Record<string, number> }
      })
      const dimAvg = (dim: string) => round(mean(members.map((m) => m.means[dim]).filter((v) => typeof v === 'number')), 1)

      const virtueLines = Object.entries(VIRTUES).map(([d, v]) => `- ${v.name} (${v.lo} <-> ${v.hi}): team avg ${dimAvg(d)}/9 (5 = balanced)`)
      const compLines = Object.entries(COMPETENCIES).map(([d, label]) => `- ${label}: team avg ${dimAvg(d)}/5`)
      const memberLines = members.map((m) => {
        const leans = Object.entries(VIRTUES)
          .map(([d, v]) => ({ d, v, mu: m.means[d] }))
          .filter((x) => typeof x.mu === 'number' && Math.abs(x.mu - 5) >= 2)
          .map((x) => `${x.v.name} ${x.mu! < 5 ? x.v.lo.toLowerCase() : x.v.hi.toLowerCase()}`)
        return `- ${m.name}: ${leans.length ? leans.join(', ') : 'broadly balanced'}`
      })

      const system = `You are a sharp, kind team coach for "Fishbowl". You are given a team's aggregated peer-feedback profile (Aristotelian virtues where the good is the MIDDLE/5, plus competencies). Write a tight team report the manager will read.

=== VOICE ===
Talk about "the team" and "you" (the manager) like a sharp, funny colleague over a drink, NOT a McKinsey deck. Casual, warm, a little cheeky, playfully teasing about the team's quirks when the data earns it, but always kind and genuinely useful. Smart, dry humor with taste. Kill all corporate-speak (no "leverage", "synergy", "stakeholders", "areas of opportunity"), no filler, never generic. Contractions and short punchy sentences. Still honest and grounded in the numbers. NO DASHES EVER: never use an em dash "—", an en dash "–", a double hyphen "--", or a spaced hyphen " - " (they scream AI-written); use commas, periods, or parentheses, or split the sentence. Wrap 2 to 3 key phrases per item in **bold**.

=== OUTPUT (JSON only, no code fences) ===
{
  "headline": "<=14 words, the team's defining pattern. No bold.",
  "strengths": ["3 collective strengths, 1 sentence each with **bold**", "...", "..."],
  "risks": ["3 collective blind spots or where the team over/under-indexes (e.g. everyone leans one vice), 1 sentence each with **bold**", "...", "..."],
  "complementarity": ["2 notes on how specific members balance or could clash (use first names), 1 sentence each", "..."],
  "advice": ["3 concrete things the manager could do, each <=16 words with one **bold** phrase", "...", "..."],
  "closing": "1 warm sentence."
}`
      const user = `Team of ${members.length}.\n\nVIRTUES (team averages, 1-9, 5=balanced):\n${virtueLines.join('\n')}\n\nCOMPETENCIES (1-5):\n${compLines.join('\n')}\n\nWHERE EACH MEMBER LEANS:\n${memberLines.join('\n')}\n\nReturn the JSON now.`

      const key = Deno.env.get('ANTHROPIC_API_KEY')
      if (!key) return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: jsonHeaders })
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
      })
      if (!res.ok) return new Response(JSON.stringify({ error: 'claude error', details: await res.text() }), { status: 502, headers: jsonHeaders })
      const cj = await res.json()
      const text = (Array.isArray(cj.content) ? cj.content.find((b: any) => b.type === 'text')?.text : '') || ''
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
      const stripDashes = (s: string) => s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ').trim()
      const scrub = (n: any): any => (typeof n === 'string' ? stripDashes(n) : Array.isArray(n) ? n.map(scrub) : n && typeof n === 'object' ? Object.fromEntries(Object.keys(n).map((k) => [k, scrub(n[k])])) : n)
      try {
        team = scrub(JSON.parse(cleaned))
      } catch {
        return new Response(JSON.stringify({ error: 'failed to parse team report' }), { status: 502, headers: jsonHeaders })
      }
    }

    return new Response(JSON.stringify({ roster, allComplete, team }), { headers: jsonHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders })
  }
})
