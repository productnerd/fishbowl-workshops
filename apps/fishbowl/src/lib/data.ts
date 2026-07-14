import { generateSlug, type Session, type AnswerValue } from '@fishbowl/feedback-core'
import { supabase } from './supabase'

// Creates the session AND mints a device key so the creating browser owns it — the
// self-read then saves and the report unlocks with no magic link. Ownership + the
// bearer are minted server-side (service-role) in fishbowl-create-session.
export async function createSession(
  name: string,
  context?: string,
  email?: string
): Promise<{ slug: string; bearer: string; person_id: string }> {
  const slug = generateSlug()
  const { data, error } = await supabase.functions.invoke('fishbowl-create-session', {
    body: { name, slug, context: context ?? '', email: email?.trim() || '' },
  })
  // Guardrail hit: a 3rd+ report inside the 3-month window. Surface it with the retry date.
  if (data?.error === 'too_soon') {
    const e = new Error('too_soon') as Error & { retryAt?: string }
    e.retryAt = data.retry_at
    throw e
  }
  if (error || !data || data.error || !data.bearer) throw new Error(data?.error || 'could not create session')
  return { slug: data.slug ?? slug, bearer: data.bearer, person_id: data.person_id }
}

// Every report this person owns (via their device bearer), newest first — the data
// behind the "your reports" screen. One person can accumulate several over time.
export interface MyReport {
  slug: string
  name: string
  respondents: number
  createdAt: string
  generatedAt: string | null
  ready: boolean
  selfDone: boolean
  deepRead: boolean
}
export async function getMyReports(bearer: string): Promise<MyReport[]> {
  try {
    const { data, error } = await supabase.functions.invoke('fishbowl-my-reports', { body: { bearer } })
    if (error || !data || data.error) return []
    return (data.reports as MyReport[]) ?? []
  } catch {
    return []
  }
}

// Does this email already own a Fishbowl? Lets the create form offer "retrieve vs.
// start new" instead of silently minting a duplicate. Boolean only (see the edge fn);
// fails open to false so a flaky check never blocks someone from creating.
export async function emailHasSession(email: string): Promise<boolean> {
  const e = email.trim()
  if (!e.includes('@')) return false
  try {
    const { data, error } = await supabase.functions.invoke('fishbowl-check-email', { body: { email: e } })
    if (error) return false
    return Boolean(data?.exists)
  } catch {
    return false
  }
}

// Fetch the shared viewer key for a DEMO session (public, non-expiring). Powers the
// /demo/<slug> link that can be shared with many people. Returns null for non-demo slugs.
export async function getDemoBearer(slug: string): Promise<{ bearer: string; person_id: string; slug: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('fishbowl-demo-bearer', { body: { slug } })
    if (error || !data || data.error || !data.bearer) return null
    return { bearer: data.bearer, person_id: data.person_id, slug: data.slug }
  } catch {
    return null
  }
}

// Email the owner a one-tap link to their latest report (magic link, no slug needed).
// Owner-verified: only the mailbox holder can act on it, so it never leaks a session.
export async function recoverLatestResults(email: string): Promise<void> {
  await supabase.functions.invoke('fishbowl-send-magic-link', { body: { email: email.trim(), slug: '' } })
}

export async function getSession(slug: string): Promise<Session | null> {
  const { data } = await supabase.from('fishbowl_sessions').select('*').eq('slug', slug).maybeSingle()
  return (data as Session) ?? null
}

export async function getResponseCount(slug: string): Promise<number> {
  const { data } = await supabase
    .from('fishbowl_sessions')
    .select('response_count')
    .eq('slug', slug)
    .maybeSingle()
  return data?.response_count ?? 0
}

// Submits via a SECURITY DEFINER fn so the respondent's identity (if given) is
// recorded in a separate table — never on the answer row the subject can read.
export async function submitResponse(
  sessionId: string,
  answers: Record<string | number, AnswerValue>,
  email?: string
): Promise<void> {
  const { error } = await supabase.rpc('fishbowl_submit_response', {
    p_session_id: sessionId,
    p_answers: answers,
    p_email: email?.trim() || null,
  })
  if (error) throw error
}
