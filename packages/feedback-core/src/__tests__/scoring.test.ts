import { describe, it, expect } from 'vitest'
import {
  BIG_FIVE_ITEMS,
  DIMENSIONS,
  scoreBigFive,
  selectBigFiveItems,
  deriveType,
  scoreDimensions,
  blendDimensionScores,
  deriveArchetype,
  shadeFor,
  ORIENTATIONS,
  type BigFiveScores,
  type BigFiveTrait,
} from '../index'

// Build answers so every item of `trait` resolves to the same reverse-adjusted value.
// (non-reverse: raw = adjusted; reverse: raw = 8 - adjusted, since scoring does 8 - raw.)
function answersForTrait(trait: BigFiveTrait, adjusted: number): Record<string, number> {
  const a: Record<string, number> = {}
  for (const it of BIG_FIVE_ITEMS.filter((i) => i.trait === trait)) {
    a[it.id] = it.reverse ? 8 - adjusted : adjusted
  }
  return a
}

function answersForDimension(key: string, adjusted: number): Record<string, number> {
  const dim = DIMENSIONS.find((d) => d.key === key)!
  const a: Record<string, number> = {}
  for (const it of dim.items) a[it.id] = it.reverse ? 8 - adjusted : adjusted
  return a
}

describe('scoreBigFive', () => {
  it('defaults every trait to 50 when nothing is answered', () => {
    const s = scoreBigFive({})
    expect(s.openness).toBe(50)
    expect(s.conscientiousness).toBe(50)
    expect(s.extraversion).toBe(50)
    expect(s.agreeableness).toBe(50)
    expect(s.neuroticism).toBe(50)
  })

  it('maps a maxed trait to 100 and a floored trait to 0 (reverse items handled)', () => {
    expect(scoreBigFive(answersForTrait('openness', 7)).openness).toBe(100)
    expect(scoreBigFive(answersForTrait('openness', 1)).openness).toBe(0)
    expect(scoreBigFive(answersForTrait('openness', 4)).openness).toBe(50)
  })

  it('honours reverse keying: agreeing with a reverse item lowers the trait', () => {
    const rev = BIG_FIVE_ITEMS.find((i) => i.trait === 'conscientiousness' && i.reverse)!
    // Answer ONLY that reverse item with a strong "agree" (7) → adjusted 1 → low score.
    const s = scoreBigFive({ [rev.id]: 7 })
    expect(s.conscientiousness).toBeLessThan(50)
  })

  it('derives emotionalStability as 100 - neuroticism', () => {
    const s = scoreBigFive(answersForTrait('neuroticism', 7))
    expect(s.neuroticism).toBe(100)
    expect(s.emotionalStability).toBe(0)
  })
})

describe('selectBigFiveItems', () => {
  it('returns perTrait items for each of the 5 traits, clamped to 1..8', () => {
    expect(selectBigFiveItems(4)).toHaveLength(20)
    expect(selectBigFiveItems(8)).toHaveLength(40)
    expect(selectBigFiveItems(100)).toHaveLength(40) // clamps to 8/trait
    expect(selectBigFiveItems(0)).toHaveLength(5) // clamps to 1/trait
  })

  it('stays balanced: equal item count per trait', () => {
    const picked = selectBigFiveItems(6)
    const perTrait = new Map<string, number>()
    for (const it of picked) perTrait.set(it.trait, (perTrait.get(it.trait) ?? 0) + 1)
    expect([...perTrait.values()]).toEqual([6, 6, 6, 6, 6])
  })
})

describe('deriveType', () => {
  const high: BigFiveScores = { openness: 80, conscientiousness: 80, extraversion: 80, agreeableness: 80, neuroticism: 20, emotionalStability: 80 }
  const low: BigFiveScores = { openness: 20, conscientiousness: 20, extraversion: 20, agreeableness: 20, neuroticism: 80, emotionalStability: 20 }

  it('maps all-high traits to ENFJ-A and all-low to ISTP-T', () => {
    expect(deriveType(high).type).toBe('ENFJ')
    expect(deriveType(high).fullCode).toBe('ENFJ-A')
    expect(deriveType(low).type).toBe('ISTP')
    expect(deriveType(low).fullCode).toBe('ISTP-T')
  })

  it('treats exactly 50 as the high pole', () => {
    const mid: BigFiveScores = { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50, emotionalStability: 50 }
    expect(deriveType(mid).type).toBe('ENFJ')
  })

  it('populates the matched character and its match explanation', () => {
    const t = deriveType(high)
    expect(t.character).toBeTruthy()
    expect(t.matchWhy).toBeTruthy()
    expect(t.matchWhy).not.toContain('Disney')
  })
})

describe('scoreDimensions', () => {
  it('returns all 12 dimensions, defaulting to 50 with nothing answered', () => {
    const scores = scoreDimensions({})
    expect(scores).toHaveLength(12)
    for (const d of scores) {
      expect(d.score).toBe(50)
      expect(d.answered).toBe(0)
      expect(d.band).toBe('Moderate')
    }
  })

  it('maxes and floors a dimension from its (reverse-aware) items', () => {
    const hi = scoreDimensions(answersForDimension('leadership', 7)).find((d) => d.key === 'leadership')!
    expect(hi.score).toBe(100)
    expect(hi.band).toBe('Very High')
    const lo = scoreDimensions(answersForDimension('leadership', 1)).find((d) => d.key === 'leadership')!
    expect(lo.score).toBe(0)
    expect(lo.band).toBe('Very Low')
  })

  it('rests every dimension on at least 3 items', () => {
    for (const d of DIMENSIONS) expect(d.items.length, d.key).toBeGreaterThanOrEqual(3)
  })

  it('shrinks toward 50 when few items are answered (one answer cannot swing a score)', () => {
    const dim = DIMENSIONS.find((d) => d.key === 'leadership')!
    const one = dim.items[0]
    const single = scoreDimensions({ [one.id]: one.reverse ? 1 : 7 }).find((d) => d.key === 'leadership')!
    expect(single.answered).toBe(1)
    expect(single.score).toBeGreaterThan(50)
    expect(single.score).toBeLessThanOrEqual(67) // 1/3 confidence caps the swing
    const full = scoreDimensions(answersForDimension('leadership', 7)).find((d) => d.key === 'leadership')!
    expect(full.score).toBe(100) // 3+ answers: no shrinkage
  })
})

describe('blendDimensionScores', () => {
  it('blends 70/30 with the team signal and rebands', () => {
    const scores = scoreDimensions(answersForDimension('leadership', 7)) // leadership = 100
    const out = blendDimensionScores(scores, { leadership: { value: 0, label: 'confidence' } })
    const lead = out.find((d) => d.key === 'leadership')!
    expect(lead.score).toBe(70) // 100*0.7 + 0*0.3
    expect(lead.band).toBe('High')
    expect(lead.team).toEqual({ value: 0, label: 'confidence' })
  })

  it('leaves dimensions without a team signal untouched', () => {
    const scores = scoreDimensions(answersForDimension('leadership', 7))
    const out = blendDimensionScores(scores, {})
    expect(out.find((d) => d.key === 'leadership')!.score).toBe(100)
    expect(out.find((d) => d.key === 'leadership')!.team).toBeUndefined()
  })
})

describe('deriveArchetype', () => {
  it('is null when there is no signal at all', () => {
    expect(deriveArchetype(null, null)).toBeNull()
  })

  it('returns a named archetype with a runner-up and drivers from a Big Five read', () => {
    const bf: BigFiveScores = { openness: 85, conscientiousness: 55, extraversion: 60, agreeableness: 55, neuroticism: 30, emotionalStability: 70 }
    const a = deriveArchetype(bf, null)!
    expect(a.name).toBeTruthy()
    expect(a.runnerUp).toBeTruthy()
    expect(a.runnerUp).not.toBe(a.name)
    expect(a.fromSelf).toBe(true)
    for (const d of a.drivers) expect(['you', 'team']).toContain(d.source)
  })

  it('marks fromSelf false when only team virtue means are given', () => {
    const a = deriveArchetype(null, { courage: 8, drive: 7, confidence: 7 })!
    expect(a.fromSelf).toBe(false)
    // team-sourced virtue signals should drive it
    expect(a.drivers.every((d) => d.source === 'team')).toBe(true)
  })
})

describe('shadeFor', () => {
  it('deepens the colour as the score climbs', () => {
    const o = ORIENTATIONS[0]
    expect(shadeFor(o, 20)).toBe(o.colorLight)
    expect(shadeFor(o, 50)).toBe(o.color)
    expect(shadeFor(o, 90)).toBe(o.colorDark)
  })
})
