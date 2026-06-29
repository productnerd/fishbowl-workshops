import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  REQUIRED_RESPONSES,
  deriveType,
  deriveArchetype,
  HATS,
  SDT_NEEDS,
  BELBIN_ROLES,
  VIA_STRENGTHS,
  CANDOR_ITEMS,
  ENERGIZER_ACTIVITIES,
  type Session,
  type BigFiveScores,
  type EnergizerTags,
  type ResponsibilityTiers,
  type HatScores,
  type VirtueScores,
} from '@fishbowl/feedback-core'
import { getSession } from '../lib/data'
import { getSelfReport, getSelfInsight, type SelfData, type SelfInsight } from '../lib/self'
import { useAiInsights } from '../lib/aiInsights'
import { topPercent } from '../lib/percentile'
import Card from '../components/Card'
import VirtueGauge from '../components/VirtueGauge'
import StatBar from '../components/StatBar'
import PersonalityCard, { SideCharacter } from '../components/PersonalityCard'
import LockedCard from '../components/LockedCard'
import EntryModal from '../components/EntryModal'
import EnergyOverlay from '../components/EnergyOverlay'
import ResponsibilitiesLadder from '../components/ResponsibilitiesLadder'
import HatsProfile from '../components/HatsProfile'
import CandorPlot from '../components/CandorPlot'
import SdtProfile from '../components/SdtProfile'
import BelbinReport from '../components/BelbinReport'
import ViaDeck from '../components/ViaDeck'
import JohariWindow from '../components/JohariWindow'
import WatchoutsDeck from '../components/WatchoutsDeck'
import { WEAKNESSES } from '@fishbowl/feedback-core'
import InfoTip from '../components/InfoTip'
import Rich from '../components/Rich'

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
  const [selfInsight, setSelfInsight] = useState<SelfInsight | null>(null)
  const [selfInsightLoading, setSelfInsightLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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

  // The private self-vs-team narrative: only once the subject has self-assessed AND a
  // team report exists. Bearer-gated; generated/cached server-side.
  useEffect(() => {
    if (!slug || !hasSelf || !insights) return
    let cancelled = false
    setSelfInsightLoading(true)
    getSelfInsight(slug).then((r) => {
      if (cancelled) return
      setSelfInsight(r)
      setSelfInsightLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [slug, hasSelf, insights])

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
  const selfVirtues = hasSelf
    ? ((self?.self_payload as Record<string, unknown> | undefined)?.virtues as VirtueScores | undefined)
    : undefined

  const cards: { tone: Parameters<typeof Card>[0]['tone']; node: ReactNode; character?: { type: string; name: string } }[] = [
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
                self={selfVirtues?.[v.dimension]}
              />
            ))}
          </div>
          {selfVirtues && Object.keys(selfVirtues).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-blue" /> your team
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-pink" /> you
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: '#5e2746' }} /> a notable gap
              </span>
            </div>
          )}
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
  const selfCards: { tone: Parameters<typeof Card>[0]['tone']; node: ReactNode; character?: { type: string; name: string } }[] = [
    {
      tone: 'paper',
      // On wide screens the Disney character stands in the margin to the right of this
      // card (only once the subject has self-assessed, never for the locked teaser).
      ...(hasSelf && self?.mbti?.character ? { character: { type: self.mbti.type, name: self.mbti.character } } : {}),
      node: (
        <div>
          {hasSelf && self?.mbti && self?.big_five ? (
            <PersonalityCard mbti={self.mbti} scores={self.big_five} sideChar />
          ) : (
            <LockedCard caption="Take the self-read to reveal your type and five traits." onUnlock={goSelf}>
              <PersonalityCard mbti={teaserType} scores={teaserBig} />
            </LockedCard>
          )}
        </div>
      ),
    },
  ]
  cards.splice(1, 0, ...selfCards)

  // Archetype: derived from the team virtue means (always), blended with the subject's
  // Big Five when they've self-assessed. Placed late in the deck (a closing lens), well
  // after the personality card.
  const virtueMeans = Object.fromEntries(insights.virtues.map((v) => [v.dimension, v.mu]))
  const archetype = deriveArchetype(hasSelf ? (self?.big_five ?? null) : null, virtueMeans)
  const archCard: { tone: Parameters<typeof Card>[0]['tone']; node: ReactNode } | null = archetype
    ? {
        tone: 'ink',
        node: (
          <div className="flex min-h-[55vh] flex-col justify-center text-center">
            <p className="kicker text-blue">
              your Jungian archetype
              <InfoTip text="The 12 archetypes Mark & Pearson distilled from Jung. We read it from how you and your team already answered, earned, not self-claimed. Every archetype has a bright side and a shadow. A fun lens, not a test." />
            </p>
            <p className="display mt-3 text-[clamp(2.6rem,8vw,4rem)] text-paper-hi">{archetype.name}</p>
            <p className="serif mt-2 text-lg text-paper-hi/80">{archetype.essence}</p>
            <p className="mt-5 text-lg leading-relaxed text-paper-hi/90">
              {archetype.cardTemplate.replace('{name}', session.creator_name)}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl border-2 border-blue/40 bg-blue/15 p-3">
                <p className="kicker text-blue">☀ Light</p>
                <p className="mt-1 text-sm leading-snug text-paper-hi/90">{archetype.light}</p>
              </div>
              <div className="rounded-2xl border-2 border-pink/40 bg-pink/10 p-3">
                <p className="kicker text-pink">☾ Shadow</p>
                <p className="mt-1 text-sm leading-snug text-paper-hi/90">{archetype.shadow}</p>
              </div>
            </div>
            <p className="mt-5 text-sm text-paper-hi/60">
              with a touch of {archetype.runnerUp}
              {archetype.fromSelf ? '' : ' · take your self-read to sharpen this'}
            </p>
          </div>
        ),
      }
    : null

  // Energizers overlay: team layer shows at >=5; the subject's own markers overlay
  // once they've self-assessed (else a nudge to add their read).
  const selfEnergizers = hasSelf ? ((self?.self_payload?.energizers as EnergizerTags | undefined) ?? null) : null
  const teamEnerg = insights.energizers ?? []
  const teamEnergHasData = teamEnerg.some((e) => e.n > 0)
  if (teamEnergHasData || (selfEnergizers && Object.keys(selfEnergizers).length > 0)) {
    const energyTeam = teamEnergHasData
      ? teamEnerg
      : ENERGIZER_ACTIVITIES.filter((a) => selfEnergizers && typeof selfEnergizers[a.id] === 'number').map((a) => ({ id: a.id, label: a.label, teamMean: 0, n: 0 }))
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
            {teamEnergHasData
              ? `How your ${session.response_count} colleagues read your energy${hasSelf ? ', next to your own read' : ''}.`
              : 'Your own read on what lifts and drains you.'}
          </p>
          <EnergyOverlay team={energyTeam} self={selfEnergizers} />
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
  const selfTiers = hasSelf ? ((self?.self_payload?.responsibility_tiers as ResponsibilityTiers | undefined) ?? null) : null
  const teamResp = insights.responsibilities ?? []
  const teamRespHasData = teamResp.some((r) => r.n > 0)
  const respRows = teamRespHasData
    ? teamResp
    : (self?.responsibilities ?? []).map((label, index) => ({ index, label, teamTier: 2, n: 0 }))
  if (teamRespHasData || (selfTiers && Object.keys(selfTiers).length > 0 && respRows.length > 0)) {
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
            {teamRespHasData
              ? `Where your team puts you on what you own${hasSelf ? ', next to your own read' : ''}.`
              : 'Your own read on what you own.'}
          </p>
          <ResponsibilitiesLadder team={respRows} self={selfTiers} />
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

  // ── Phase 3 framework cards — team layer at >=5; self overlays once self-assessed ──
  const sp = (self?.self_payload ?? {}) as Record<string, unknown>
  const fwCards: { tone: Parameters<typeof Card>[0]['tone']; node: ReactNode }[] = []

  const selfHats = hasSelf ? ((sp.hats as HatScores) ?? null) : null
  if (insights.hats?.some((h) => h.n > 0) || (selfHats && Object.keys(selfHats).length > 0)) {
    const team = (insights.hats ?? []).map((h) => ({ key: h.key, label: HATS.find((x) => x.key === h.key)?.mode ?? h.key, mu: h.mu, n: h.n }))
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-blue-deep">
            thinking style
            <InfoTip text="Edward de Bono's Six Thinking Hats — six modes of thought (facts, feelings, optimism, caution, creativity, process). We adapt them as a balance: too little / just right / too much." />
          </p>
          <h2 className="display mb-5 text-3xl">Six thinking hats</h2>
          <HatsProfile team={team} self={selfHats} />
        </div>
      ),
    })
  }

  if (insights.radicalCandor && insights.radicalCandor.n > 0) {
    const rc = insights.radicalCandor
    const selfRC = hasSelf ? (sp.radical_candor as Record<string, number> | undefined) : undefined
    const axisMean = (axis: 'care' | 'challenge') => {
      if (!selfRC) return null
      const vals = CANDOR_ITEMS.filter((i) => i.axis === axis)
        .map((i) => selfRC[i.id])
        .filter((v): v is number => typeof v === 'number')
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            feedback style
            <InfoTip text="Kim Scott's Radical Candor — caring personally while challenging directly. The other three corners (Ruinous Empathy, Obnoxious Aggression, Manipulative Insincerity) are common failure modes. Situational, not a fixed trait." />
          </p>
          <h2 className="display mb-5 text-3xl">Care × challenge</h2>
          <CandorPlot teamCare={rc.teamCare} teamChallenge={rc.teamChallenge} selfCare={axisMean('care')} selfChallenge={axisMean('challenge')} />
        </div>
      ),
    })
  }

  if (insights.sdt?.some((s) => s.n > 0)) {
    const team = insights.sdt.map((s) => ({ key: s.key, label: SDT_NEEDS.find((x) => x.key === s.key)?.label ?? s.key, meanPoints: s.meanPoints, n: s.n }))
    fwCards.push({
      tone: 'sand',
      node: (
        <div>
          <p className="kicker mb-1 text-blue-deep">
            what you fuel
            <InfoTip text="Self-Determination Theory (Deci & Ryan): the needs people feel met — autonomy, competence, relatedness, plus purpose, safety and vitality. The lens flips: what do you leave in your colleagues' tanks?" />
          </p>
          <h2 className="display mb-5 text-3xl">What you fuel in others</h2>
          <SdtProfile team={team} />
        </div>
      ),
    })
  }

  const selfBelbin = hasSelf ? ((sp.belbin as Record<string, number>) ?? null) : null
  if (insights.belbin?.some((b) => b.n > 0) || (selfBelbin && Object.keys(selfBelbin).length > 0)) {
    const team = (insights.belbin ?? []).map((b) => {
      const r = BELBIN_ROLES.find((x) => x.key === b.key)
      return { key: b.key, name: r?.name ?? b.key, cluster: r?.cluster ?? 'Thinking', teamShare: b.teamShare, n: b.n }
    })
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            team role
            <InfoTip text="Belbin's nine team roles — the distinct ways people contribute, grouped Thinking / Action / People. A lens for team composition, not a clinical test." />
          </p>
          <h2 className="display mb-5 text-3xl">The roles you play</h2>
          <BelbinReport team={team} self={selfBelbin} />
        </div>
      ),
    })
  }

  // Treat an empty array as "not done" (a depth that skipped this framework saves []),
  // so the card shows the graceful team-only view instead of an empty self overlay.
  const selfArr = (v: unknown): string[] | null =>
    hasSelf && Array.isArray(v) && v.length > 0 ? (v as string[]) : null
  const selfVia = selfArr(sp.via)
  if (insights.via?.length || (selfVia && selfVia.length > 0)) {
    const team = (insights.via ?? []).map((v) => {
      const s = VIA_STRENGTHS.find((x) => x.id === v.id)
      return { id: v.id, name: s?.name ?? v.id, virtue: s?.virtue ?? '', count: v.count }
    })
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-blue-deep">
            signature strengths
            <InfoTip text="The VIA Classification (Peterson & Seligman) — 24 character strengths under 6 virtues. Your signature strengths (the top few) feel the most energizing and authentic." />
          </p>
          <h2 className="display mb-5 text-3xl">Your top strengths</h2>
          <ViaDeck team={team} self={selfVia} total={insights.via?.[0]?.n ?? 0} />
        </div>
      ),
    })
  }

  const selfJohari = selfArr(sp.johari)
  if ((insights.johari && insights.johari.counts.length) || (selfJohari && selfJohari.length > 0)) {
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            the window
            <InfoTip text="The Johari Window (Luft & Ingham): comparing the words you pick for yourself with the words your team picks reveals your Open self, your Blind Spots, and what's Hidden. A reflective lens." />
          </p>
          <h2 className="display mb-5 text-3xl">Johari window</h2>
          <JohariWindow teamCounts={insights.johari?.counts ?? []} self={selfJohari} n={insights.johari?.n ?? 0} />
        </div>
      ),
    })
  }

  // Watch-outs (the mirror of strengths). Kindness guard: a word only surfaces in
  // the team views when at least two colleagues named it, so one off-day or one
  // harsh read doesn't define anyone.
  const selfNohari = selfArr(sp.nohari)
  const teamNohari = (insights.nohari?.counts ?? []).filter((c) => c.count >= 2)
  const hasNohari = teamNohari.length > 0 || (selfNohari !== null && selfNohari.length > 0)
  if (hasNohari) {
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            watch-outs
            <InfoTip text="The flip side of your strengths — the behaviours colleagues flagged as things to watch. A word only shows here when at least two people named it, so a single off-day or one harsh read doesn't define you. Meant kindly: these are edges to soften, not verdicts." />
          </p>
          <h2 className="display mb-5 text-3xl">Your top watch-outs</h2>
          <WatchoutsDeck team={teamNohari} self={selfNohari} total={insights.nohari?.n ?? 0} />
        </div>
      ),
    })
    fwCards.push({
      tone: 'paper',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            the other window
            <InfoTip text="The Nohari Window — the shadow side of Johari. The same four-pane idea applied to growth areas: comparing the watch-outs you own against the ones your team names reveals your Open edges, your Blind Spots, and what's still Hidden." />
          </p>
          <h2 className="display mb-5 text-3xl">Nohari window</h2>
          <JohariWindow teamCounts={teamNohari} self={selfNohari} n={insights.nohari?.n ?? 0} total={WEAKNESSES.length} dense />
        </div>
      ),
    })
  }

  for (const c of fwCards) cards.splice(cards.length - 1, 0, c)

  // The Jungian archetype sits late, just before the closing.
  if (archCard) cards.splice(cards.length - 1, 0, archCard)

  // Private "you vs them" narrative (bearer-gated). Only when self-assessed.
  if (hasSelf && (selfInsight || selfInsightLoading)) {
    cards.splice(cards.length - 1, 0, {
      tone: 'sand',
      node: (
        <div>
          <p className="kicker mb-1 text-pink-deep">
            you vs them
            <InfoTip text="A private read, just for you, comparing your self-assessment against how your team sees you. Only you can see this." />
          </p>
          <h2 className="display mb-4 text-3xl">Your read, meet theirs</h2>
          {selfInsight ? (
            <>
              <p className="serif mb-4 text-xl leading-snug text-ink">{selfInsight.headline}</p>
              <ul className="flex flex-col gap-3">
                {selfInsight.insights.map((t, i) => (
                  <li key={i} className="flex gap-2 leading-relaxed text-ink">
                    <span className="text-pink-deep">•</span>
                    <span>
                      <Rich text={t} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-ink-soft">Reading the gaps between how you see yourself and how your team does…</p>
          )}
        </div>
      ),
    })
  }

  // Action plan: the practical payoff. 2 to stop / 2 to start now, then 2 more each
  // once those are habit, plus an email-to-self.
  if (insights.actionPlan) {
    const ap = insights.actionPlan
    const bullets = (items: string[]) => (
      <ul className="mt-1 flex flex-col gap-1.5">
        {items.filter(Boolean).map((t, i) => (
          <li key={i} className="flex gap-2 leading-snug text-ink">
            <span className="text-ink/50">•</span>
            <span>
              <Rich text={t} />
            </span>
          </li>
        ))}
      </ul>
    )
    const planText = () => {
      const p = (s: string) => s.replace(/\*\*/g, '')
      const lines = ['My Fishbowl action plan', '', 'STOP NOW']
      ap.stopNow.filter(Boolean).forEach((x) => lines.push(`- ${p(x)}`))
      lines.push('', 'START NOW')
      ap.startNow.filter(Boolean).forEach((x) => lines.push(`- ${p(x)}`))
      lines.push('', 'LATER, once those are habit')
      ap.stopNext.filter(Boolean).forEach((x) => lines.push(`- stop: ${p(x)}`))
      ap.startNext.filter(Boolean).forEach((x) => lines.push(`- start: ${p(x)}`))
      return lines.join('\n')
    }
    const hasNext = ap.stopNext.some(Boolean) || ap.startNext.some(Boolean)
    cards.push({
      tone: 'pink',
      node: (
        <div>
          <p className="kicker mb-1 text-ink/70">your move</p>
          <h2 className="display mb-4 text-3xl text-ink">Start here</h2>
          <div className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 shadow-chunky-sm">
            <p className="kicker text-pink-deep">stop doing now</p>
            {bullets(ap.stopNow)}
            <p className="kicker mt-4 text-blue-deep">start doing now</p>
            {bullets(ap.startNow)}
          </div>
          {hasNext && (
            <div className="mt-3 rounded-2xl border-2 border-ink/40 bg-paper-hi/60 p-4">
              <p className="kicker text-ink-soft">then, once those stick</p>
              <p className="kicker mt-1.5 text-pink-deep/80">also stop</p>
              {bullets(ap.stopNext)}
              <p className="kicker mt-3 text-blue-deep/80">also start</p>
              {bullets(ap.startNext)}
            </div>
          )}
          <a
            href={`mailto:?subject=${encodeURIComponent('My Fishbowl action plan')}&body=${encodeURIComponent(planText())}`}
            className="press mt-4 block cursor-pointer rounded-2xl border-[2.5px] border-ink bg-blue px-5 py-3 text-center font-display font-black text-paper-hi shadow-chunky-sm sc-navy"
          >
            Email this plan to me
          </a>
        </div>
      ),
    })
  }

  // Final "take it with you" card: the whole report compiled as copy-able text to
  // paste into a personal AI assistant as context.
  const buildSummary = () => {
    const plain = (s: string) => (s || '').replace(/\*\*/g, '')
    const L: string[] = []
    L.push(`FISHBOWL REPORT — ${session.creator_name}`)
    L.push(plain(insights.headline))
    if (hasSelf && self?.mbti) L.push(`\nPersonality type: ${self.mbti.nickname} (${self.mbti.fullCode ?? self.mbti.type})`)
    L.push('\nWHERE YOU SHINE')
    insights.topStrengths.forEach((s) => L.push(`- ${s.label}: ${plain(s.blurb)}`))
    L.push('\nTHE TEN VIRTUES (1-9, 5 = the balanced virtue)')
    insights.virtues.forEach((v) => {
      const sv = selfVirtues?.[v.dimension]
      L.push(`- ${v.name}: team ${Math.round(v.mu)}${typeof sv === 'number' ? `, you ${sv}` : ''} (${v.deficientPole} to ${v.excessivePole})`)
    })
    L.push('\nHOW THEY RATE YOU (1-5)')
    insights.competencies.forEach((c) => L.push(`- ${plain(c.statement)}: ${c.average}/5`))
    L.push('\nWHAT THEY APPRECIATE')
    insights.appreciations.forEach((a) => L.push(`- ${plain(a)}`))
    if (teamNohari.length || (selfNohari && selfNohari.length)) {
      L.push('\nWATCH-OUTS (named by 2+ colleagues)')
      teamNohari.forEach((c) => L.push(`- ${c.word} (${c.count} of ${insights.nohari?.n ?? 0})`))
      if (selfNohari && selfNohari.length) L.push(`You own: ${selfNohari.join(', ')}`)
    }
    if (insights.actionPlan) {
      const ap = insights.actionPlan
      L.push('\nACTION PLAN')
      L.push('Stop now:')
      ap.stopNow.filter(Boolean).forEach((x) => L.push(`- ${plain(x)}`))
      L.push('Start now:')
      ap.startNow.filter(Boolean).forEach((x) => L.push(`- ${plain(x)}`))
      if (ap.stopNext.some(Boolean) || ap.startNext.some(Boolean)) {
        L.push('Later, once those are habit:')
        ap.stopNext.filter(Boolean).forEach((x) => L.push(`- stop: ${plain(x)}`))
        ap.startNext.filter(Boolean).forEach((x) => L.push(`- start: ${plain(x)}`))
      }
    }
    L.push(`\n${plain(insights.closing)}`)
    return L.join('\n')
  }
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary())
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard unavailable */
    }
  }
  cards.push({
    tone: 'paper',
    node: (
      <div>
        <p className="kicker mb-1 text-blue-deep">take it with you</p>
        <h2 className="display mb-3 text-3xl">Your report, to go</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Copy the whole report and paste it into your AI assistant as context, so it actually knows how you work.
        </p>
        <div className="max-h-[34vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border-2 border-ink bg-sand p-3 font-mono text-xs leading-relaxed text-ink-soft">
          {buildSummary()}
        </div>
        <button
          onClick={copySummary}
          className="press mt-4 w-full cursor-pointer rounded-2xl border-[2.5px] border-ink bg-blue px-5 py-3 font-display font-black text-paper-hi shadow-chunky-sm sc-navy"
        >
          {copied ? 'Copied ✓' : 'Copy for your AI agent'}
        </button>
      </div>
    ),
  })

  const seenNudge = Boolean(slug && localStorage.getItem(`fishbowl_self_nudge_seen_${slug}`))
  const showEntryModal = selfLoaded && !hasSelf && !modalDismissed && !seenNudge
  const dismissModal = () => {
    setModalDismissed(true)
    if (slug) localStorage.setItem(`fishbowl_self_nudge_seen_${slug}`, '1')
  }

  const total = cards.length
  const go = (d: number) => setIdx((i) => Math.min(Math.max(i + d, 0), total - 1))

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-5 py-6">
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
            <Card tone={cards[idx].tone} className="max-h-[88vh] overflow-y-auto p-7 sm:p-9">
              {cards[idx].node}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Disney character standing on the bottom-right of the screen (wide screens only).
          Rendered here, outside the animating card wrapper, so `position: fixed` holds. */}
      {cards[idx].character && (
        <SideCharacter type={cards[idx].character.type} name={cards[idx].character.name} />
      )}

      {/* edge nav — arrows on the screen edges, vertically centered (dots show progress) */}
      {idx > 0 && (
        <button
          onClick={() => go(-1)}
          aria-label="Previous"
          className="press fixed left-2 top-1/2 z-30 grid h-12 w-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-paper-hi text-2xl font-black text-ink shadow-chunky-sm sm:left-5"
        >
          ←
        </button>
      )}
      {idx < total - 1 && (
        <button
          onClick={() => go(1)}
          aria-label="Next"
          className="press fixed right-2 top-1/2 z-30 grid h-12 w-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-[2.5px] border-ink bg-pink text-2xl font-black text-ink shadow-chunky-sm sc-pink sm:right-5"
        >
          →
        </button>
      )}
    </div>
  )
}
