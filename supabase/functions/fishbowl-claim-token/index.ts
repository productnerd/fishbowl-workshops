// Fishbowl — exchange a single-use magic-link token for a 90-day device bearer.
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
function randToken() {
  const a = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const BEARER_DAYS = 90

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const token = String(body.token || '').trim()
    if (!token) return ok({ error: 'invalid or expired' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token_hash = await sha256hex(token)

    const { data: tok } = await sb
      .from('fishbowl_magic_tokens')
      .select('id, person_id, session_id, expires_at, consumed_at')
      .eq('token_hash', token_hash)
      .maybeSingle()
    if (!tok || tok.consumed_at || new Date(tok.expires_at) < new Date()) {
      return ok({ error: 'invalid or expired' }, 400)
    }

    // Single-use: consume it.
    await sb.from('fishbowl_magic_tokens').update({ consumed_at: new Date().toISOString() }).eq('id', tok.id)

    const bearer = randToken()
    const secret_hash = await sha256hex(bearer)
    const expires_at = new Date(Date.now() + BEARER_DAYS * 86_400_000).toISOString()
    await sb.from('fishbowl_subject_sessions').insert({ person_id: tok.person_id, secret_hash, expires_at })

    const { data: session } = await sb
      .from('fishbowl_sessions')
      .select('slug')
      .eq('id', tok.session_id)
      .maybeSingle()
    const { data: self } = await sb
      .from('fishbowl_self_assessments')
      .select('completed')
      .eq('session_id', tok.session_id)
      .maybeSingle()

    return ok({
      bearer,
      person_id: tok.person_id,
      slug: session?.slug ?? null,
      has_self: Boolean(self?.completed),
    })
  } catch (e) {
    return ok({ error: String(e) }, 500)
  }
})
