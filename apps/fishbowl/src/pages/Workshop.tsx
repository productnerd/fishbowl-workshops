import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { getTopic } from '@fishbowl/feedback-core'
import { workshopDetail, inviteLink, type WorkshopDetail, type Participant } from '../lib/workshops'

// One workshop: the link and QR code to put on screen, and the roster.
//
// The roster deliberately shows progress and nothing else. A trainer never sees a report,
// an answer, or anything that could be traced back to a person, and the read function
// enforces that rather than trusting this page.

function ShareBlock({ token, topicAccent }: { token: string; topicAccent: string }) {
  const url = inviteLink(token)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: 512,
      color: { dark: '#2a2420', light: '#fdfaf5' },
    })
      .then(setQr)
      .catch(() => setQr(null))
  }, [url])

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="rounded-[2rem] border-[2.5px] border-ink bg-paper-hi p-6 shadow-chunky">
      <p className="kicker text-pink-deep">share with the room</p>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
        {qr && (
          <img
            src={qr}
            alt="QR code for the workshop invite link"
            className="h-40 w-40 shrink-0 rounded-2xl border-[2.5px] border-ink"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-ink-soft">
            Put this on screen. Everyone scans it, creates their own Fishbowl, and shares it with the people who will
            answer about them.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate rounded-full border-2 border-ink/15 bg-paper px-4 py-2 font-mono text-xs text-ink-soft outline-none"
            />
            <button
              onClick={copy}
              className="press shrink-0 cursor-pointer rounded-full border-[2.5px] border-ink px-4 py-1.5 text-sm font-black"
              style={{ background: topicAccent, color: '#fdfaf5' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-3 font-mono text-xs text-ink-soft">
            or type the code: <span className="font-black text-ink">{token}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function Roster({ participants }: { participants: Participant[] }) {
  if (!participants.length) {
    return (
      <div className="mt-6 rounded-3xl border-[2.5px] border-dashed border-ink/30 p-10 text-center">
        <div className="text-4xl">🪑</div>
        <p className="display mt-3 text-lg">Nobody has joined yet</p>
        <p className="mt-1 text-sm text-ink-soft">Share the QR code above and they will appear here.</p>
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink/15">
            <th className="kicker pb-2 text-ink-soft">Participant</th>
            <th className="kicker pb-2 text-ink-soft">Their own read</th>
            <th className="kicker pb-2 text-ink-soft">Answers in</th>
            <th className="kicker pb-2 text-ink-soft">Report</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id} className="border-b border-ink/10">
              <td className="py-3 font-semibold">{p.displayName || <span className="text-ink-soft">unnamed</span>}</td>
              <td className="py-3 text-sm">
                {p.selfDone ? '✓ done' : <span className="text-ink-soft">not yet</span>}
              </td>
              <td className="py-3 text-sm tabular-nums">{p.responseCount}</td>
              <td className="py-3 text-sm">
                {p.reportReadyAt ? (
                  <span className="rounded-full border-2 border-ink bg-pink px-2.5 py-0.5 text-xs font-black">ready</span>
                ) : (
                  <span className="text-ink-soft">waiting</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Workshop() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<{ workshop: WorkshopDetail; participants: Participant[] } | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!id) return
    workshopDetail(id).then((res) => ('error' in res ? setMissing(true) : setData(res)))
  }, [id])

  if (missing) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-5 text-center">
        <div>
          <p className="display text-3xl">We cannot find that workshop.</p>
          <button onClick={() => navigate('/trainer')} className="mt-4 cursor-pointer text-pink-deep underline">
            Back to your workshops
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </div>
    )
  }

  const { workshop, participants } = data
  const topic = getTopic(workshop.topicKey)
  const done = participants.filter((p) => p.reportReadyAt).length

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <button onClick={() => navigate('/trainer')} className="cursor-pointer text-sm text-ink-soft underline">
        ← your workshops
      </button>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-pink-deep">
            {topic.emoji} {topic.name}
            {workshop.clientName ? ` · ${workshop.clientName}` : ''}
          </p>
          <h1 className="display mt-1 text-4xl leading-tight">{workshop.name}</h1>
        </div>
        <div className="flex gap-6">
          <div>
            <div className="display text-3xl">{participants.length}</div>
            <div className="kicker text-ink-soft">joined</div>
          </div>
          <div>
            <div className="display text-3xl">{done}</div>
            <div className="kicker text-ink-soft">reports</div>
          </div>
        </div>
      </div>

      <div className="mt-7">
        <ShareBlock token={workshop.inviteToken} topicAccent={topic.accent} />
      </div>

      <div className="mt-9 flex items-baseline justify-between gap-4">
        <h2 className="display text-2xl">The room</h2>
        <p className="text-xs text-ink-soft">You can see progress, never what anyone said.</p>
      </div>
      <Roster participants={participants} />
    </div>
  )
}
