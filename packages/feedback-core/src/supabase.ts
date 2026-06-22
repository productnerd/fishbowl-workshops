import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Both apps target the SAME Supabase project; only the table prefix differs.
// This factory keeps the package env-agnostic — each app injects its own
// URL/key (Vite import.meta.env in the browser, process.env in CI/edge, etc.).
export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey)
}

export function isSupabaseConfigured(url: string, anonKey: string): boolean {
  return Boolean(url && anonKey)
}
