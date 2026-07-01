// Fishbowl — finish an ungated self-assessment. The subject takes the self-read
// without signing in first; on completion we identify their email, claim the session
// for them (if unclaimed), mint a 90-day device bearer, and save the self-read. The
// client then emails the results link via fishbowl-send-magic-link. Service-role.
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
    const email = String(body.email || '').trim().toLowerCase()
    const slug = String(body.slug || '')
    if (!email || !email.includes('@') || !slug) return ok({ error: 'email and slug required' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Identify (find-or-create the person for this email).
    const { data: personId, error: idErr } = await sb.rpc('fishbowl_identify', { p_email: email, p_name: null })
    if (idErr || !personId) return ok({ error: 'could not identify' }, 500)

    const { data: session } = await sb
      .from('fishbowl_sessions')
      .select('id, creator_person_id')
      .eq('slug', slug)
      .maybeSingle()
    if (!session) return ok({ error: 'session not found' }, 404)

    // Claim the session for this person if it's unclaimed; reject if it belongs to someone else.
    if (!session.creator_person_id) {
      await sb.from('fishbowl_sessions').update({ creator_person_id: personId }).eq('id', session.id).is('creator_person_id', null)
    } else if (session.creator_person_id !== personId) {
      return ok({ error: 'this link belongs to someone else' }, 403)
    }

    // Mint a device bearer (same shape as the magic-link claim).
    const bearer = randomHex(24)
    const secret_hash = await sha256hex(bearer)
    const expires_at = new Date(Date.now() + BEARER_DAYS * 86_400_000).toISOString()
    const { error: sErr } = await sb.from('fishbowl_subject_sessions').insert({ person_id: personId, secret_hash, expires_at })
    if (sErr) return ok({ error: 'could not start session' }, 500)

    // Save the self-read.
    const responsibilities = Array.isArray(body.responsibilities)
      ? body.responsibilities.map((s: any) => String(s)).filter(Boolean).slice(0, 5)
      : []
    const completed = Boolean(body.completed)
    const now = new Date().toISOString()
    const { error: upErr } = await sb.from('fishbowl_self_assessments').upsert(
      {
        session_id: session.id,
        person_id: personId,
        ocean_answers: body.ocean_answers ?? {},
        big_five: body.big_five ?? null,
        mbti: body.mbti ?? null,
        self_payload: body.self_payload ?? {},
        responsibilities,
        completed,
        updated_at: now,
        // Finishing the self-read invalidates the cached AI that depends on it, so the
        // report always regenerates a fresh read of THIS self.
        ...(completed ? { ai_synthesis: null, ai_self_insight: null } : {}),
      },
      { onConflict: 'session_id' }
    )
    if (upErr) return ok({ error: 'could not save' }, 500)

    await sb
      .from('fishbowl_sessions')
      .update({ responsibilities, ...(completed ? { self_completed_at: now } : {}) })
      .eq('id', session.id)

    // A finished self-read forces the WHOLE report to regenerate: drop the cached team
    // insights too, so it never serves a stale read after the self-assessment.
    if (completed) await sb.from('fishbowl_ai_insights').delete().eq('session_id', session.id)

    return ok({ ok: true, bearer, person_id: personId })
  } catch (_e) {
    return ok({ error: 'internal' }, 500)
  }
})
