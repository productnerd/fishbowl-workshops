import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { claimToken } from '../lib/self'
import { setSubjectAuth } from '../lib/subjectAuth'
import Card from '../components/Card'

export default function ClaimToken() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) {
      setError(true)
      return
    }
    let done = false
    claimToken(token).then((r) => {
      if (done) return
      if (!r || !r.slug) {
        setError(true)
        return
      }
      setSubjectAuth({ bearer: r.bearer, person_id: r.person_id, slug: r.slug })
      navigate(r.has_self ? `/r/${r.slug}` : `/self/${r.slug}`, { replace: true })
    })
    return () => {
      done = true
    }
  }, [token, navigate])

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
