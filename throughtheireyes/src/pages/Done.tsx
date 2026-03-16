import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Session } from '../types'

export default function Done() {
  const { slug } = useParams<{ slug: string }>()
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!slug) return
      if (isSupabaseConfigured()) {
        const { data } = await supabase.from('sessions').select('*').eq('slug', slug).single()
        if (data) setSession(data)
      } else {
        const sessions = JSON.parse(localStorage.getItem('tte_sessions') || '{}')
        if (sessions[slug]) setSession(sessions[slug])
      }
    }
    load()
  }, [slug])

  const remaining = session ? Math.max(0, 6 - session.response_count) : '...'

  return (
    <div className="card-screen text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-7xl"
        >
          🙏
        </motion.div>

        <h1 className="text-3xl font-bold">Thank you!</h1>

        <p className="text-lg text-text-secondary leading-relaxed">
          Your honest answers will help{' '}
          <span className="text-primary-light font-semibold">{session?.creator_name || '...'}</span>{' '}
          see themselves in a new light.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-white/5 rounded-2xl border border-white/10 w-full"
        >
          {remaining === 0 ? (
            <p className="text-success font-semibold">
              ✨ Results are now ready to be unlocked!
            </p>
          ) : (
            <p className="text-text-secondary">
              <span className="text-2xl font-bold text-primary-light">{remaining}</span>
              <br />
              more {remaining === 1 ? 'response' : 'responses'} needed to unlock results
            </p>
          )}
        </motion.div>

        <p className="text-sm text-text-secondary mt-4">
          Everything you shared is completely anonymous.
          <br />
          {session?.creator_name} will never know which answers are yours.
        </p>
      </motion.div>
    </div>
  )
}
