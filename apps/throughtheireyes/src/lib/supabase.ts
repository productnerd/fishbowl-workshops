import { createSupabaseClient, isSupabaseConfigured as cfg } from '@fishbowl/feedback-core'

// App-local binding layer: inject this app's env into the generic core factory.
const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createSupabaseClient(url, anonKey)

export const isSupabaseConfigured = () => cfg(url, anonKey)
