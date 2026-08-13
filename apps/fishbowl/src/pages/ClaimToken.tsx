import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { claimToken, saveSelf } from '../lib/self'
import { setSubjectAuth } from '../lib/subjectAuth'
import Card from '../components/Card'

export default function ClaimToken() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [error, setError] = useState(false)

  // A magic token is single use, so claiming it twice burns it and the second attempt
  // reports "expired". React runs effects twice in development, and any remount would do
  // the same, so the guard is a ref rather than the cleanup flag: it has to stop the second
  // REQUEST, not just the second state update.
  const claimed = useRef(false)

  useEffect(() => {
    if (!token) {
      setError(true)
      return
    }
    if (claimed.current) return
    claimed.current = true
    const next = params.get('next')
    claimToken(token).then(async (r) => {
      // A trainer link authenticates the PERSON and points at no session, so a missing slug
      // is expected there and only a failure everywhere else.
      if (!r || (!r.slug && next !== 'trainer')) {
        setError(true)
        return
      }
      setSubjectAuth({ bearer: r.bearer, person_id: r.person_id, slug: r.slug ?? '' })
      // Point "my session" at the claimed slug too, so any stale pointer (e.g. an old
      // seeded session) can't keep bouncing the landing/create flows elsewhere. Skipped
      // for a trainer, who has no session to point at.
      try {
        if (r.slug) localStorage.setItem('fishbowl_my_session', JSON.stringify({ slug: r.slug }))
      } catch {
        /* storage unavailable */
      }
      // If they took the self-read before signing in, it's stashed — save it now that
      // we have a key, so their work carries straight into the report.
      let hasSelf = r.has_self
      try {
        const raw = localStorage.getItem('fishbowl_pending_self')
        const pending = raw ? JSON.parse(raw) : null
        if (r.slug && pending?.slug === r.slug && pending.payload) {
          const res = await saveSelf(r.slug, pending.payload)
          if (res.ok) hasSelf = true
          localStorage.removeItem('fishbowl_pending_self')
        }
      } catch {
        /* ignore */
      }
      // Recovery links ask to land on the reports list (so all reports are reachable);
      // everything else goes straight to the claimed report (or its self-read).
      if (next === 'trainer') navigate('/trainer', { replace: true })
      else if (next === 'me') navigate('/me', { replace: true })
      else navigate(hasSelf ? `/r/${r.slug}` : `/self/${r.slug}`, { replace: true })
    })
  }, [token, navigate, params])

  return (
    <div className="grid min-h-dvh place-items-center px-5 text-center">
      {error ? (
        <Card tone="sand" className="w-full max-w-sm p-8">
          <div className="text-5xl">⌛</div>
          <h1 className="display mt-3 text-3xl">Link expired</h1>
          <p className="mt-2 text-ink-soft">
            That link is used up or expired. Request a fresh one from your report or create page.
          </p>
        </Card>
      ) : (
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      )}
    </div>
  )
}
