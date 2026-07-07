import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// A reaction the report AI chose for a text-heavy slide. Loads public/gifs/<name>.mp4
// (the GIFs are shipped as tiny looping muted videos, ~100x smaller than real GIFs) and
// quietly renders nothing if the name is empty or the file is missing, so the feature ships
// dormant until real files are dropped in. One per slide; the deck caps the total.
export default function GifReaction({ name }: { name?: string | null }) {
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()

  // Browsers skip `autoplay` for videos that mount off-screen (e.g. below the fold of a
  // long card) and races can eat the loadeddata event, so nudge playback ourselves: a few
  // capped retries after mount, plus once more when the reaction scrolls into view. Muted
  // looping video is always allowed to start programmatically.
  const play = () => videoRef.current?.play().catch(() => {})
  useEffect(() => {
    if (!name || failed) return
    let tries = 0
    const t = setInterval(() => {
      const v = videoRef.current
      if (!v || !v.paused || ++tries > 8) return clearInterval(t)
      v.play().catch(() => {})
    }, 400)
    return () => clearInterval(t)
  }, [name, failed])

  if (!name || failed) return null

  return (
    <motion.div
      key={name}
      className="mt-5 flex justify-center"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 8 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      onViewportEnter={play}
      transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 320, damping: 20 }}
    >
      <video
        ref={videoRef}
        src={`${import.meta.env.BASE_URL}gifs/${name}.mp4`}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        onError={() => setFailed(true)}
        onLoadedData={play}
        className="max-h-52 w-auto max-w-[220px] rounded-2xl border-[2.5px] border-ink object-contain shadow-chunky-sm"
      />
    </motion.div>
  )
}
