import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!token) {
      setError(true)
      return
    }
    let done = false
    claimToken(token).then(async (r) => {
      if (done) return
      if (!r || !r.slug) {
        setError(true)
        return
      }
      setSubjectAuth({ bearer: r.bearer, person_id: r.person_id, slug: r.slug })
      // Point "my session" at the claimed slug too, so any stale pointer (e.g. an old
      // seeded session) can't keep bouncing the landing/create flows elsewhere.
      try {
        localStorage.setItem('fishbowl_my_session', JSON.stringify({ slug: r.slug }))
      } catch {
        /* storage unavailable */
      }
      // If they took the self-read before signing in, it's stashed — save it now that
      // we have a key, so their work carries straight into the report.
      let hasSelf = r.has_self
      try {
        const raw = localStorage.getItem('fishbowl_pending_self')
        const pending = raw ? JSON.parse(raw) : null
        if (pending?.slug === r.slug && pending.payload) {
          const res = await saveSelf(r.slug, pending.payload)
          if (res.ok) hasSelf = true
          localStorage.removeItem('fishbowl_pending_self')
        }
      } catch {
        /* ignore */
      }
      if (done) return
      // Recovery links ask to land on the reports list (so all reports are reachable);
      // everything else goes straight to the claimed report (or its self-read).
      const next = params.get('next')
      if (next === 'trainer') navigate('/trainer', { replace: true })
      else if (next === 'me') navigate('/me', { replace: true })
      else navigate(hasSelf ? `/r/${r.slug}` : `/self/${r.slug}`, { replace: true })
    })
    return () => {
      done = true
    }
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
