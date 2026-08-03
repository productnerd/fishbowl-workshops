// Supabase Edge Function: fishbowl-population-stats
// Public, read-only. Compares ONE report against every other completed Fishbowl report:
//   - sdt:    for each need, what % of people leave MORE of it in their colleagues' tanks
//   - belbin: how rare this person's signature team role is
// Deliberately returns `n` (the size of the comparison population) so the client can stay
// SILENT until there are enough reports for the claim to mean anything. We would rather
// show nothing than invent a percentile from a handful of people.
//
// Deploy: supabase functions deploy fishbowl-population-stats --project-ref knftyqkhampkqchoncel --use-api
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = { ...cors, 'Content-Type': 'application/json' }
const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: json })

// Share of the fixed point budget a need received (guards against a 0 total).
const shares = (sdt: any[]): Record<string, number> => {
  const total = sdt.reduce((a, s) => a + (Number(s.meanPoints) || 0), 0)
  if (total <= 0) return {}
  return Object.fromEntries(sdt.map((s) => [s.key, (Number(s.meanPoints) || 0) / total]))
}
const topRole = (belbin: any[]): string | null => {
  const live = (belbin || []).filter((b) => (b.n ?? 0) > 0)
  if (!live.length) return null
  return live.reduce((a, b) => ((b.teamShare ?? 0) > (a.teamShare ?? 0) ? b : a)).key ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const slug = String(body.slug || '')
    if (!slug) return ok({ error: 'slug required' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: session } = await sb.from('fishbowl_sessions').select('id').eq('slug', slug).maybeSingle()
    if (!session) return ok({ error: 'not found' }, 404)

    const { data: rows } = await sb.from('fishbowl_ai_insights').select('session_id, insights')
    const all = (rows || []).filter((r: any) => r.insights)
    const mine = all.find((r: any) => r.session_id === session.id)
    if (!mine) return ok({ n: 0 })

    const others = all.filter((r: any) => r.session_id !== session.id)
    const n = others.length

    // SDT: for each need, the % of OTHER people who leave more of it than this person.
    const mySdt = shares(mine.insights.sdt || [])
    const sdt: Record<string, number> = {}
    for (const [key, myShare] of Object.entries(mySdt)) {
      const pool = others.map((o: any) => shares(o.insights.sdt || [])[key]).filter((v) => typeof v === 'number')
      if (!pool.length) continue
      const above = pool.filter((v) => v > myShare).length
      sdt[key] = Math.max(1, Math.round((above / pool.length) * 100))
    }

    // Belbin: how many others share this person's signature role.
    const myRole = topRole(mine.insights.belbin || [])
    let belbin: { role: string; sharePct: number; sameCount: number } | null = null
    if (myRole && n > 0) {
      const same = others.filter((o: any) => topRole(o.insights.belbin || []) === myRole).length
      belbin = { role: myRole, sharePct: Math.round((same / n) * 100), sameCount: same }
    }

    return ok({ n, sdt, belbin })
  } catch (e) {
    return ok({ error: String(e) }, 500)
  }
})
