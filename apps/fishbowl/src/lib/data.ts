import { generateSlug, type Session, type AnswerValue } from '@fishbowl/feedback-core'
import { supabase } from './supabase'

// Fishbowl runs Supabase-only (the backend is live; no localStorage fallback).
// Ownership is set server-side from the email inside this SECURITY DEFINER RPC —
// the client never asserts creator_person_id (hardened; see fishbowl_session_ownership.sql).
export async function createSession(name: string, context?: string, email?: string): Promise<string> {
  const slug = generateSlug()
  const { error } = await supabase.rpc('fishbowl_create_session', {
    p_name: name,
    p_slug: slug,
    p_context: context ?? null,
    p_email: email?.trim() || null,
  })
  if (error) throw error
  return slug
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
