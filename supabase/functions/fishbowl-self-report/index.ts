// Fishbowl — the ONLY path that returns self-dependent payload. Verifies the
// device bearer owns the slug, then returns the team report (if >=5) + the
// subject's private self data. Self-data is never slug-readable; it only ships here.
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

// Resolve bearer -> person and assert they own `slug`. Bumps last_seen_at (sliding).
async function verifyOwner(sb: any, bearer: string, slug: string) {
  if (!bearer || !slug) return { error: 'unauthorized', status: 401 as const }
  const hash = await sha256hex(bearer)
  const { data: sess } = await sb
    .from('fishbowl_subject_sessions')
    .select('id, person_id, expires_at')
    .eq('secret_hash', hash)
    .maybeSingle()
  if (!sess || new Date(sess.expires_at) < new Date()) return { error: 'unauthorized', status: 401 as const }
  await sb.from('fishbowl_subject_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', sess.id)
  const { data: session } = await sb
    .from('fishbowl_sessions')
    .select('id, slug, response_count, creator_person_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!session) return { error: 'not found', status: 404 as const }
  if (session.creator_person_id !== sess.person_id) return { error: 'forbidden', status: 403 as const }
  return { person_id: sess.person_id, session }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const v = await verifyOwner(sb, String(body.bearer || ''), String(body.slug || ''))
    if ('error' in v) return ok({ error: v.error }, v.status)
    const { session } = v

    let teamReport: any = null
    if ((session.response_count || 0) >= 5) {
      const { data: ins } = await sb
        .from('fishbowl_ai_insights')
        .select('insights')
        .eq('session_id', session.id)
        .maybeSingle()
      teamReport = ins?.insights ?? null
    }

    const { data: self } = await sb
      .from('fishbowl_self_assessments')
      .select('big_five, mbti, completed, responsibilities, self_payload')
      .eq('session_id', session.id)
      .maybeSingle()

    return ok({
      teamReport,
      self: self ?? null,
      hasSelf: Boolean(self?.completed),
      responseCount: session.response_count || 0,
    })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
