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
  if (error || !data || data.error || !data.bearer) throw new Error(data?.error || 'could not create session')
  return { slug: data.slug ?? slug, bearer: data.bearer, person_id: data.person_id }
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
