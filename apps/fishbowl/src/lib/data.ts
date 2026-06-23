import { generateSlug, type Session } from '@fishbowl/feedback-core'
import { supabase } from './supabase'

// Fishbowl runs Supabase-only (the backend is live; no localStorage fallback).
export async function createSession(name: string, context?: string, email?: string): Promise<string> {
  const slug = generateSlug()
  let creator_person_id: string | null = null
  if (email && email.trim()) {
    const { data } = await supabase.rpc('fishbowl_identify', { p_email: email.trim(), p_name: name })
    creator_person_id = (data as string) ?? null
  }
  const { error } = await supabase
    .from('fishbowl_sessions')
    .insert({ creator_name: name, slug, response_count: 0, context: context ?? null, creator_person_id })
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
  answers: Record<number, string | number>,
  email?: string
): Promise<void> {
  const { error } = await supabase.rpc('fishbowl_submit_response', {
    p_session_id: sessionId,
    p_answers: answers,
    p_email: email?.trim() || null,
  })
  if (error) throw error
}
