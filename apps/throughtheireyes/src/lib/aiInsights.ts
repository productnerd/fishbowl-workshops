import { createUseAiInsights } from '@fishbowl/feedback-core/react'
import { supabase, isSupabaseConfigured } from './supabase'

// B2C report taxonomy — the area keys this app's edge function emits.
export type AreaKey =
  | 'first_impressions'
  | 'talents'
  | 'communication'
  | 'emotional_depth'
  | 'reliability'
  | 'blind_spots'
  | 'in_the_group'
  | 'what_they_love'

export interface AiInsights {
  openingSummary: {
    headline: string
    sections: Array<{ area: AreaKey; insight: string }>
  }
  mc: Record<string, { otherSummary: string }>
  freetext: Record<string, { summary: string }>
  advice: Array<{ area: AreaKey; title: string; action: string[] | string }>
}

// App-local binding: this app's table + edge function + Supabase client.
export const useAiInsights = createUseAiInsights<AiInsights>({
  client: supabase,
  table: 'tte_ai_insights',
  fn: 'tte-ai-insights',
  isConfigured: isSupabaseConfigured,
})
