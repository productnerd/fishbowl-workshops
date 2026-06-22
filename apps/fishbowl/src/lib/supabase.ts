import { createSupabaseClient, isSupabaseConfigured as cfg } from '@fishbowl/feedback-core'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createSupabaseClient(url, anonKey)
export const isSupabaseConfigured = () => cfg(url, anonKey)
