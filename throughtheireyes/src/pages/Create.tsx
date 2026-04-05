import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import Button from '../components/ui/Button'

function generateSlug(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'
  let slug = ''
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)]
  }
  return slug
}

export default function Create() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const slug = generateSlug()

    if (isSupabaseConfigured()) {
      const { error: dbError } = await supabase.from('tte_sessions').insert({
        creator_name: name.trim(),
        slug,
        response_count: 0,
      })
      if (dbError) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }
    } else {
      // Demo mode: store in localStorage
      const sessions = JSON.parse(localStorage.getItem('tte_sessions') || '{}')
      sessions[slug] = {
        id: crypto.randomUUID(),
        creator_name: name.trim(),
        slug,
        created_at: new Date().toISOString(),
        response_count: 0,
      }
      localStorage.setItem('tte_sessions', JSON.stringify(sessions))
    }

    const base = window.location.origin + window.location.pathname
    setShareLink(`${base}#/s/${slug}`)
    setLoading(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Through Their Eyes',
        text: `Hey! I want to see myself through your eyes. Answer a few anonymous questions about me?`,
        url: shareLink,
      })
    } else {
      handleCopy()
    }
  }

  if (shareLink) {
    return (
      <div className="card-screen text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 max-w-lg"
        >
          <div className="text-6xl">🔗</div>
          <h1 className="text-3xl font-bold">Your link is ready!</h1>
          <p className="text-text-secondary">
            Share this with at least 6 friends. Once they all answer, your results will unlock.
          </p>

          <div className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
            <input
              readOnly
              value={shareLink}
              className="flex-1 bg-transparent text-sm text-text-primary truncate outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-primary rounded-xl text-sm font-medium text-white shrink-0 cursor-pointer hover:bg-primary-dark transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <Button onClick={handleShare}>
            Share with friends
          </Button>

          <button
            onClick={() => navigate(`/results/${shareLink.split('/s/')[1]}`)}
            className="text-sm text-text-secondary hover:text-text-primary cursor-pointer transition-colors mt-2"
          >
            Go to your results page →
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="card-screen text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 max-w-lg w-full"
      >
        <div className="text-5xl">✏️</div>
        <h1 className="text-3xl font-bold">What's your first name?</h1>
        <p className="text-text-secondary">
          This is how your friends will see you in the questions.
          <br />
          e.g. "What is <span className="text-primary-light">Alex</span>'s superpower?"
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Your first name"
          autoFocus
          maxLength={30}
          className="w-full max-w-sm px-6 py-4 rounded-2xl bg-white/5 border-2 border-white/10 text-center text-xl font-medium text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50 transition-all"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button onClick={handleCreate} disabled={!name.trim() || loading}>
          {loading ? 'Creating...' : 'Create my link'}
        </Button>
      </motion.div>
    </div>
  )
}
