import { generateSlug, type Session } from '@fishbowl/feedback-core'
import { supabase } from './supabase'

// Fishbowl runs Supabase-only (the backend is live; no localStorage fallback).
export async function createSession(name: string, context?: string): Promise<string> {
  const slug = generateSlug()
  const { error } = await supabase
    .from('fishbowl_sessions')
    .insert({ creator_name: name, slug, response_count: 0, context: context ?? null })
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

export async function submitResponse(
  sessionId: string,
  answers: Record<number, string | number>
): Promise<void> {
  const { error } = await supabase.from('fishbowl_responses').insert({ session_id: sessionId, answers })
  if (error) throw error
}
