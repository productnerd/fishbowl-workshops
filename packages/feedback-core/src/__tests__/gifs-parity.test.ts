import { describe, it, expect } from 'vitest'
import { GIF_NAMES as CANON, GIF_REACTIONS as CANON_R } from '../gifs'
import { GIF_NAMES as AI, GIF_REACTIONS as AI_R } from '../../../../supabase/functions/fishbowl-ai-insights/gifs'
import { GIF_NAMES as SYN, GIF_REACTIONS as SYN_R } from '../../../../supabase/functions/fishbowl-synthesis/gifs'

// The gif vocabulary is mirrored into each edge function so both prompts stay in sync
// with the client, which validates the tokens the AI emits. Drift would let the AI use a
// name the client silently drops. Keep the mirrors identical to the canonical source.
describe('gif vocabulary parity', () => {
  it('ai-insights mirror matches canonical', () => {
    expect(AI).toEqual(CANON)
    expect(AI_R).toEqual(CANON_R)
  })
  it('synthesis mirror matches canonical', () => {
    expect(SYN).toEqual(CANON)
    expect(SYN_R).toEqual(CANON_R)
  })
  it('names are unique, lowercase snake_case, and file-safe', () => {
    expect(new Set(CANON).size).toBe(CANON.length)
    for (const n of CANON) expect(n).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/)
  })
})
