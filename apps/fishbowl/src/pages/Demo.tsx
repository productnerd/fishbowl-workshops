import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getDemoBearer } from '../lib/data'
import { setSubjectAuth } from '../lib/subjectAuth'

// Public, non-expiring demo entry point. Grabs the shared viewer key for a demo session,
// stores it on this device, and opens the full report — so a single /demo/<slug> link can
// be shared with a lot of people and each of them sees everything, no sign-in.
export default function Demo() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!slug) {
      navigate('/', { replace: true })
      return
    }
    let done = false
    getDemoBearer(slug).then((r) => {
      if (done) return
      if (!r) {
        navigate('/', { replace: true })
        return
      }
      setSubjectAuth({ bearer: r.bearer, person_id: r.person_id, slug: r.slug })
      navigate(`/r/${r.slug}`, { replace: true })
    })
    return () => {
      done = true
    }
  }, [slug, navigate])

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
        🐟
      </motion.div>
    </div>
  )
}
