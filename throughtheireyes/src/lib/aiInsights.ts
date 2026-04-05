import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

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

interface State {
  insights: AiInsights | null
  loading: boolean
  error: string | null
}

export function useAiInsights(sessionId: string | undefined, ready: boolean): State {
  const [state, setState] = useState<State>({ insights: null, loading: false, error: null })

  useEffect(() => {
    if (!sessionId || !ready || !isSupabaseConfigured()) return

    let cancelled = false
    setState({ insights: null, loading: true, error: null })

    // 1. Try cache first (fast path via RLS-gated table read)
    const loadFromCache = async () => {
      const { data: cached } = await supabase
        .from('tte_ai_insights')
        .select('insights')
        .eq('session_id', sessionId)
        .maybeSingle()
      if (cached?.insights && !cancelled) {
        setState({ insights: cached.insights as AiInsights, loading: false, error: null })
        return true
      }
      return false
    }

    // 2. Fall back to invoking the edge function (which generates + caches)
    const loadFromFunction = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('tte-ai-insights', {
          body: { session_id: sessionId },
        })
        if (cancelled) return
        if (error) {
          setState({ insights: null, loading: false, error: error.message })
          return
        }
        if (data?.insights) {
          setState({ insights: data.insights as AiInsights, loading: false, error: null })
        } else {
          setState({ insights: null, loading: false, error: 'No insights returned' })
        }
      } catch (e) {
        if (!cancelled) setState({ insights: null, loading: false, error: String(e) })
      }
    }

    ;(async () => {
      const hit = await loadFromCache()
      if (!hit && !cancelled) await loadFromFunction()
    })()

    return () => {
      cancelled = true
    }
  }, [sessionId, ready])

  return state
}
