import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface UseAiInsightsOptions {
  client: SupabaseClient
  table: string // e.g. 'tte_ai_insights' | 'fishbowl_ai_insights'
  fn: string // edge function name, e.g. 'tte-ai-insights'
  isConfigured: () => boolean
}

interface State<T> {
  insights: T | null
  cachedAt: number | null // response_count at the time the cache was generated
  loading: boolean // initial cache read in progress
  regenerating: boolean // user clicked Regenerate
  error: string | null
}

export interface UseAiInsightsResult<T> extends State<T> {
  isStale: boolean
  regenerate: () => Promise<void>
}

// Factory: each app binds its own client + table + edge-function name and gets
// a typed useAiInsights hook. The hook only READS the cached narrative; it never
// triggers Claude from the browser (a DB trigger fires generation at threshold).
// The one exception is regenerate(), which the user explicitly invokes.
export function createUseAiInsights<T>(opts: UseAiInsightsOptions) {
  const { client, table, fn, isConfigured } = opts

  return function useAiInsights(
    sessionId: string | undefined,
    currentResponseCount: number | undefined,
    ready: boolean
  ): UseAiInsightsResult<T> {
    const [state, setState] = useState<State<T>>({
      insights: null,
      cachedAt: null,
      loading: false,
      regenerating: false,
      error: null,
    })

    useEffect(() => {
      if (!sessionId || !ready || !isConfigured()) return

      let cancelled = false
      setState((s) => ({ ...s, loading: true, error: null }))

      const run = async () => {
        const { data: cached, error } = await client
          .from(table)
          .select('insights, response_count_at_generation')
          .eq('session_id', sessionId)
          .maybeSingle()

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

        if (cached?.insights) {
          setState({
            insights: cached.insights as T,
            cachedAt: cached.response_count_at_generation ?? null,
            loading: false,
            regenerating: false,
            error: null,
          })
          return
        }

        // No cache row yet. The DB trigger should have created one at the
        // threshold. If we land here, generation is still in flight or the
        // trigger is not deployed. Surface a static "not ready" state.
        setState({
          insights: null,
          cachedAt: null,
          loading: false,
          regenerating: false,
          error: null,
        })
      }

      run()
      return () => {
        cancelled = true
      }
    }, [sessionId, ready])

    const regenerate = useCallback(async () => {
      if (!sessionId || !isConfigured()) return
      setState((s) => ({ ...s, regenerating: true, error: null }))
      try {
        const { data, error } = await client.functions.invoke(fn, {
          body: { session_id: sessionId, force: true },
        })
        if (error) {
          setState((s) => ({ ...s, regenerating: false, error: error.message }))
          return
        }
        if (!data?.insights) {
          setState((s) => ({ ...s, regenerating: false, error: 'No insights returned' }))
          return
        }

        // Re-read the stored row so the UI always reflects persisted state.
        const { data: stored, error: storedErr } = await client
          .from(table)
          .select('insights, response_count_at_generation')
          .eq('session_id', sessionId)
          .maybeSingle()

        if (storedErr || !stored?.insights) {
          setState((s) => ({
            ...s,
            regenerating: false,
            error: 'Report was generated but could not be stored. Please try again.',
          }))
          return
        }

        setState({
          insights: stored.insights as T,
          cachedAt: stored.response_count_at_generation,
          loading: false,
          regenerating: false,
          error: null,
        })
      } catch (e) {
        setState((s) => ({ ...s, regenerating: false, error: String(e) }))
      }
    }, [sessionId])

    const isStale =
      state.insights !== null &&
      state.cachedAt !== null &&
      typeof currentResponseCount === 'number' &&
      currentResponseCount > state.cachedAt

    return { ...state, isStale, regenerate }
  }
}
