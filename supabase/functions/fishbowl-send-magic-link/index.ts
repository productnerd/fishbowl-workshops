// Fishbowl — send a magic link that lets the SUBJECT reach their private
// self-assessment + gated report. Mints a single-use, short-lived token (stored
// as a hash), claims an unclaimed session on first link, and emails the link via
// Resend. Always returns { ok: true } (anti-enumeration). When RESEND_API_KEY is
// absent (dev), returns { ok: true, devClaimUrl } so the flow is testable.
//
// Deploy: supabase functions deploy fishbowl-send-magic-link --project-ref knftyqkhampkqchoncel --use-api
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

const APP = Deno.env.get('FISHBOWL_APP_URL') || 'https://productnerd.github.io/fishbowl/'
const RESEND = Deno.env.get('RESEND_API_KEY')
const FROM = Deno.env.get('FISHBOWL_FROM_EMAIL') || 'Fishbowl <onboarding@resend.dev>'
// Returning the claim URL in the response is an account-takeover oracle, so it is
// OFF unless this explicit dev flag is set — never merely because Resend is absent.
const DEV_CLAIM = Deno.env.get('FISHBOWL_DEV_CLAIM') === '1'
const TTL_MIN = 30
const REISSUE_THROTTLE_MS = 60_000

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const slug = String(body.slug || '').trim()
    // Anti-enumeration: we never reveal whether the email/session exists.
    if (!email || !slug) return ok({ ok: true })

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: personId } = await sb.rpc('fishbowl_identify', { p_email: email, p_name: null })
    if (!personId) return ok({ ok: true })

    const { data: session } = await sb
      .from('fishbowl_sessions')
      .select('id, creator_person_id')
      .eq('slug', slug)
      .maybeSingle()
    if (!session) return ok({ ok: true })

    // Claim-on-first-link: attach only an UNCLAIMED session. Never hijack one
    // already owned by someone else.
    if (!session.creator_person_id) {
      await sb
        .from('fishbowl_sessions')
        .update({ creator_person_id: personId })
        .eq('id', session.id)
        .is('creator_person_id', null)
    } else if (session.creator_person_id !== personId) {
      return ok({ ok: true }) // someone else owns it — silently no-op
    }

    // Rate limit: if a live token for this (person, session) was issued in the
    // last minute, don't reissue (anti email-bomb / token-flood). Still {ok:true}.
    const { data: recent } = await sb
      .from('fishbowl_magic_tokens')
      .select('created_at')
      .eq('person_id', personId)
      .eq('session_id', session.id)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (recent && Date.now() - new Date(recent.created_at).getTime() < REISSUE_THROTTLE_MS) {
      return ok({ ok: true })
    }
    // Invalidate prior live tokens for this (person, session) — one link at a time.
    await sb
      .from('fishbowl_magic_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('person_id', personId)
      .eq('session_id', session.id)
      .is('consumed_at', null)

    const raw = randToken()
    const token_hash = await sha256hex(raw)
    const expires_at = new Date(Date.now() + TTL_MIN * 60_000).toISOString()
    await sb.from('fishbowl_magic_tokens').insert({
      person_id: personId,
      session_id: session.id,
      token_hash,
      expires_at,
    })

    const claimUrl = `${APP}#/claim/${raw}`
    if (RESEND) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: 'Your Fishbowl link',
          html: `<p>Here's your private Fishbowl link. It takes you to your self-assessment and your report.</p><p><a href="${claimUrl}">Open my Fishbowl →</a></p><p style="color:#5a4f45;font-size:13px">This link expires in ${TTL_MIN} minutes and works once.</p>`,
        }),
      }).catch(() => {})
      return ok({ ok: true })
    }
    // Dev fallback: only when explicitly enabled (FISHBOWL_DEV_CLAIM=1).
    if (DEV_CLAIM) return ok({ ok: true, devClaimUrl: claimUrl })
    return ok({ ok: true })
  } catch (_e) {
    // Never leak; still look successful.
    return ok({ ok: true })
  }
})
