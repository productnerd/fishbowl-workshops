import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BIG_FIVE_ITEMS,
  scoreBigFive,
  deriveType,
  RESPONSIBILITY_TIERS,
  MAX_RESPONSIBILITIES,
  BELBIN_ROLES,
  BELBIN_TOTAL,
  VIA_STRENGTHS,
  VIA_PICK,
  JOHARI_ADJECTIVES,
  JOHARI_MIN,
  JOHARI_MAX,
  type BigFiveScores,
  type MbtiType,
  type EnergizerTags,
  type ResponsibilityTiers,
  type HatScores,
} from '@fishbowl/feedback-core'
import { requestMagicLink, saveSelf, getSelfReport } from '../lib/self'
import { getSubjectAuth } from '../lib/subjectAuth'
import { playTick } from '../lib/sound'
import LikertScale from '../components/LikertScale'
import Button from '../components/Button'
import Card from '../components/Card'
import OceanDials from '../components/OceanDials'
import TypeCard from '../components/TypeCard'
import EnergizerTagger from '../components/EnergizerTagger'
import HatsTagger from '../components/HatsTagger'
import AllocationTagger from '../components/AllocationTagger'
import ChipPicker from '../components/ChipPicker'

export default function SelfAssessment() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<
    'checking' | 'email' | 'quiz' | 'reveal' | 'energizers' | 'responsibilities' | 'frameworks'
  >('checking')

  // Verify the bearer actually OWNS this slug before letting them self-assess. A
  // bearer for a different session can't save here, so we'd otherwise let them
  // fill the whole thing, fail the save, and bounce them to a self-less report.
  useEffect(() => {
    if (!slug) return
    if (!getSubjectAuth()) {
      setPhase('email')
      return
    }
    let cancelled = false
    getSelfReport(slug).then((r) => {
      if (!cancelled) setPhase(r.authed ? 'quiz' : 'email')
    })
    return () => {
      cancelled = true
    }
  }, [slug])
  const [energizerTags, setEnergizerTags] = useState<EnergizerTags>({})
  const [responsibilities, setResponsibilities] = useState<string[]>([''])
  const [respTiers, setRespTiers] = useState<ResponsibilityTiers>({})
  // Optional "deeper read" self inputs (name-neutral frameworks).
  const [fwIdx, setFwIdx] = useState(0)
  const [selfHats, setSelfHats] = useState<HatScores>({})
  const [selfBelbin, setSelfBelbin] = useState<Record<string, number>>({})
  const [selfVia, setSelfVia] = useState<string[]>([])
  const [selfJohari, setSelfJohari] = useState<string[]>([])

  // ── email gate ──
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [devUrl, setDevUrl] = useState<string | null>(null)

  const sendLink = async () => {
    if (!email.trim() || !slug) return
    setSending(true)
    const r = await requestMagicLink(email.trim(), slug)
    setSending(false)
    setSent(true)
    if (r.devClaimUrl) setDevUrl(r.devClaimUrl)
  }

  // ── quiz ──
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [bigFive, setBigFive] = useState<BigFiveScores | null>(null)
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const q = BIG_FIVE_ITEMS[Math.min(i, BIG_FIVE_ITEMS.length - 1)]
  const pct = ((i + 1) / BIG_FIVE_ITEMS.length) * 100

  const pick = (v: number) => {
    playTick()
    const isLast = i === BIG_FIVE_ITEMS.length - 1
    const next = { ...answers, [q.id]: v }
    setAnswers(next)
    setTimeout(() => {
      if (isLast) {
        const bf = scoreBigFive(next)
        setBigFive(bf)
        setMbti(deriveType(bf))
        setPhase('reveal')
      } else {
        setI((c) => Math.min(c + 1, BIG_FIVE_ITEMS.length - 1))
      }
    }, 320)
  }

  const save = async () => {
    if (!slug || !bigFive || !mbti) return
    setSaving(true)
    setSaveError(false)
    const resp = responsibilities.map((r) => r.trim()).filter(Boolean).slice(0, MAX_RESPONSIBILITIES)
    const res = await saveSelf(slug, {
      ocean_answers: answers,
      big_five: bigFive,
      mbti,
      responsibilities: resp,
      self_payload: {
        energizers: energizerTags,
        responsibility_tiers: respTiers,
        hats: selfHats,
        belbin: selfBelbin,
        via: selfVia,
        johari: selfJohari,
      },
      completed: true,
    })
    // Only move on if it actually saved — otherwise the report would load with no
    // self and re-nag them. On success, suppress the "take it first" modal for good.
    if (!res.ok) {
      setSaving(false)
      setSaveError(true)
      return
    }
    localStorage.setItem(`fishbowl_self_nudge_seen_${slug}`, '1')
    navigate(`/r/${slug}`)
  }

  // ── render ──
  if (phase === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </div>
    )
  }

  if (phase === 'email') {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <Card tone="paper" className="p-7">
            <div className="text-5xl">🪞</div>
            <h1 className="display mt-3 text-4xl">Your self-read</h1>
            {!sent ? (
              <>
                <p className="mt-2 text-ink-soft">
                  Enter your email and we'll send a private link to your self-assessment and your report.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendLink()}
                  autoFocus
                  placeholder="you@work.com"
                  className="mt-5 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-center text-base text-ink shadow-chunky-sm outline-none focus:shadow-chunky"
                />
                <div className="mt-5">
                  <Button variant="blue" onClick={sendLink} disabled={sending || !email.trim()}>
                    {sending ? 'Sending…' : 'Send my link →'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-lg text-ink-soft">
                  ✉️ Check your email for your private link.
                </p>
                {devUrl && (
                  <div className="mt-5">
                    <Button variant="pink" onClick={() => navigate('/' + devUrl.split('#/')[1])}>
                      Continue (dev) →
                    </Button>
                    <p className="mt-2 text-xs text-ink-soft">Dev mode: email isn't wired yet, so use this link.</p>
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </div>
    )
  }

  if (phase === 'reveal' && bigFive && mbti) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker text-pink-deep">this is you, by you</p>
          <h1 className="display mt-2 text-4xl">Your self-read</h1>
          <div className="mt-6">
            <TypeCard mbti={mbti} />
          </div>
          <div className="mt-6">
            <Card tone="paper" className="p-6">
              <p className="kicker mb-4 text-blue-deep">your five traits</p>
              <OceanDials scores={bigFive} />
            </Card>
          </div>
          <div className="mt-7 flex justify-center">
            <Button variant="pink" onClick={() => setPhase('energizers')} className="!text-xl">
              Next: your energy map →
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'energizers') {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker text-pink-deep">what lifts you, what drains you</p>
          <h1 className="display mt-2 text-4xl">Your energy map</h1>
          <p className="mt-3 text-ink-soft">
            For each kind of work, tap how it usually leaves you. We'll compare this with how your team reads you.
          </p>
          <div className="mt-6">
            <EnergizerTagger value={energizerTags} onChange={setEnergizerTags} />
          </div>
          <div className="mt-7 flex justify-center">
            <Button variant="pink" onClick={() => setPhase('responsibilities')} className="!text-xl">
              Next: your responsibilities →
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'responsibilities') {
    const setResp = (i: number, v: string) => setResponsibilities((rs) => rs.map((r, k) => (k === i ? v : r)))
    const addRow = () => setResponsibilities((rs) => (rs.length < MAX_RESPONSIBILITIES ? [...rs, ''] : rs))
    return (
      <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker text-pink-deep">what you own</p>
          <h1 className="display mt-2 text-4xl">Your responsibilities</h1>
          <p className="mt-3 text-ink-soft">
            List up to {MAX_RESPONSIBILITIES} core parts of your role and mark where you think you land. Your team
            rates the same list — we'll show both.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {responsibilities.map((r, i) => (
              <div key={i} className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-3 shadow-chunky-sm">
                <input
                  value={r}
                  onChange={(e) => setResp(i, e.target.value)}
                  placeholder={`Responsibility ${i + 1}`}
                  maxLength={70}
                  className="w-full rounded-xl bg-transparent px-2 py-1.5 text-base font-semibold text-ink outline-none placeholder:text-ink-soft/55"
                />
                {r.trim() && (
                  <div className="mt-2 flex gap-1.5">
                    {RESPONSIBILITY_TIERS.map((t) => {
                      const sel = respTiers[i] === t.v
                      return (
                        <button
                          key={t.v}
                          type="button"
                          onClick={() => {
                            playTick()
                            setRespTiers((p) => ({ ...p, [i]: t.v }))
                          }}
                          className={`depress-sm flex-1 cursor-pointer rounded-xl border-2 border-ink py-2 text-xs font-bold ${
                            sel ? 'bg-blue text-paper-hi sc-navy is-on' : 'bg-sand text-ink'
                          }`}
                        >
                          {t.emoji} {t.short}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          {responsibilities.length < MAX_RESPONSIBILITIES && (
            <button
              onClick={addRow}
              className="press mt-3 cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-2.5 text-sm font-semibold text-ink shadow-chunky-sm"
            >
              + Add another
            </button>
          )}
          <div className="mt-7 flex flex-col items-center gap-3">
            <Button variant="pink" onClick={save} disabled={saving} className="!text-xl">
              {saving ? 'Saving…' : 'Save & see my report →'}
            </Button>
            {saveError && (
              <p className="text-center text-sm font-semibold text-pink-deep">
                Couldn't save your read. Your link may have expired, reopen it from your email and try again.
              </p>
            )}
            <button
              onClick={() => setPhase('frameworks')}
              className="cursor-pointer text-sm font-semibold text-blue-deep underline-offset-2 hover:underline"
            >
              Or add a deeper read (4 quick activities) →
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'frameworks') {
    const steps = ['sixhats', 'belbin', 'via', 'johari'] as const
    const titles: Record<string, string> = {
      sixhats: 'Your thinking hats',
      belbin: 'Your team role',
      via: 'Your signature strengths',
      johari: 'Words for yourself',
    }
    const fw = steps[fwIdx]
    const last = fwIdx === steps.length - 1
    const next = () => (last ? save() : setFwIdx((i) => i + 1))
    return (
      <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
        <motion.div key={fw} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="kicker text-pink-deep">
            a deeper read · {fwIdx + 1} / {steps.length}
          </p>
          <h1 className="display mt-2 text-4xl">{titles[fw]}</h1>
          <div className="mt-6">
            {fw === 'sixhats' && <HatsTagger value={selfHats} onChange={setSelfHats} />}
            {fw === 'belbin' && (
              <AllocationTagger
                buckets={BELBIN_ROLES.map((r) => ({ key: r.key, label: r.name, sub: r.short }))}
                total={BELBIN_TOTAL}
                value={selfBelbin}
                onChange={setSelfBelbin}
              />
            )}
            {fw === 'via' && (
              <ChipPicker
                options={VIA_STRENGTHS.map((s) => ({ id: s.id, label: s.name, group: s.virtue }))}
                min={VIA_PICK}
                max={VIA_PICK}
                value={selfVia}
                onChange={setSelfVia}
              />
            )}
            {fw === 'johari' && (
              <ChipPicker
                options={JOHARI_ADJECTIVES.map((w) => ({ id: w, label: w }))}
                min={JOHARI_MIN}
                max={JOHARI_MAX}
                value={selfJohari}
                onChange={setSelfJohari}
              />
            )}
          </div>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Button variant="pink" onClick={next} disabled={saving} className="!text-xl">
              {last ? (saving ? 'Saving…' : 'Save & see my report →') : 'Next →'}
            </Button>
            <button onClick={save} disabled={saving} className="cursor-pointer text-sm font-semibold text-ink-soft hover:underline">
              Skip the rest, save now
            </button>
            {saveError && (
              <p className="text-center text-sm font-semibold text-pink-deep">
                Couldn't save your read. Your link may have expired, reopen it from your email and try again.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // quiz
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
      <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="kicker text-pink-deep">your self-read</span>
          <span className="kicker text-ink-soft">
            {i + 1} / {BIG_FIVE_ITEMS.length}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
          <motion.div className="h-full bg-blue" animate={{ width: `${pct}%` }} transition={{ ease: 'easeOut' }} />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] as const }}
          >
            <p className="serif mb-2 text-base text-ink-soft">How true is this of you?</p>
            <h2 className="display mb-8 text-[clamp(1.8rem,5vw,2.7rem)]">{q.text}</h2>
            <LikertScale value={answers[q.id] ?? null} onChange={pick} lowLabel="Not me" highLabel="So me" bipolar />
          </motion.div>
        </AnimatePresence>
      </div>

      {i > 0 && (
        <div className="pb-6">
          <button
            onClick={() => setI((c) => Math.max(0, c - 1))}
            className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-semibold text-ink shadow-chunky-sm"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  )
}
