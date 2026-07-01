// Fishbowl — create a session AND make the creating browser its owner in one call.
// Mints a 90-day device bearer at creation time (even with no email, via an anonymous
// person), so "the browser knows who I am": the creator can take their self-read and
// see their unlocked, personalized report with NO magic link. Magic links become a
// cross-device convenience, not a requirement. Service-role.
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
function randomHex(bytes = 24) {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return [...a].map((x) => x.toString(16).padStart(2, '0')).join('')
}

const BEARER_DAYS = 90

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const name = String(body.name || '').trim()
    const slug = String(body.slug || '').trim()
    const context = String(body.context || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    if (!name || !slug) return ok({ error: 'name and slug required' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Resolve the creator's person. With an email we identify (find-or-create) so they
    // can also reach the report from other devices via a magic link. With no email we
    // still create a person (a per-session anonymous identity) so the browser can own
    // the session; a synthetic unique email keeps the unique-not-null constraint happy.
    let personId: string | null = null
    if (email && email.includes('@')) {
      const { data, error } = await sb.rpc('fishbowl_identify', { p_email: email, p_name: name })
      if (error || !data) return ok({ error: 'could not identify' }, 500)
      personId = data as string
    } else {
      const sentinel = `anon-${randomHex(12)}@device.fishbowl`
      const { data, error } = await sb
        .from('fishbowl_people')
        .insert({ email: sentinel, display_name: name })
        .select('id')
        .single()
      if (error || !data) return ok({ error: 'could not create identity' }, 500)
      personId = data.id as string
    }

    // Create the session owned by that person (service-role bypasses the anon "unowned"
    // insert policy, so we can set creator_person_id directly).
    const { error: sErr } = await sb.from('fishbowl_sessions').insert({
      creator_name: name,
      slug,
      response_count: 0,
      context: context || null,
      creator_person_id: personId,
    })
    if (sErr) return ok({ error: 'could not create session', detail: sErr.message }, 500)

    // Mint the device bearer for that person (identical shape to the magic-link claim).
    const bearer = randomHex(24)
    const secret_hash = await sha256hex(bearer)
    const expires_at = new Date(Date.now() + BEARER_DAYS * 86_400_000).toISOString()
    const { error: bErr } = await sb
      .from('fishbowl_subject_sessions')
      .insert({ person_id: personId, secret_hash, expires_at })
    if (bErr) return ok({ error: 'could not mint device key' }, 500)

    return ok({ ok: true, slug, bearer, person_id: personId })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
