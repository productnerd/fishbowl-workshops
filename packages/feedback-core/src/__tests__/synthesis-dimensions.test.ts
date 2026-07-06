import { describe, it, expect } from 'vitest'
import { DIMENSIONS as CANON, scoreDimensions as canonScore } from '../dimensions'
// The Deno edge function keeps a hand-copied mirror of the dimension data + scorer. Import
// it directly and prove it stays identical to the canonical source, so the copy can't drift.
import {
  DIMENSIONS as MIRROR,
  scoreDimensions as mirrorScore,
} from '../../../../supabase/functions/fishbowl-synthesis/dimensions.ts'

// Every item id referenced by the canonical dimensions (what a real answer set spans).
const ALL_IDS = [...new Set(CANON.flatMap((d) => d.items.map((i) => i.id)))]

// Deterministic "random" answer set so the test never flakes.
function vector(seed: number): Record<string, number> {
  const a: Record<string, number> = {}
  for (const id of ALL_IDS) {
    let h = seed
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
    a[id] = (h % 7) + 1 // 1..7
  }
  return a
}

describe('synthesis dimension mirror stays in sync with feedback-core', () => {
  it('has the same dimensions, orientations and items (id + reverse)', () => {
    expect(MIRROR.map((d) => d.key).sort()).toEqual(CANON.map((d) => d.key).sort())

    const byKey = new Map(MIRROR.map((d) => [d.key, d]))
    for (const c of CANON) {
      const m = byKey.get(c.key)
      expect(m, `missing dimension "${c.key}" in the edge-function mirror`).toBeDefined()
      expect(m!.label).toBe(c.label)
      expect(m!.orientation).toBe(c.orientation)
      expect(m!.items.map((i) => ({ id: i.id, reverse: i.reverse }))).toEqual(
        c.items.map((i) => ({ id: i.id, reverse: i.reverse }))
      )
    }
  })

  it('produces identical scores across a battery of answer sets', () => {
    const cases: Record<string, number>[] = [
      {}, // all defaults
      Object.fromEntries(ALL_IDS.map((id) => [id, 7])),
      Object.fromEntries(ALL_IDS.map((id) => [id, 1])),
      Object.fromEntries(ALL_IDS.map((id) => [id, 4])),
      vector(1),
      vector(42),
      vector(1000),
    ]
    for (const answers of cases) {
      const canon = new Map(canonScore(answers).map((d) => [d.key, { score: d.score, answered: d.answered }]))
      const mirror = new Map(mirrorScore(answers).map((d) => [d.key, { score: d.score, answered: d.answered }]))
      expect(mirror).toEqual(canon)
    }
  })
})
