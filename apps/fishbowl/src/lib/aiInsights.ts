import { createUseAiInsights } from '@fishbowl/feedback-core/react'
import { supabase, isSupabaseConfigured } from './supabase'
import type { FishbowlReport } from '../types'

export const useAiInsights = createUseAiInsights<FishbowlReport>({
  client: supabase,
  table: 'fishbowl_ai_insights',
  fn: 'fishbowl-ai-insights',
  isConfigured: isSupabaseConfigured,
})
