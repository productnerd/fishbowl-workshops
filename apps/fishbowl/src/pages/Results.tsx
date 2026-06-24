import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  REQUIRED_RESPONSES,
  deriveType,
  deriveArchetype,
  type Session,
  type BigFiveScores,
  type EnergizerTags,
  type ResponsibilityTiers,
} from '@fishbowl/feedback-core'
import { getSession } from '../lib/data'
import { getSelfReport, type SelfData } from '../lib/self'
import { useAiInsights } from '../lib/aiInsights'
import { topPercent } from '../lib/percentile'
import Card from '../components/Card'
import Button from '../components/Button'
import VirtueGauge from '../components/VirtueGauge'
import StatBar from '../components/StatBar'
import OceanDials from '../components/OceanDials'
import TypeCard from '../components/TypeCard'
import LockedCard from '../components/LockedCard'
import EntryModal from '../components/EntryModal'
import EnergyOverlay from '../components/EnergyOverlay'
import ResponsibilitiesLadder from '../components/ResponsibilitiesLadder'
import InfoTip from '../components/InfoTip'

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto grid min-h-dvh max-w-lg place-items-center px-5 text-center">{children}</div>
}

export default function Results() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState<Record<string, number>>({})
  const [idx, setIdx] = useState(0)
  const [self, setSelf] = useState<SelfData | null>(null)
  const [hasSelf, setHasSelf] = useState(false)
  const [selfLoaded, setSelfLoaded] = useState(false)
  const [modalDismissed, setModalDismissed] = useState(false)

  useEffect(() => {
    if (!slug) return
    getSession(slug).then((s) => {
      setSession(s)
      setLoading(false)
    })
    getSelfReport(slug).then((r) => {
      setSelf(r.self)
      setHasSelf(r.hasSelf)
      setSelfLoaded(true)
    })
  }, [slug])

  const { insights, regenerate, regenerating, isStale } = useAiInsights(
    session?.id,
    session?.response_count,
    Boolean(session)
  )

  useEffect(() => {
    if (!insights) return
    let cancelled = false
    ;(async () => {
      const vs = await Promise.all(
        insights.virtues.map(async (v) => [v.dimension, await topPercent(v.dimension, v.mu, false)] as const)
      )
      const cs = await Promise.all(
        insights.competencies.map(async (c) => [c.dimension, await topPercent(c.dimension, c.average, true)] as const)
      )
      if (!cancelled) setPct(Object.fromEntries([...vs, ...cs]))
    })()
    return () => {
      cancelled = true
    }
  }, [insights])

  if (loading) {
    return (
      <Screen>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1 }} className="text-5xl">
          🐟
        </motion.div>
      </Screen>
    )
  }
  if (!session) {
    return (
      <Screen>
        <p className="display text-3xl">This report doesn't exist.</p>
      </Screen>
    )
  }
  if ((session.response_count || 0) < REQUIRED_RESPONSES) {
    const remaining = REQUIRED_RESPONSES - (session.response_count || 0)
    return (
      <Screen>
        <Card tone="sand" className="w-full p-9">
          <div className="text-6xl">🔒</div>
          <h1 className="display mt-4 text-4xl">Not yet.</h1>
          <p className="mt-3 text-lg text-ink-soft">
            {remaining} more {remaining === 1 ? 'colleague' : 'colleagues'} need to answer before your report unlocks.
          </p>
        </Card>
      </Screen>
    )
  }
  if (!insights) {
    return (
      <Screen>
        <Card tone="paper" className="w-full p-9">
          <div className="text-6xl">✍️</div>
          <h1 className="display mt-4 text-4xl">Writing your report…</h1>
          <p className="mt-3 text-lg text-ink-soft">
            It's generated the moment the {REQUIRED_RESPONSES}th answer lands. Refresh in a minute and it'll be here.
          </p>
        </Card>
      </Screen>
    )
  }

  // ── Build the deck ──
  const mostBalanced = [...insights.virtues].sort((a, b) => b.balanceScore - a.balanceScore)[0]

  const cards: { tone: Parameters<typeof Card>[0]['tone']; node: ReactNode }[] = [
    {
      tone: 'pink',
      node: (
        <div className="flex min-h-[60vh] flex-col justify-center">
          <p className="kicker text-ink/70">your fishbowl</p>
          <h1 className="display mt-4 text-[clamp(2.4rem,7vw,4.5rem)] text-ink">
            <Rich text={insights.headline} />
          </h1>
          <p className="mt-6 text-ink/70">{session.response_count} colleagues. One honest mirror.</p>
        </div>
      ),
    },
    {
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-5 text-pink-deep">where you shine</p>
          <div className="flex flex-col gap-4">
            {insights.topStrengths.map((s) => (
              <div key={s.dimension} className="rounded-2xl border-[2.5px] border-ink bg-sand p-4 shadow-chunky-sm">
                <p className="serif text-xl font-semibold">{s.label}</p>
                <p className="mt-1 leading-relaxed text-ink-soft">
                  <Rich text={s.blurb} />
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-blue-deep">
            your balance
            <InfoTip text="Aristotle's golden mean: every strength is the midpoint between two vices. The middle — not the extreme — is the virtue." />
          </p>
          <h2 className="display mb-5 text-3xl">The ten virtues</h2>
          <div className="flex flex-col gap-4">
            {insights.virtues.map((v) => (
              <VirtueGauge
                key={v.dimension}
                name={v.name}
                mu={v.mu}
                deficientPole={v.deficientPole}
                excessivePole={v.excessivePole}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      tone: 'blue',
      node: (
        <div className="flex min-h-[55vh] flex-col justify-center">
          <p className="kicker text-paper-hi/80">most balanced</p>
          {pct[mostBalanced.dimension] != null && (
            <p className="display mt-2 text-7xl text-paper-hi">top {pct[mostBalanced.dimension]}%</p>
          )}
          <p className="serif mt-1 text-3xl text-paper-hi">on {mostBalanced.name}</p>
          <p className="mt-5 text-lg leading-relaxed text-paper-hi/90">
            <Rich text={mostBalanced.blurb} />
          </p>
        </div>
      ),
    },
    {
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">at work</p>
          <h2 className="display mb-5 text-3xl">How they rate you</h2>
          <div className="flex flex-col gap-4">
            {insights.competencies.map((c) => (
              <StatBar key={c.dimension} label={c.statement} value={c.average} percent={pct[c.dimension]} />
            ))}
          </div>
        </div>
      ),
    },
    {
      tone: 'sand',
      node: (
        <div>
          <p className="kicker mb-5 text-pink-deep">what they appreciate</p>
          <ul className="flex flex-col gap-4">
            {insights.appreciations.map((a, i) => (
              <li key={i} className="flex gap-3 text-xl leading-relaxed">
                <span className="text-pink-deep">❤</span>
                <span>
                  <Rich text={a} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-5 text-blue-deep">grow here</p>
          <div className="flex flex-col gap-4">
            {insights.growthEdges.map((g) => (
              <div key={g.dimension} className="rounded-2xl border-[2.5px] border-ink bg-sand p-4 shadow-chunky-sm">
                <p className="serif text-xl font-semibold">{g.title}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {g.actions.filter(Boolean).map((b, i) => (
                    <li key={i} className="flex gap-2 leading-snug text-ink-soft">
                      <span className="text-blue-deep">→</span>
                      <span>
                        <Rich text={b} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      tone: 'ink',
      node: (
        <div className="flex min-h-[55vh] flex-col justify-center">
          <p className="kicker text-blue">one last thing</p>
          <p className="serif mt-4 text-3xl leading-snug text-paper-hi">
            <Rich text={insights.closing} />
          </p>
          {isStale && (
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="press mt-8 self-start cursor-pointer rounded-full border-[2.5px] border-paper-hi bg-blue px-5 py-2.5 font-display font-black text-ink"
            >
              {regenerating ? 'Refreshing…' : 'New answers came in · refresh'}
            </button>
          )}
        </div>
      ),
    },
  ]

  // ── Self layer (bearer-gated): Type card + OCEAN dials, locked until the
  // subject self-assesses. Locked cards blur a teaser to make the nudge enticing.
  const goSelf = () => navigate(`/self/${slug}`)
  const teaserBig: BigFiveScores = {
    openness: 74,
    conscientiousness: 62,
    extraversion: 58,
    agreeableness: 67,
    neuroticism: 34,
    emotionalStability: 66,
  }
  const teaserType = deriveType(teaserBig)
  const selfCards: { tone: Parameters<typeof Card>[0]['tone']; node: ReactNode }[] = [
    {
      tone: 'blue',
      node:
        hasSelf && self?.mbti ? (
          <div>
            <p className="kicker mb-3 text-paper-hi/70">this is you, by you</p>
            <TypeCard mbti={self.mbti} bare />
          </div>
        ) : (
          <LockedCard caption="Take the 2-min self-read to reveal your type." onUnlock={goSelf}>
            <TypeCard mbti={teaserType} bare />
          </LockedCard>
        ),
    },
    {
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-blue-deep">
            this is you, by you
            <InfoTip text="The Big Five (OCEAN) is the most empirically validated model in personality science — five stable, cross-cultural traits." />
          </p>
          <h2 className="display mb-5 text-3xl">Your five traits</h2>
          {hasSelf && self?.big_five ? (
            <OceanDials scores={self.big_five} />
          ) : (
            <LockedCard caption="Take the 2-min self-read to reveal your traits." onUnlock={goSelf}>
              <OceanDials scores={teaserBig} />
            </LockedCard>
          )}
        </div>
      ),
    },
  ]
  cards.splice(1, 0, ...selfCards)

  // Archetype: derived from the team virtue means (always) blended with the
  // subject's Big Five when they've self-assessed. Renders from team alone.
  const virtueMeans = Object.fromEntries(insights.virtues.map((v) => [v.dimension, v.mu]))
  const archetype = deriveArchetype(hasSelf ? (self?.big_five ?? null) : null, virtueMeans)
  if (archetype) {
    const archCard = {
      tone: 'ink' as const,
      node: (
        <div className="flex min-h-[55vh] flex-col justify-center text-center">
          <p className="kicker text-blue">
            your archetype
            <InfoTip text="The 12 archetypes Mark & Pearson distilled from Jung. We read it from how you and your team already answered — earned, not self-claimed. A fun lens, not a test." />
          </p>
          <p className="display mt-3 text-[clamp(2.6rem,8vw,4rem)] text-paper-hi">{archetype.name}</p>
          <p className="serif mt-2 text-lg text-paper-hi/80">{archetype.essence}</p>
          <p className="mt-5 text-lg leading-relaxed text-paper-hi/90">
            {archetype.cardTemplate.replace('{name}', session.creator_name)}
          </p>
          <p className="mt-5 text-sm text-paper-hi/60">
            with a touch of {archetype.runnerUp}
            {archetype.fromSelf ? '' : ' · take your self-read to sharpen this'}
          </p>
        </div>
      ),
    }
    cards.splice(1, 0, archCard)
  }

  // Energizers overlay: team layer shows at >=5; the subject's own markers overlay
  // once they've self-assessed (else a nudge to add their read).
  if (insights.energizers && insights.energizers.some((e) => e.n > 0)) {
    const selfEnergizers = (self?.self_payload?.energizers as EnergizerTags | undefined) ?? null
    const energyCard = {
      tone: 'paper' as const,
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            energy
            <InfoTip text="Marcus Buckingham's strengths idea: a strength is an activity that energizes you, not merely one you're good at. Lean into your energizers." />
          </p>
          <h2 className="display mb-1 text-3xl">What lifts you, what drains you</h2>
          <p className="mb-5 text-sm text-ink-soft">
            How your {session.response_count} colleagues read your energy
            {hasSelf ? ', next to your own read' : ''}.
          </p>
          <EnergyOverlay team={insights.energizers} self={hasSelf ? selfEnergizers : null} />
          {!hasSelf && (
            <button
              onClick={goSelf}
              className="press mt-5 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-3 font-display font-black text-ink shadow-chunky-sm"
            >
              Take your self-read to overlay your view →
            </button>
          )}
        </div>
      ),
    }
    cards.splice(cards.length - 1, 0, energyCard)
  }

  // Responsibilities ladder: team tiers always (>=5); self tiers overlay once self-assessed.
  if (insights.responsibilities && insights.responsibilities.some((r) => r.n > 0)) {
    const selfTiers = (self?.self_payload?.responsibility_tiers as ResponsibilityTiers | undefined) ?? null
    const respCard = {
      tone: 'paper' as const,
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            their role
            <InfoTip text="A behaviorally-anchored rating scale (BARS): describing performance at three concrete levels is more useful and less halo-biased than a single score." />
          </p>
          <h2 className="display mb-1 text-3xl">How you deliver</h2>
          <p className="mb-5 text-sm text-ink-soft">
            Where your team puts you on what you own{hasSelf ? ', next to your own read' : ''}.
          </p>
          <ResponsibilitiesLadder team={insights.responsibilities} self={hasSelf ? selfTiers : null} />
          {!hasSelf && (
            <button
              onClick={goSelf}
              className="press mt-5 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-pink sc-pink px-5 py-3 font-display font-black text-ink shadow-chunky-sm"
            >
              Take your self-read to overlay your view →
            </button>
          )}
        </div>
      ),
    }
    cards.splice(cards.length - 1, 0, respCard)
  }

  const seenNudge = Boolean(slug && localStorage.getItem(`fishbowl_self_nudge_seen_${slug}`))
  const showEntryModal = selfLoaded && !hasSelf && !modalDismissed && !seenNudge
  const dismissModal = () => {
    setModalDismissed(true)
    if (slug) localStorage.setItem(`fishbowl_self_nudge_seen_${slug}`, '1')
  }

  const total = cards.length
  const go = (d: number) => setIdx((i) => Math.min(Math.max(i + d, 0), total - 1))

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
      {showEntryModal && <EntryModal onTakeNow={goSelf} onLater={dismissModal} />}
      {/* dots */}
      <div className="mb-4 flex gap-1.5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2 flex-1 cursor-pointer rounded-full border border-ink ${i <= idx ? 'bg-ink' : 'bg-paper-hi'}`}
          />
        ))}
      </div>

      <div className="flex flex-1 items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] as const }}
            className="w-full"
          >
            <Card tone={cards[idx].tone} className="max-h-[78vh] overflow-y-auto p-7 sm:p-9">
              {cards[idx].node}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* nav */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="press cursor-pointer rounded-full border-[2.5px] border-ink bg-paper-hi px-5 py-3 font-semibold shadow-chunky-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          ←
        </button>
        <span className="kicker text-ink-soft">
          {idx + 1} / {total}
        </span>
        {idx === total - 1 ? (
          <span className="rounded-full border-[2.5px] border-ink bg-blue px-5 py-3 font-display font-black shadow-chunky-sm">
            the end ✦
          </span>
        ) : (
          <Button variant="pink" onClick={() => go(1)}>
            Next →
          </Button>
        )}
      </div>
    </div>
  )
}
