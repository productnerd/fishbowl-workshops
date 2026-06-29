import { motion } from 'framer-motion'
import { johariQuadrants, JOHARI_ADJECTIVES } from '@fishbowl/feedback-core'

type TeamCount = { word: string; count: number }

// A chip with an optional count badge (team picks carry a tally).
function Chip({ word, count, tone, dense }: { word: string; count?: number; tone: 'blue' | 'pink' | 'striped' | 'ghost'; dense?: boolean }) {
  const base = `inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-ink font-semibold ${
    dense ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  }`
  const tones: Record<typeof tone, string> = {
    striped: 'bg-sand text-ink',
    pink: 'bg-pink text-ink',
    blue: 'bg-blue text-paper-hi',
    ghost: 'bg-paper-hi text-ink-soft opacity-60',
  }
  return (
    <span className={`${base} ${tones[tone]}`}>
      <span className="min-w-0 break-words">{word}</span>
      {typeof count === 'number' && (
        <span className="shrink-0 rounded-full bg-ink/15 px-1.5 text-[0.65rem] tabular-nums">{count}</span>
      )}
    </span>
  )
}

// A single pane of the 2×2 window.
function Pane({
  kicker,
  caption,
  reveal = false,
  children,
}: {
  kicker: string
  caption: string
  reveal?: boolean
  children: React.ReactNode
}) {
  const inner = (
    <div className="flex h-full flex-col gap-2 p-4">
      <div>
        <p className="kicker text-ink-soft">{kicker}</p>
        <p className="text-xs text-ink-soft">{caption}</p>
      </div>
      <div className="flex flex-wrap content-start gap-1.5">{children}</div>
    </div>
  )
  if (reveal) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="h-full"
      >
        {inner}
      </motion.div>
    )
  }
  return inner
}

// Johari Window report viz. teamCounts = per-adjective tally from the colleague
// aggregate (only count > 0 surfaces). self = the subject's own picks, or null
// before they self-assess. When self is null the window can't be partitioned, so
// we show the team-picked adjectives as a single pane and note it unlocks with
// the self-read.
export default function JohariWindow({
  teamCounts,
  self,
  n,
  total,
  dense,
}: {
  teamCounts: TeamCount[]
  self: string[] | null
  n: number
  total?: number
  dense?: boolean
}) {
  const poolSize = total ?? JOHARI_ADJECTIVES.length
  const teamPicked = teamCounts.filter((t) => t.count > 0)
  const countOf = (word: string) => teamPicked.find((t) => t.word === word)?.count

  // "Not answered" (null OR empty) collapses to a team-only view: with no self-words
  // there's no real intersection to show, and an empty Open pane would wrongly read as
  // "zero overlap" rather than "we don't have your self-read yet".
  if (!self || self.length === 0) {
    const sorted = [...teamPicked].sort((a, b) => b.count - a.count)
    return (
      <div className="card-3d bg-paper-hi p-5">
        <p className="kicker text-ink-soft">how your team sees you</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          The four-pane window unlocks with your self-read: pick your own words to split these into Open, Blind Spot
          and Hidden.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sorted.map((t) => (
            <Chip key={t.word} word={t.word} count={t.count} tone="pink" dense={dense} />
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">{n} colleagues weighed in.</p>
      </div>
    )
  }

  const { open, blind, hidden } = johariQuadrants(self, teamPicked.map((t) => t.word))

  return (
    <div className="card-3d overflow-hidden bg-paper-hi p-0">
      <div className="grid grid-cols-2 divide-x-[3px] divide-ink border-b-[3px] border-ink [&>*]:min-h-[8.5rem]">
        <Pane kicker="Open" caption="You both see it">
          {open.length ? (
            open.map((w) => <Chip key={w} word={w} count={countOf(w)} tone="striped" dense={dense} />)
          ) : (
            <span className="text-xs text-ink-soft">No overlap yet.</span>
          )}
        </Pane>
        <Pane kicker="Blind Spot" caption="Your team sees it, you didn't" reveal>
          {blind.length ? (
            blind.map((w) => <Chip key={w} word={w} count={countOf(w)} tone="pink" dense={dense} />)
          ) : (
            <span className="text-xs text-ink-soft">Nothing here — your read matched theirs.</span>
          )}
        </Pane>
      </div>
      <div className="grid grid-cols-2 divide-x-[3px] divide-ink [&>*]:min-h-[8.5rem]">
        <Pane kicker="Hidden" caption="You see it, they didn't">
          {hidden.length ? (
            hidden.map((w) => <Chip key={w} word={w} tone="blue" dense={dense} />)
          ) : (
            <span className="text-xs text-ink-soft">Nothing held back.</span>
          )}
        </Pane>
        <Pane kicker="Unknown" caption="Neither of you picked it">
          <span className="font-display text-3xl font-black text-ink-soft tabular-nums">
            {Math.max(0, poolSize - new Set([...self, ...teamPicked.map((t) => t.word)]).size)}
          </span>
          <span className="self-center text-xs text-ink-soft">words left unclaimed</span>
        </Pane>
      </div>
    </div>
  )
}
