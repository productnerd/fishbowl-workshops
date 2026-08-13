// Fishbowl — the trainer layer.
//
// A trainer is not a new kind of account: they are a fishbowl_people row reached through
// the same device bearer as everyone else, so this reuses the existing magic-link stack
// rather than adding a second identity system.
//
// The important rule in this file is what a trainer may NOT see. They get a roster and a
// completion status, never a report, never an answer, never an aggregate small enough to
// identify one person. That boundary is the reason participants answer honestly, so it is
// enforced here in the only code that can read the data, not in the UI where it would be
// one careless prop away from leaking.
//
// Deploy (from the project directory, or the CLI reads a stray ~/supabase/config.toml):
//   supabase functions deploy fishbowl-workshops --project-ref knftyqkhampkqchoncel --use-api
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

// Unambiguous alphabet: no O/0, no I/l/1. These get read off a projector and typed by hand.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const inviteToken = () =>
  [...crypto.getRandomValues(new Uint8Array(10))].map((n) => ALPHABET[n % ALPHABET.length]).join('')

const sb = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

/** Resolve a device bearer to the person it belongs to, or null. */
async function personFor(client: any, bearer: string): Promise<string | null> {
  if (!bearer) return null
  const { data } = await client
    .from('fishbowl_subject_sessions')
    .select('person_id, expires_at')
    .eq('secret_hash', await sha256hex(bearer))
    .maybeSingle()
  if (!data || new Date(data.expires_at) < new Date()) return null
  return data.person_id as string
}

/**
 * The roster for one workshop: who joined and how far they got.
 * Deliberately selects no report content. `self_done` and `report_ready` are progress
 * flags, not findings.
 */
async function roster(client: any, workshopId: string) {
  const { data: parts } = await client
    .from('fb_workshop_participants')
    .select('id, session_id, display_name, joined_at')
    .eq('workshop_id', workshopId)
    .order('joined_at', { ascending: true })

  const rows = parts ?? []
  const ids = rows.map((r: any) => r.session_id).filter(Boolean)
  const counts: Record<string, number> = {}
  const selfDone: Record<string, boolean> = {}
  const reportAt: Record<string, string> = {}

  if (ids.length) {
    const { data: sessions } = await client
      .from('fishbowl_sessions')
      .select('id, response_count')
      .in('id', ids)
    for (const s of sessions ?? []) counts[s.id] = s.response_count ?? 0

    const { data: selves } = await client
      .from('fishbowl_self_assessments')
      .select('session_id, completed')
      .in('session_id', ids)
    for (const s of selves ?? []) selfDone[s.session_id] = Boolean(s.completed)

    const { data: gens } = await client
      .from('fishbowl_ai_insights')
      .select('session_id, updated_at')
      .in('session_id', ids)
    for (const g of gens ?? []) reportAt[g.session_id] = g.updated_at
  }

  return rows.map((r: any) => ({
    id: r.id,
    displayName: r.display_name,
    joinedAt: r.joined_at,
    responseCount: r.session_id ? counts[r.session_id] ?? 0 : 0,
    selfDone: r.session_id ? selfDone[r.session_id] ?? false : false,
    reportReadyAt: r.session_id ? reportAt[r.session_id] ?? null : null,
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const body = await req.json().catch(() => ({}))
    const mode = String(body.mode || '')
    const client = sb()

    // ── Public modes: no bearer. A participant opening an invite link is a stranger. ──

    // What the join screen needs to render before anyone has identified themselves.
    if (mode === 'peek') {
      const token = String(body.invite_token || '')
      if (!token) return ok({ error: 'invite_token required' }, 400)
      const { data: w } = await client
        .from('fb_workshops')
        .select('id, name, client_name, topic_key, config_snapshot, opens_at, closes_at, archived_at')
        .eq('invite_token', token)
        .maybeSingle()
      if (!w || w.archived_at) return ok({ error: 'not_found' }, 404)

      const now = new Date()
      if (w.opens_at && new Date(w.opens_at) > now) return ok({ error: 'not_open' }, 403)
      if (w.closes_at && new Date(w.closes_at) < now) return ok({ error: 'closed' }, 403)

      return ok({
        workshop: {
          name: w.name,
          clientName: w.client_name,
          topicKey: w.topic_key,
          config: w.config_snapshot,
        },
      })
    }

    // Attach a freshly created fishbowl to the workshop that invited it. Called right
    // after session creation, so the participant flow itself is unchanged.
    if (mode === 'join') {
      const token = String(body.invite_token || '')
      const sessionId = String(body.session_id || '')
      const displayName = String(body.display_name || '').trim().slice(0, 80)
      if (!token || !sessionId) return ok({ error: 'invite_token and session_id required' }, 400)

      const { data: w } = await client
        .from('fb_workshops')
        .select('id, archived_at, closes_at')
        .eq('invite_token', token)
        .maybeSingle()
      if (!w || w.archived_at) return ok({ error: 'not_found' }, 404)
      if (w.closes_at && new Date(w.closes_at) < new Date()) return ok({ error: 'closed' }, 403)

      // Idempotent: a participant who reloads mid-join must not appear twice.
      await client
        .from('fb_workshop_participants')
        .upsert(
          { workshop_id: w.id, session_id: sessionId, display_name: displayName || null },
          { onConflict: 'workshop_id,session_id' }
        )
      await client.from('fishbowl_sessions').update({ workshop_id: w.id }).eq('id', sessionId)
      return ok({ joined: true })
    }

    // ── Trainer modes: bearer required from here down. ──
    const personId = await personFor(client, String(body.bearer || ''))
    if (!personId) return ok({ error: 'unauthorized' }, 401)

    if (mode === 'list') {
      const { data: ws } = await client
        .from('fb_workshops')
        .select('id, name, client_name, topic_key, invite_token, opens_at, closes_at, archived_at, created_at')
        .eq('trainer_person_id', personId)
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      const rows = ws ?? []
      // Headline counts only. The detail call does the per-person work.
      const counts: Record<string, { joined: number; reports: number }> = {}
      for (const w of rows) counts[w.id] = { joined: 0, reports: 0 }
      if (rows.length) {
        const { data: parts } = await client
          .from('fb_workshop_participants')
          .select('workshop_id, session_id')
          .in('workshop_id', rows.map((w: any) => w.id))
        const sessionToWorkshop: Record<string, string> = {}
        for (const p of parts ?? []) {
          counts[p.workshop_id].joined += 1
          if (p.session_id) sessionToWorkshop[p.session_id] = p.workshop_id
        }
        const sessionIds = Object.keys(sessionToWorkshop)
        if (sessionIds.length) {
          const { data: gens } = await client
            .from('fishbowl_ai_insights')
            .select('session_id')
            .in('session_id', sessionIds)
          for (const g of gens ?? []) counts[sessionToWorkshop[g.session_id]].reports += 1
        }
      }

      return ok({
        workshops: rows.map((w: any) => ({
          id: w.id,
          name: w.name,
          clientName: w.client_name,
          topicKey: w.topic_key,
          inviteToken: w.invite_token,
          opensAt: w.opens_at,
          closesAt: w.closes_at,
          createdAt: w.created_at,
          joined: counts[w.id].joined,
          reports: counts[w.id].reports,
        })),
      })
    }

    if (mode === 'create') {
      const name = String(body.name || '').trim().slice(0, 120)
      const topicKey = String(body.topic_key || '').trim()
      if (!name || !topicKey) return ok({ error: 'name and topic_key required' }, 400)

      const { data, error } = await client
        .from('fb_workshops')
        .insert({
          trainer_person_id: personId,
          name,
          client_name: String(body.client_name || '').trim().slice(0, 120) || null,
          topic_key: topicKey,
          // The trainer's customisation, resolved and frozen. Participants read this and
          // never the live topic, so editing later cannot reshape a report in flight.
          config_snapshot: body.config ?? null,
          invite_token: inviteToken(),
        })
        .select('id, invite_token')
        .single()
      if (error) return ok({ error: error.message }, 500)
      return ok({ id: data.id, inviteToken: data.invite_token })
    }

    if (mode === 'detail') {
      const id = String(body.workshop_id || '')
      const { data: w } = await client
        .from('fb_workshops')
        .select('id, trainer_person_id, name, client_name, topic_key, config_snapshot, invite_token, opens_at, closes_at, created_at')
        .eq('id', id)
        .maybeSingle()
      if (!w || w.trainer_person_id !== personId) return ok({ error: 'not_found' }, 404)

      return ok({
        workshop: {
          id: w.id,
          name: w.name,
          clientName: w.client_name,
          topicKey: w.topic_key,
          config: w.config_snapshot,
          inviteToken: w.invite_token,
          opensAt: w.opens_at,
          closesAt: w.closes_at,
          createdAt: w.created_at,
        },
        participants: await roster(client, w.id),
      })
    }

    if (mode === 'update') {
      const id = String(body.workshop_id || '')
      const { data: w } = await client
        .from('fb_workshops')
        .select('id, trainer_person_id')
        .eq('id', id)
        .maybeSingle()
      if (!w || w.trainer_person_id !== personId) return ok({ error: 'not_found' }, 404)

      const patch: Record<string, unknown> = {}
      if (typeof body.name === 'string') patch.name = body.name.trim().slice(0, 120)
      if (typeof body.client_name === 'string') patch.client_name = body.client_name.trim().slice(0, 120) || null
      if (body.config !== undefined) patch.config_snapshot = body.config
      if (body.closes_at !== undefined) patch.closes_at = body.closes_at
      if (body.archived === true) patch.archived_at = new Date().toISOString()
      if (!Object.keys(patch).length) return ok({ error: 'nothing to update' }, 400)

      const { error } = await client.from('fb_workshops').update(patch).eq('id', id)
      if (error) return ok({ error: error.message }, 500)
      return ok({ updated: true })
    }

    return ok({ error: 'unknown mode' }, 400)
  } catch (e) {
    return ok({ error: (e as Error).message }, 500)
  }
})
