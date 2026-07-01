import { useState } from 'react'
import { requestMagicLink } from '../lib/self'

// Shown on a locked report: a returning owner whose browser forgot them can email
// themselves a fresh unlock link (works only if the email matches the session owner;
// the server never reveals whether it did — always the same reassuring message).
export default function RelinkPrompt({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const send = async () => {
    if (!email.trim() || busy) return
    setBusy(true)
    await requestMagicLink(email.trim(), slug)
    setBusy(false)
    setSent(true)
  }

  if (sent) {
    return (
      <p className="mt-6 text-sm font-semibold text-ink/75">
        ✉️ If that address is on this report, your unlock link is on its way. Check your inbox.
      </p>
    )
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 cursor-pointer text-sm font-semibold text-ink/70 underline underline-offset-2 hover:text-ink"
      >
        Already did this on another device? Email me my link →
      </button>
    )
  }
  return (
    <div className="mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        placeholder="the email on this report"
        className="min-w-0 flex-1 rounded-xl border-[2.5px] border-ink bg-paper-hi px-4 py-2.5 text-ink outline-none"
      />
      <button
        onClick={send}
        disabled={busy}
        className="press shrink-0 cursor-pointer rounded-xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-2.5 font-display font-black text-ink shadow-chunky-sm"
      >
        {busy ? 'Sending…' : 'Send my link'}
      </button>
    </div>
  )
}
