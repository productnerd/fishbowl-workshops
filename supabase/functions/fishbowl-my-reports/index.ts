// Fishbowl — list every report belonging to the signed-in person (via their device
// bearer). One person (one email) can own several sessions over time; this is the
// single place that surfaces all of them, so recovery / the "your reports" screen can
// show more than just the newest. Bearer-gated, service-role, read-only.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = { ...cors, 'Content-Type': 'application/json' }
const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: json })

async function sha256hex(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const bearer = String(body.bearer || '')
    if (!bearer) return ok({ error: 'unauthorized' }, 401)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: sess } = await sb
      .from('fishbowl_subject_sessions')
      .select('person_id, expires_at')
      .eq('secret_hash', await sha256hex(bearer))
      .maybeSingle()
    if (!sess || new Date(sess.expires_at) < new Date()) return ok({ error: 'unauthorized' }, 401)

    const { data: sessions } = await sb
      .from('fishbowl_sessions')
      .select('id, slug, creator_name, response_count, created_at')
      .eq('creator_person_id', sess.person_id)
      .order('created_at', { ascending: false })
    const rows = sessions ?? []
    const ids = rows.map((r: any) => r.id)

    // Merge in: whether a self-read is done, and when the team report was generated.
    const selfBy: Record<string, any> = {}
    const genBy: Record<string, string> = {}
    if (ids.length) {
      const { data: selves } = await sb
        .from('fishbowl_self_assessments')
        .select('session_id, completed, synthesis_status')
        .in('session_id', ids)
      for (const s of selves ?? []) selfBy[s.session_id] = s
      const { data: gens } = await sb
        .from('fishbowl_ai_insights')
        .select('session_id, updated_at')
        .in('session_id', ids)
      for (const g of gens ?? []) genBy[g.session_id] = g.updated_at
    }

    const reports = rows.map((r: any) => ({
      slug: r.slug,
      name: r.creator_name,
      respondents: r.response_count || 0,
      createdAt: r.created_at,
      generatedAt: genBy[r.id] ?? null, // when the team report was written (null until unlocked)
      ready: (r.response_count || 0) >= 5, // report unlocks at 5 responses
      selfDone: !!selfBy[r.id]?.completed,
      deepRead: selfBy[r.id]?.synthesis_status === 'ready',
    }))

    return ok({ reports })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
