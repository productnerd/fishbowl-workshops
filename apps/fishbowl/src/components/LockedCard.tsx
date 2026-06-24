import type { ReactNode } from 'react'

// Renders the real card underneath, blurred + inert, with a lock prompt overlay.
// Tapping calls onUnlock (routes the subject to their self-assessment).
export default function LockedCard({
  caption,
  onUnlock,
  children,
}: {
  caption: string
  onUnlock: () => void
  children: ReactNode
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-60 blur-sm" aria-hidden>
        {children}
      </div>
      <button onClick={onUnlock} className="absolute inset-0 grid cursor-pointer place-items-center p-4">
        <div className="card-3d sc-pink flex max-w-xs flex-col items-center gap-2 bg-pink px-6 py-5 text-center">
          <span className="text-3xl">🔒</span>
          <p className="font-semibold text-ink">{caption}</p>
          <span className="kicker text-pink-deep">tap to unlock →</span>
        </div>
      </button>
    </div>
  )
}
