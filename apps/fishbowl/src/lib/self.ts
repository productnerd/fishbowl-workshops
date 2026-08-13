import type { BigFiveScores, MbtiType } from '@fishbowl/feedback-core'
import { sessionTopicKey } from './sessionTopic'
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

export interface SelfSynthesis {
  title: string
  portrait: string
  sections: { heading: string; body: string }[]
  practice?: string[]
  actionPlan?: { stopNow: string[]; startNow: string[]; stopNext: string[]; startNext: string[] }
  captions?: Record<string, string>
  throughLine?: { from: string; via: string[]; to: string }
  constellation?: { label: string; words: string[] }[]
  oneOnOne?: string[]
  biases?: string[]
  greatAt?: { label: string; why: string }[]
  // How you come across: your hoped-for image held up against the team's aura read + words.
  howYouComeAcross?: string
  // Soft spots: the tender, reassurance-first "insecurities" read, AI-written from
  // the feared self + self-vs-team gaps. Empty strings when there's nothing honest to say.
  softSpots?: { heading: string; body: string }
  n: number
}

// The deep, cross-referenced "full read" (bearer-gated). It's generated with extended
// thinking server-side and takes ~2 minutes — longer than the 150s edge idle timeout —
// so generation runs as a BACKGROUND task: `synthesisStart` kicks it off and returns
// immediately, then the client polls `synthesisPoll` until it's ready. The subject also
// gets an email when it finishes, so they can close the tab and come back.
export type SynthStatus = 'ready' | 'generating' | 'error' | 'idle'
export interface SynthResult {
  status: SynthStatus
  synthesis: SelfSynthesis | null
}

type Archetype = { name: string; essence: string; light: string; shadow: string; runnerUp?: string } | null

// Kick off (or reuse) a background generation. Returns 'ready' immediately if it's
// already cached, otherwise 'generating' after launching the background task.
export async function synthesisStart(slug: string, archetype: Archetype, force = false): Promise<SynthResult> {
  const auth = getSubjectAuth()
  if (!auth) return { status: 'idle', synthesis: null }
  const { data, error } = await supabase.functions.invoke('fishbowl-synthesis', {
    body: { bearer: auth.bearer, slug, archetype, force, mode: 'start', topic_key: sessionTopicKey(slug) },
  })
  if (error || !data || data.error) return { status: 'error', synthesis: null }
  return { status: (data.status as SynthStatus) ?? 'idle', synthesis: (data.synthesis as SelfSynthesis) ?? null }
}

// Cheap status poll (no generation). Used on an interval while status is 'generating'.
export async function synthesisPoll(slug: string): Promise<SynthResult> {
  const auth = getSubjectAuth()
  if (!auth) return { status: 'idle', synthesis: null }
  const { data, error } = await supabase.functions.invoke('fishbowl-synthesis', {
    body: { bearer: auth.bearer, slug, mode: 'status' },
  })
  if (error || !data || data.error) return { status: 'error', synthesis: null }
  return { status: (data.status as SynthStatus) ?? 'idle', synthesis: (data.synthesis as SelfSynthesis) ?? null }
}

export interface WorkManual {
  entries: { key: string; stem: string; text: string }[]
  // Two AI-cast working-style personas (who you'd clash with vs thrive with), produced by the
  // same lightweight work-manual call so the big synthesis stays lean.
  colleagueFit?: { clashWith: string; thriveWith: string }
  n: number
}

// The Work Manual is its own focused AI call (kept out of the big synthesis so each
// heavy narrative stays sharp). It rarely changes once the team report is in, so we
// cache it client-side in localStorage keyed by (slug, response_count) instead of
// adding a DB column. Returns null until a team report + self-read both exist.
export async function getWorkManual(slug: string, n: number): Promise<WorkManual | null> {
  const auth = getSubjectAuth()
  if (!auth) return null
  const cacheKey = `fb_workmanual_v3_${slug}_${n}`
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached) as WorkManual
  } catch {
    // ignore malformed cache
  }
  const { data, error } = await supabase.functions.invoke('fishbowl-workmanual', {
    body: { bearer: auth.bearer, slug },
  })
  if (error || !data || data.error || !data.manual) return null
  const manual = data.manual as WorkManual
  try {
    localStorage.setItem(cacheKey, JSON.stringify(manual))
  } catch {
    // storage full / disabled — fine, we just refetch next time
  }
  return manual
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
