import { HATS } from '@fishbowl/feedback-core'
import { normalCdf } from './percentile'

// Closeness to the virtuous mean (5 on the 1-9 scale): 1 = dead-centre (the golden
// mean), 0 = an extreme pole. Both the ten virtues and the six hats are scored this
// way (too little / ideal / too much), so one formula covers all sixteen dimensions.
const good = (mu: number) => Math.max(0, Math.min(1, 1 - Math.abs(mu - 5) / 4))

// Blend the team read with the self read 50/50 when both exist (matching the Belbin
// composite); fall back to whichever side is present.
const blend = (team: number | undefined, self: number | undefined): number | null => {
  const t = typeof team === 'number' ? team : null
  const s = typeof self === 'number' ? self : null
  if (t != null && s != null) return (t + s) / 2
  return t ?? s
}

export interface GoldenItem {
  key: string
  label: string
  kind: 'virtue' | 'hat'
  goodness: number // 0-1, 1 = on the golden mean
  color: string
}

export interface Golden {
  score: number // 0-100, higher = closer to the golden centre
  items: GoldenItem[] // per-dimension, for the scatter
  best: GoldenItem
  worst: GoldenItem
  topPercent: number | null // 1..25 when top quartile, else null (don't flex)
  betterThan: number | null // 100 - topPercent when top quartile, else null
}

// Norm for the composite (average of ~16 closeness-to-mean scores) on the 0-1 goodness
// axis. Tighter than a single dimension's spread; tuned so the top-quartile flex
// triggers near 0.85. Swap for the live population percentile once enough subjects
// accrue — the cron path Maria flagged for later.
const NORM_MEAN = 0.75
const NORM_SD = 0.1

const VIRTUE_COLOR = '#a83f6f' // pink-deep
const HAT_TINT: Record<string, string> = Object.fromEntries(HATS.map((h) => [h.key, h.tint]))

export function computeGolden(
  virtues: { dimension: string; name?: string; mu: number }[],
  hats: { key: string; mu: number; n: number }[],
  selfVirtues: Record<string, number> | null | undefined,
  selfHats: Record<string, number> | null | undefined
): Golden | null {
  const items: GoldenItem[] = []

  for (const v of virtues) {
    const mu = blend(v.mu, selfVirtues?.[v.dimension])
    if (mu == null) continue
    items.push({
      key: v.dimension,
      label: v.name ?? v.dimension,
      kind: 'virtue',
      goodness: good(mu),
      color: VIRTUE_COLOR,
    })
  }
  for (const h of hats) {
    const mu = blend(h.n === 0 ? undefined : h.mu, selfHats?.[h.key])
    if (mu == null) continue
    const label = HATS.find((x) => x.key === h.key)?.name ?? h.key
    items.push({ key: h.key, label, kind: 'hat', goodness: good(mu), color: HAT_TINT[h.key] ?? '#c8dbf2' })
  }

  if (items.length === 0) return null
  const goodness = items.reduce((a, b) => a + b.goodness, 0) / items.length
  const score = Math.round(goodness * 100)

  const sorted = [...items].sort((a, b) => b.goodness - a.goodness)

  // Norm-referenced percentile: share of a typical-coworker population below you.
  const below = normalCdf((goodness - NORM_MEAN) / NORM_SD)
  const top = Math.max(1, Math.min(99, Math.round((1 - below) * 100)))
  const isTop = top <= 25

  return {
    score,
    items,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    topPercent: isTop ? top : null,
    betterThan: isTop ? 100 - top : null,
  }
}
