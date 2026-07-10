// Fishbowl — does this email already own a session? A read-only boolean the create
// form uses to offer "retrieve results / start new" instead of silently minting a
// duplicate. Service-role (people + sessions have no anon read policy).
//
// Privacy note: this deliberately reveals *existence* (that is the whole point of the
// prompt), but nothing else — no name, slug, or count — so it can never hand a stranger
// someone's dashboard. Retrieval still goes through the owner-verified magic link.
//
// Deploy: supabase functions deploy fishbowl-check-email --project-ref knftyqkhampkqchoncel --use-api
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
    const email = String(body.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) return ok({ exists: false })

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Read-only: look up the person, then whether they own any real session. Never
    // creates anything (unlike fishbowl_identify), so a typo can't leave a phantom.
    const { data: person } = await sb.from('fishbowl_people').select('id').eq('email', email).maybeSingle()
    if (!person) return ok({ exists: false })

    const { data: sess } = await sb
      .from('fishbowl_sessions')
      .select('id')
      .eq('creator_person_id', person.id)
      .limit(1)
      .maybeSingle()
    return ok({ exists: !!sess })
  } catch (_e) {
    return ok({ exists: false })
  }
})
