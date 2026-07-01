import type { BigFiveScores, MbtiType } from '@fishbowl/feedback-core'
import { supabase } from './supabase'
import { getSubjectAuth, clearSubjectAuth } from './subjectAuth'

export interface SelfData {
  ocean_answers: Record<string, number>
  big_five: BigFiveScores | null
  mbti: MbtiType | null
  completed: boolean
  responsibilities: string[]
  self_payload: Record<string, unknown>
}

// Subject asks for a private link by email. In dev (no Resend configured), the
// edge fn returns the claim URL directly so the flow is testable.
export async function requestMagicLink(email: string, slug: string): Promise<{ ok: boolean; devClaimUrl?: string }> {
  const { data, error } = await supabase.functions.invoke('fishbowl-send-magic-link', { body: { email, slug } })
  if (error) return { ok: false }
  return { ok: true, devClaimUrl: data?.devClaimUrl }
}

export async function claimToken(
  token: string
): Promise<{ bearer: string; person_id: string; slug: string; has_self: boolean } | null> {
  const { data, error } = await supabase.functions.invoke('fishbowl-claim-token', { body: { token } })
  if (error || !data || data.error) return null
  return data
}

// Fetches the subject's private self data (bearer-gated). authed=false when there's
// no bearer or it doesn't own this slug — caller then treats self sections as locked.
export async function getSelfReport(
  slug: string
): Promise<{ authed: boolean; hasSelf: boolean; self: SelfData | null }> {
  const auth = getSubjectAuth()
  if (!auth) return { authed: false, hasSelf: false, self: null }
  const { data, error } = await supabase.functions.invoke('fishbowl-self-report', { body: { bearer: auth.bearer, slug } })
  if (error || !data || data.error) {
    // Dead/expired device key: drop it so the app can re-establish identity instead of
    // looping on a locked report. (Not on 'forbidden'/'not found' — the key is fine there.)
    if (data?.error === 'unauthorized') clearSubjectAuth()
    return { authed: false, hasSelf: false, self: null }
  }
  return { authed: true, hasSelf: Boolean(data.hasSelf), self: (data.self as SelfData) ?? null }
}

export interface SelfInsight {
  headline: string
  insights: string[]
  n: number
}

export interface SelfSynthesis {
  title: string
  portrait: string
  sections: { heading: string; body: string }[]
  practice: string[]
  captions?: Record<string, string>
  throughLine?: { from: string; via: string[]; to: string }
  n: number
}

// The deep, cross-referenced "full read" (bearer-gated, generated with extended
// thinking server-side, cached on the self row). Pass the derived archetype so the
// synthesis can weave it in. Returns null until a team report + self-read both exist.
export async function getSynthesis(
  slug: string,
  archetype: { name: string; essence: string; light: string; shadow: string; runnerUp?: string } | null,
  force = false
): Promise<SelfSynthesis | null> {
  const auth = getSubjectAuth()
  if (!auth) return null
  const { data, error } = await supabase.functions.invoke('fishbowl-synthesis', {
    body: { bearer: auth.bearer, slug, archetype, force },
  })
  if (error || !data || data.error) return null
  return (data.synthesis as SelfSynthesis) ?? null
}

// The private "you vs your team" narrative. Bearer-gated and generated server-side;
// returns null until a team report exists. Cached on the self row, regenerated when
// the team report grows (or force=true).
export async function getSelfInsight(slug: string, force = false): Promise<SelfInsight | null> {
  const auth = getSubjectAuth()
  if (!auth) return null
  const { data, error } = await supabase.functions.invoke('fishbowl-self-insight', {
    body: { bearer: auth.bearer, slug, force },
  })
  if (error || !data || data.error) return null
  return (data.insight as SelfInsight) ?? null
}

// Finish an ungated self-assessment: identify the email, claim the session, mint a
// device bearer and save the self-read in one call. Returns the bearer to store
// locally so the report opens with the self-view immediately.
export async function finishSelf(
  email: string,
  slug: string,
  payload: {
    ocean_answers: Record<string, number>
    big_five: BigFiveScores
    mbti: MbtiType
    self_payload?: Record<string, unknown>
    responsibilities?: string[]
    completed: boolean
  }
): Promise<{ ok: boolean; bearer?: string; person_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('fishbowl-finish-self', {
    body: { email, slug, ...payload },
  })
  if (error) return { ok: false, error: 'network' }
  if (!data || data.error) return { ok: false, error: data?.error }
  return { ok: true, bearer: data.bearer, person_id: data.person_id }
}

export async function saveSelf(
  slug: string,
  payload: {
    ocean_answers: Record<string, number>
    big_five: BigFiveScores
    mbti: MbtiType
    self_payload?: Record<string, unknown>
    responsibilities?: string[]
    completed: boolean
  }
): Promise<{ ok: boolean }> {
  const auth = getSubjectAuth()
  if (!auth) return { ok: false }
  const { data, error } = await supabase.functions.invoke('fishbowl-save-self', {
    body: { bearer: auth.bearer, slug, ...payload },
  })
  if (error || !data || data.error) return { ok: false }
  return { ok: true }
}
