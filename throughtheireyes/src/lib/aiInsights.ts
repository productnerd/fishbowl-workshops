import { useCallback, useEffect, useState } from 'react'
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
  cachedAt: number | null // response_count the cache was generated from
  loading: boolean // initial fetch in progress (no cache yet)
  regenerating: boolean // user clicked regenerate
  error: string | null
}

interface UseAiInsightsResult extends State {
  isStale: boolean
  regenerate: () => Promise<void>
}

export function useAiInsights(
  sessionId: string | undefined,
  currentResponseCount: number | undefined,
  ready: boolean
): UseAiInsightsResult {
  const [state, setState] = useState<State>({
    insights: null,
    cachedAt: null,
    loading: false,
    regenerating: false,
    error: null,
  })

  // Cache-first fetch
  useEffect(() => {
    if (!sessionId || !ready || !isSupabaseConfigured()) return

    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    const run = async () => {
      // 1. Try cache
      const { data: cached } = await supabase
        .from('tte_ai_insights')
        .select('insights, response_count_at_generation')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (cancelled) return

      if (cached?.insights) {
        setState({
          insights: cached.insights as AiInsights,
          cachedAt: cached.response_count_at_generation ?? null,
          loading: false,
          regenerating: false,
          error: null,
        })
        return
      }

      // 2. No cache yet, fall through to on-demand generation (edge function)
      //    This path only runs if the DB trigger hasn't fired / finished yet.
      try {
        const { data, error } = await supabase.functions.invoke('tte-ai-insights', {
          body: { session_id: sessionId },
        })
        if (cancelled) return
        if (error) {
          setState({
            insights: null,
            cachedAt: null,
            loading: false,
            regenerating: false,
            error: error.message,
          })
          return
        }
        if (data?.insights) {
          setState({
            insights: data.insights as AiInsights,
            cachedAt: currentResponseCount ?? null,
            loading: false,
            regenerating: false,
            error: null,
          })
        } else {
          setState({
            insights: null,
            cachedAt: null,
            loading: false,
            regenerating: false,
            error: 'No insights returned',
          })
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            insights: null,
            cachedAt: null,
            loading: false,
            regenerating: false,
            error: String(e),
          })
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [sessionId, ready, currentResponseCount])

  const regenerate = useCallback(async () => {
    if (!sessionId || !isSupabaseConfigured()) return
    setState((s) => ({ ...s, regenerating: true, error: null }))
    try {
      const { data, error } = await supabase.functions.invoke('tte-ai-insights', {
        body: { session_id: sessionId, force: true },
      })
      if (error) {
        setState((s) => ({ ...s, regenerating: false, error: error.message }))
        return
      }
      if (data?.insights) {
        setState({
          insights: data.insights as AiInsights,
          cachedAt: currentResponseCount ?? null,
          loading: false,
          regenerating: false,
          error: null,
        })
      } else {
        setState((s) => ({ ...s, regenerating: false, error: 'No insights returned' }))
      }
    } catch (e) {
      setState((s) => ({ ...s, regenerating: false, error: String(e) }))
    }
  }, [sessionId, currentResponseCount])

  const isStale =
    state.insights !== null &&
    state.cachedAt !== null &&
    typeof currentResponseCount === 'number' &&
    currentResponseCount > state.cachedAt

  return { ...state, isStale, regenerate }
}
