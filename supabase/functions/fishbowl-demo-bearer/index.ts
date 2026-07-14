// Fishbowl — hand out the shared, long-lived viewer key for a DEMO session, so a single
// public link (/demo/<slug>) can be shared with many people and each of them sees the
// full report (including the bearer-gated slides). Only ever returns a key for sessions
// explicitly flagged is_demo — never for a real user's report. Read-only, service-role.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = { ...cors, 'Content-Type': 'application/json' }
const ok = (body: any, status = 200) => new Response(JSON.stringify(body), { status, headers: json })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const slug = String(body.slug || '').trim()
    if (!slug) return ok({ error: 'slug required' }, 400)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: s } = await sb
      .from('fishbowl_sessions')
      .select('is_demo, demo_bearer, creator_person_id')
      .eq('slug', slug)
      .maybeSingle()
    if (!s || !s.is_demo || !s.demo_bearer) return ok({ error: 'not a demo' }, 404)
    return ok({ bearer: s.demo_bearer, person_id: s.creator_person_id, slug })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
