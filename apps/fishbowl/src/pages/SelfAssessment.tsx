import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  selectBigFiveItems,
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
  WEAKNESSES,
  NOHARI_MIN,
  NOHARI_MAX,
  type BigFiveScores,
  type MbtiType,
  type EnergizerTags,
  type ResponsibilityTiers,
  type HatScores,
  type VirtueScores,
} from '@fishbowl/feedback-core'
import { requestMagicLink, saveSelf, finishSelf, getSelfReport } from '../lib/self'
import { getSubjectAuth, setSubjectAuth } from '../lib/subjectAuth'
import { playTick, playScaleNote } from '../lib/sound'
import LikertScale from '../components/LikertScale'
import Button from '../components/Button'
import Card from '../components/Card'
import PersonalityCard from '../components/PersonalityCard'
import EnergizerTagger from '../components/EnergizerTagger'
import HatsTagger from '../components/HatsTagger'
import AllocationTagger from '../components/AllocationTagger'
import ChipPicker from '../components/ChipPicker'
import VirtueSlider from '../components/VirtueSlider'
import { questions } from '../data/questions'

// The depth slider: how much time the subject wants to spend, which scales the
// number of personality questions (per dimension) and which extra activities are
// auto-included. Default is the middle (Standard); Extended is encouraged.
type SelfDepth = {
  id: string
  name: string
  perTrait: number
  time: string
  accuracy: number // 1-5, drives the meter
  energizers: boolean
  frameworks: string[]
  blurb: string
}
const ALL_FRAMEWORKS = ['sixhats', 'belbin', 'via', 'johari', 'nohari']
const DEPTHS: SelfDepth[] = [
  { id: 'quick', name: 'Quick', perTrait: 4, time: '~4 min', accuracy: 3, energizers: false, frameworks: [], blurb: 'The essentials. A solid first read.' },
  { id: 'standard', name: 'Standard', perTrait: 6, time: '~8 min', accuracy: 4, energizers: true, frameworks: ['sixhats', 'via', 'johari', 'nohari'], blurb: 'More questions, a sharper read. The sweet spot.' },
  { id: 'extended', name: 'Extended', perTrait: 8, time: '~10 min', accuracy: 5, energizers: true, frameworks: ALL_FRAMEWORKS, blurb: 'The works. The most accurate, most detailed read.' },
]

type Phase = 'checking' | 'finish' | 'depth' | 'quiz' | 'reveal' | 'virtues' | 'energizers' | 'responsibilities' | 'frameworks'

// The 10 virtue scales, reused from the colleague survey so the vice/virtue behaviours
// (deficientTraits / virtueTraits / excessiveTraits) are a single source of truth.
const VIRTUE_QS = questions.filter((q) => q.type === 'virtue')

// A subtle "← Back" used to step back to the previous activity in the self-flow.
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-semibold text-ink shadow-chunky-sm"
    >
      ← Back
    </button>
  )
}

export default function SelfAssessment() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('checking')

  // Verify the bearer actually OWNS this slug before letting them self-assess. A
  // bearer for a different session can't save here, so we'd otherwise let them
  // fill the whole thing, fail the save, and bounce them to a self-less report.
  useEffect(() => {
    if (!slug) return
    // Ungated: anyone with the link can start straight away. We collect an email only
    // at the very end (the 'finish' step) to save the read and mail the results link.
    if (!getSubjectAuth()) {
      setAuthed(false)
      setPhase('depth')
      return
    }
    let cancelled = false
    getSelfReport(slug).then((r) => {
      if (cancelled) return
      setAuthed(r.authed)
      if (!r.authed) {
        setPhase('depth')
        return
      }
      const s = r.self
      const sp = (s?.self_payload ?? {}) as Record<string, any>
      // Resume an in-progress (not yet completed) self-assessment where they left off.
      if (s && s.big_five && s.mbti && !s.completed && typeof sp.progress === 'string') {
        setAnswers(s.ocean_answers ?? {})
        setBigFive(s.big_five)
        setMbti(s.mbti)
        setDepth((sp.depthConfig as SelfDepth) ?? DEPTHS[1])
        setSelfVirtues((sp.virtues as VirtueScores) ?? {})
        setEnergizerTags((sp.energizers as EnergizerTags) ?? {})
        setRespTiers((sp.responsibility_tiers as ResponsibilityTiers) ?? {})
        setResponsibilities(s.responsibilities?.length ? s.responsibilities : [''])
        setSelfHats((sp.hats as HatScores) ?? {})
        setSelfBelbin((sp.belbin as Record<string, number>) ?? {})
        setSelfVia((sp.via as string[]) ?? [])
        setSelfJohari((sp.johari as string[]) ?? [])
        setSelfNohari((sp.nohari as string[]) ?? [])
        setPhase(sp.progress as Phase)
      } else {
        setPhase('depth')
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])
  const [energizerTags, setEnergizerTags] = useState<EnergizerTags>({})
  const [selfVirtues, setSelfVirtues] = useState<VirtueScores>({})
  const [vIdx, setVIdx] = useState(0)
  const [responsibilities, setResponsibilities] = useState<string[]>([''])
  const [respTiers, setRespTiers] = useState<ResponsibilityTiers>({})
  // Optional "deeper read" self inputs (name-neutral frameworks).
  const [fwIdx, setFwIdx] = useState(0)
  const [selfHats, setSelfHats] = useState<HatScores>({})
  const [selfBelbin, setSelfBelbin] = useState<Record<string, number>>({})
  const [selfVia, setSelfVia] = useState<string[]>([])
  const [selfJohari, setSelfJohari] = useState<string[]>([])
  const [selfNohari, setSelfNohari] = useState<string[]>([])

  // ── finish: collect the email at the very end (ungated start) ──
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  // Save the completed read, mint a device bearer, and email the results link, then
  // open the report. Used when the subject started without signing in.
  const onFinish = async () => {
    if (!slug || !bigFive || !mbti || !email.trim()) return
    setSending(true)
    setFinishError(null)
    const res = await finishSelf(email.trim(), slug, buildPayload(true, 'done'))
    if (!res.ok || !res.bearer || !res.person_id) {
      setSending(false)
      setFinishError(res.error ?? 'error')
      return
    }
    setSubjectAuth({ bearer: res.bearer, person_id: res.person_id, slug })
    void requestMagicLink(email.trim(), slug) // the one email: a link back to the results
    localStorage.setItem(`fishbowl_self_nudge_seen_${slug}`, '1')
    navigate(`/r/${slug}`)
  }

  // ── depth ──
  const [depthIdx, setDepthIdx] = useState(1) // default middle (Standard)
  const [depth, setDepth] = useState<SelfDepth>(DEPTHS[1])
  const items = useMemo(() => selectBigFiveItems(depth.perTrait), [depth])

  // ── quiz ──
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [bigFive, setBigFive] = useState<BigFiveScores | null>(null)
  const [mbti, setMbti] = useState<MbtiType | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)

  const q = items[Math.min(i, items.length - 1)]
  const pct = ((i + 1) / items.length) * 100

  const pick = (v: number) => {
    playScaleNote(v)
    const isLast = i === items.length - 1
    const next = { ...answers, [q.id]: v }
    setAnswers(next)
    setTimeout(() => {
      if (isLast) {
        const bf = scoreBigFive(next)
        setBigFive(bf)
        setMbti(deriveType(bf))
        setPhase('reveal')
      } else {
        setI((c) => Math.min(c + 1, items.length - 1))
      }
    }, 320)
  }

  const buildPayload = (completed: boolean, progress: string, d: SelfDepth = depth) => ({
    ocean_answers: answers,
    big_five: bigFive!,
    mbti: mbti!,
    responsibilities: responsibilities.map((r) => r.trim()).filter(Boolean).slice(0, MAX_RESPONSIBILITIES),
    self_payload: {
      virtues: selfVirtues,
      energizers: energizerTags,
      responsibility_tiers: respTiers,
      hats: selfHats,
      belbin: selfBelbin,
      via: selfVia,
      johari: selfJohari,
      nohari: selfNohari,
      depthConfig: d,
      progress,
    },
    completed,
  })

  // Progressive save: persist partial progress (completed=false) at each step so a
  // dropped session resumes where it left off. Fire-and-forget; never blocks the UI.
  const persist = (progress: string, d: SelfDepth = depth) => {
    if (!slug || !bigFive || !mbti) return
    void saveSelf(slug, buildPayload(false, progress, d))
  }

  // Save the personality the moment it's revealed, so even an early drop-off keeps it.
  useEffect(() => {
    if (phase === 'reveal' && bigFive && mbti) persist('reveal')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const save = async () => {
    if (!slug || !bigFive || !mbti) return
    // Started without signing in — collect an email at the end, then save + redirect.
    if (!authed) {
      setPhase('finish')
      return
    }
    setSaving(true)
    setSaveError(false)
    const res = await saveSelf(slug, buildPayload(true, 'done'))
    // Only move on if it actually saved, else the report would load with no self and
    // re-nag them. On success, suppress the "take it first" modal for good.
    if (!res.ok) {
      setSaving(false)
      setSaveError(true)
      return
    }
    localStorage.setItem(`fishbowl_self_nudge_seen_${slug}`, '1')
    navigate(`/r/${slug}`)
  }

  // "Are you sure" confirmation before skipping the remaining deeper activities.
  const skipModal = (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-5" onClick={() => setConfirmSkip(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        <Card tone="paper" className="p-6 text-center">
          <p className="display text-2xl">Skip the rest?</p>
          <p className="mt-2 text-sm text-ink-soft">
            You can finish later, but your report is richer with the deeper activities included.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <Button
              variant="pink"
              onClick={() => {
                setConfirmSkip(false)
                save()
              }}
              disabled={saving}
              className="!text-lg"
            >
              {saving ? 'Saving…' : 'Skip and save →'}
            </Button>
            <button
              onClick={() => setConfirmSkip(false)}
              className="cursor-pointer text-sm font-semibold text-ink-soft hover:underline"
            >
              Keep going
            </button>
          </div>
        </Card>
      </div>
    </div>
  )

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

  if (phase === 'finish') {
    return (
      <div className="grid min-h-dvh place-items-center px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <Card tone="paper" className="p-7">
            <div className="text-5xl">🪞</div>
            <h1 className="display mt-3 text-4xl">Your read is ready</h1>
            <p className="mt-2 text-ink-soft">
              Drop your email and we'll open your report now, and send you a link to come back to it anytime.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onFinish()}
              autoFocus
              placeholder="you@work.com"
              className="mt-5 w-full rounded-2xl border-[2.5px] border-ink bg-paper-hi px-5 py-3.5 text-center text-base text-ink shadow-chunky-sm outline-none focus:shadow-chunky"
            />
            <div className="mt-5">
              <Button variant="pink" onClick={onFinish} disabled={sending || !email.trim()} className="!text-lg">
                {sending ? 'Opening…' : 'Open my report →'}
              </Button>
            </div>
            {finishError && (
              <p className="mt-3 text-sm font-semibold text-pink-deep">
                {finishError === 'this link belongs to someone else'
                  ? 'This link is already tied to another email.'
                  : "Couldn't save your read. Try again."}
              </p>
            )}
          </Card>
        </motion.div>
      </div>
    )
  }

  if (phase === 'depth') {
    const cur = DEPTHS[depthIdx]
    const included = [
      `Personality, ${cur.perTrait} questions per trait`,
      'Your responsibilities',
      ...(cur.energizers ? ['Your energy map'] : []),
      ...(cur.frameworks.length ? [`${cur.frameworks.length} deeper activit${cur.frameworks.length === 1 ? 'y' : 'ies'}`] : []),
    ]
    const start = () => {
      setDepth(cur)
      setPhase('quiz')
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8"
      >
        {/* header — pinned at the top, never moves */}
        <div className="shrink-0">
          <p className="kicker text-pink-deep">before we start</p>
          <h1 className="display mt-2 text-4xl">How deep do you want to go?</h1>
        </div>

        {/* card — centered in the middle; its inner heights are reserved so sliding never resizes it */}
        <div className="flex flex-1 items-center py-6">
          <Card tone="paper" className="w-full p-6">
            {/* current selection — the slider's label, centered right above it */}
            <div className="text-center">
              <span className="display text-3xl">{cur.name}</span>
              <p className="kicker mt-1 text-ink-soft">{cur.time}</p>
            </div>

            {/* slider */}
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={depthIdx}
              onChange={(e) => {
                playTick()
                setDepthIdx(Number(e.target.value))
              }}
              aria-label="How deep to go"
              className="mt-4 w-full cursor-pointer accent-pink"
            />
            <div className="mt-1 flex justify-between text-xs font-bold">
              {DEPTHS.map((d, k) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    playTick()
                    setDepthIdx(k)
                  }}
                  className={`cursor-pointer uppercase tracking-wide ${k === depthIdx ? 'text-pink-deep' : 'text-ink-soft/70'}`}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {/* accuracy + detail meter */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <span className="kicker text-blue-deep">accuracy & detail</span>
                <span className="text-xs font-bold text-ink-soft">{cur.accuracy} / 5</span>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`h-2.5 flex-1 rounded-full border-2 border-ink ${n <= cur.accuracy ? 'bg-blue' : 'bg-paper-hi'}`}
                  />
                ))}
              </div>
            </div>

            {/* what's included — fixed height for up to 4 rows so the card never grows */}
            <ul className="mt-5 flex min-h-[7rem] flex-col gap-1.5">
              {included.map((x) => (
                <li key={x} className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-blue-deep">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* start — pinned at the bottom; nudge space reserved so the button never jumps */}
        <div className="flex shrink-0 flex-col items-center gap-5">
          <Button variant="pink" onClick={start} className="!text-xl">
            Start →
          </Button>
          <p className="min-h-[1.25rem] text-center text-xs text-ink-soft">
            {cur.id !== 'extended' ? 'Most people learn more from the extended read.' : ''}
          </p>
        </div>
      </motion.div>
    )
  }

  if (phase === 'reveal' && bigFive && mbti) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card tone="paper" className="p-6 sm:p-7">
            <PersonalityCard mbti={mbti} scores={bigFive} />
          </Card>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Button
              variant="pink"
              onClick={() => {
                persist('virtues')
                setPhase('virtues')
              }}
              className="!text-xl"
            >
              Next: the ten virtues →
            </Button>
            <BackButton onClick={() => { setI(items.length - 1); setPhase('quiz') }} />
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'virtues') {
    const vq = VIRTUE_QS[Math.min(vIdx, VIRTUE_QS.length - 1)]
    const vv = vq.virtue!
    const last = vIdx === VIRTUE_QS.length - 1
    const next = depth.energizers ? 'energizers' : 'responsibilities'
    const onPick = (val: number) => {
      playScaleNote(val)
      const dim = vq.dimension!
      setSelfVirtues((p) => ({ ...p, [dim]: val }))
      setTimeout(() => {
        if (last) {
          persist(next)
          setPhase(next)
        } else {
          setVIdx((i) => Math.min(i + 1, VIRTUE_QS.length - 1))
        }
      }, 320)
    }
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
        <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 pt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="kicker text-pink-deep">your character, by you</span>
            <span className="kicker text-ink-soft">
              {vIdx + 1} / {VIRTUE_QS.length}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper-hi">
            <motion.div
              className="h-full bg-blue"
              animate={{ width: `${((vIdx + 1) / VIRTUE_QS.length) * 100}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={vq.dimension}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] as const }}
            >
              <p className="kicker mb-1 text-center text-pink-deep">where do you land?</p>
              <p className="serif mb-6 text-center text-ink-soft">
                The middle is the virtue; each end is a way to overdo or underdo it.
              </p>
              <VirtueSlider
                value={selfVirtues[vq.dimension!] ?? null}
                onChange={onPick}
                virtueLabel={vv.name}
                deficientLabel={vv.deficientPole}
                excessiveLabel={vv.excessivePole}
                deficientTraits={vv.deficientTraits}
                virtueTraits={vv.virtueTraits}
                excessiveTraits={vv.excessiveTraits}
                id={vq.dimension}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pb-6">
          <BackButton onClick={() => (vIdx > 0 ? setVIdx((i) => i - 1) : setPhase('reveal'))} />
        </div>
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
          <div className="mt-7 flex flex-col items-center gap-3">
            <Button
              variant="pink"
              onClick={() => {
                persist('responsibilities')
                setPhase('responsibilities')
              }}
              className="!text-xl"
            >
              Next: your responsibilities →
            </Button>
            <BackButton onClick={() => { setVIdx(VIRTUE_QS.length - 1); setPhase('virtues') }} />
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
          {confirmSkip && skipModal}
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
            {depth.frameworks.length > 0 ? (
              <>
                <Button
                  variant="pink"
                  onClick={() => {
                    persist('frameworks')
                    setPhase('frameworks')
                  }}
                  disabled={saving}
                  className="!text-xl"
                >
                  Next: a deeper read →
                </Button>
                <button onClick={() => setConfirmSkip(true)} disabled={saving} className="cursor-pointer text-sm font-semibold text-ink-soft hover:underline">
                  {saving ? 'Saving…' : 'Skip the rest, save now'}
                </button>
              </>
            ) : (
              <>
                <Button variant="pink" onClick={save} disabled={saving} className="!text-xl">
                  {saving ? 'Saving…' : 'Save & see my report →'}
                </Button>
                <button
                  onClick={() => {
                    const d = { ...depth, frameworks: ALL_FRAMEWORKS }
                    setDepth(d)
                    persist('frameworks', d)
                    setPhase('frameworks')
                  }}
                  className="cursor-pointer text-sm font-semibold text-blue-deep underline-offset-2 hover:underline"
                >
                  Or add a deeper read (4 quick activities) →
                </button>
              </>
            )}
            {saveError && (
              <p className="text-center text-sm font-semibold text-pink-deep">
                Couldn't save your read. Your link may have expired, reopen it from your email and try again.
              </p>
            )}
            <BackButton
              onClick={() => {
                if (depth.energizers) setPhase('energizers')
                else {
                  setVIdx(VIRTUE_QS.length - 1)
                  setPhase('virtues')
                }
              }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  if (phase === 'frameworks') {
    const steps = depth.frameworks
    const titles: Record<string, string> = {
      sixhats: 'Your thinking hats',
      belbin: 'Your team role',
      via: 'Your signature strengths',
      johari: 'Words for yourself',
      nohari: 'Your watch-outs',
    }
    const fw = steps[Math.min(fwIdx, steps.length - 1)]
    const last = fwIdx === steps.length - 1
    const next = () => {
      if (last) {
        save()
        return
      }
      persist('frameworks')
      setFwIdx((i) => i + 1)
    }
    return (
      <div className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
        {confirmSkip && skipModal}
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
            {fw === 'nohari' && (
              <ChipPicker
                options={WEAKNESSES.map((w) => ({ id: w, label: w }))}
                min={NOHARI_MIN}
                max={NOHARI_MAX}
                value={selfNohari}
                onChange={setSelfNohari}
              />
            )}
          </div>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Button variant="pink" onClick={next} disabled={saving} className="!text-xl">
              {last ? (saving ? 'Saving…' : 'Save & see my report →') : 'Next →'}
            </Button>
            <button onClick={() => setConfirmSkip(true)} disabled={saving} className="cursor-pointer text-sm font-semibold text-ink-soft hover:underline">
              Skip the rest, save now
            </button>
            <BackButton onClick={() => (fwIdx > 0 ? setFwIdx((c) => c - 1) : setPhase('responsibilities'))} />
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
            {i + 1} / {items.length}
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

      <div className="pb-6">
        <BackButton onClick={() => (i > 0 ? setI((c) => c - 1) : setPhase('depth'))} />
      </div>
    </div>
  )
}
