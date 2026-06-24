// Fishbowl — save the subject's self-assessment. Bearer-verified; writes the
// private wide row and stamps self_completed_at when finished.
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
    .select('id, creator_person_id')
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
    const { person_id, session } = v

    const responsibilities = Array.isArray(body.responsibilities)
      ? body.responsibilities.map((s: any) => String(s)).filter(Boolean).slice(0, 5)
      : []
    const completed = Boolean(body.completed)
    const now = new Date().toISOString()

    const { error } = await sb.from('fishbowl_self_assessments').upsert(
      {
        session_id: session.id,
        person_id,
        ocean_answers: body.ocean_answers ?? {},
        big_five: body.big_five ?? null,
        mbti: body.mbti ?? null,
        self_payload: body.self_payload ?? {},
        responsibilities,
        completed,
        updated_at: now,
      },
      { onConflict: 'session_id' }
    )
    if (error) return ok({ error: 'could not save' }, 500)

    if (completed) {
      await sb.from('fishbowl_sessions').update({ self_completed_at: now }).eq('id', session.id)
    }
    return ok({ ok: true })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
