import { useEffect, useRef, useState } from 'react'

// Looping background music for the report, with a mute toggle whose icon flips.
//
// The track ships separately: drop a LICENSED / royalty-free file at
// `public/audio/report-theme.mp3` and this lights up on its own. Until then (or if the
// file 404s) the component renders NOTHING, so a dead button never appears over a
// silent report.
//
// Autoplay with sound is blocked until the visitor interacts with the page, so playback
// latches onto their first tap or key rather than failing noisily on mount.
const TRACK = `${import.meta.env.BASE_URL}audio/report-theme.mp3`
const KEY = 'fishbowl_music_muted'

const readMuted = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function BackgroundMusic() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(readMuted)

  useEffect(() => {
    const a = new Audio(TRACK)
    a.loop = true
    a.volume = 0.22 // a bed under the reading, not a soundtrack over it
    a.preload = 'auto'
    ref.current = a

    const onReady = () => setReady(true)
    const onFail = () => setReady(false)
    a.addEventListener('canplaythrough', onReady)
    a.addEventListener('error', onFail)

    // First gesture unlocks audio; honour a stored mute so we never override the choice.
    const start = () => {
      if (ref.current && !readMuted()) void ref.current.play().catch(() => {})
    }
    window.addEventListener('pointerdown', start, { once: true })
    window.addEventListener('keydown', start, { once: true })

    return () => {
      a.removeEventListener('canplaythrough', onReady)
      a.removeEventListener('error', onFail)
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      a.pause()
      ref.current = null
    }
  }, [])

  const toggle = () => {
    const next = !muted
    setMuted(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      /* storage disabled; the toggle still works for this session */
    }
    const a = ref.current
    if (!a) return
    if (next) a.pause()
    else void a.play().catch(() => {})
  }

  if (!ready) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? 'Unmute background music' : 'Mute background music'}
      aria-pressed={!muted}
      className="press fixed right-14 top-2 z-40 grid h-10 w-10 cursor-pointer place-items-center rounded-full border-2 border-ink/30 bg-paper-hi/70 text-ink/70 opacity-50 backdrop-blur-sm transition-opacity hover:opacity-100 sm:right-16 sm:top-5"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4z" fill="currentColor" stroke="none" />
        {muted ? (
          <>
            <line x1="16" y1="9.5" x2="21" y2="14.5" />
            <line x1="21" y1="9.5" x2="16" y2="14.5" />
          </>
        ) : (
          <>
            <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path d="M18.2 6.8a7.6 7.6 0 0 1 0 10.4" />
          </>
        )}
      </svg>
    </button>
  )
}
