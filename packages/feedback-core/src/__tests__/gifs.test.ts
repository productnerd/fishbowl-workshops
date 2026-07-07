import { describe, it, expect } from 'vitest'
import { firstGifToken, stripGifTokens, allocateGifs, GIF_NAMES, MAX_GIFS_PER_REPORT } from '../gifs'

describe('firstGifToken', () => {
  it('extracts the first valid token, lowercased', () => {
    expect(firstGifToken('You are great. {{gif:blow_kiss}}')).toBe('blow_kiss')
    expect(firstGifToken('{{gif:HIGH_FIVE}} nice')).toBe('high_five')
  })
  it('returns null for unknown names, missing tokens, or empty input', () => {
    expect(firstGifToken('You are great. {{gif:not_a_real_one}}')).toBeNull()
    expect(firstGifToken('no token here')).toBeNull()
    expect(firstGifToken('')).toBeNull()
    expect(firstGifToken(undefined)).toBeNull()
  })
  it('takes only the first token when several are present', () => {
    expect(firstGifToken('{{gif:excitement}} and {{gif:confetti}}')).toBe('excitement')
  })
})

describe('stripGifTokens', () => {
  it('leaves token-free text byte-identical (no whitespace mangling)', () => {
    const s = 'You  land  as calm .\n\nAnd **sharp**.'
    expect(stripGifTokens(s)).toBe(s)
  })
  it('removes every token, valid or not, and tidies spacing', () => {
    expect(stripGifTokens('You are kind. {{gif:blow_kiss}}')).toBe('You are kind.')
    expect(stripGifTokens('Wow {{gif:mind_blown}} really')).toBe('Wow really')
    expect(stripGifTokens('nope {{gif:bogus}} end')).toBe('nope end')
  })
  it('does not leave an empty paragraph when a token sits alone after a break', () => {
    expect(stripGifTokens('Last line.\n\n{{gif:blow_kiss}}')).toBe('Last line.')
  })
  it('strips a token wrapped in emphasis without leaving orphaned asterisks', () => {
    expect(stripGifTokens('**First** in class **{{gif:ta_da}}** wow.')).toBe('**First** in class wow.')
    expect(stripGifTokens('yay *{{gif:wink}}* ok')).toBe('yay ok')
  })
  it('strips malformed tokens (uppercase keyword, missing closing brace) so none leak', () => {
    expect(stripGifTokens('Nice {{GIF:high_five}}')).toBe('Nice')
    expect(stripGifTokens('Wow {{gif:excitement and more text')).toBe('Wow and more text')
    expect(stripGifTokens('empty {{gif:}} tail')).toBe('empty tail')
  })
  it('never eats surrounding bold when a token abuts it', () => {
    expect(stripGifTokens('**bold**{{gif:wink}}')).toBe('**bold**')
  })
})

describe('firstGifToken case-insensitivity', () => {
  it('resolves an uppercase keyword to the lowercase name', () => {
    expect(firstGifToken('{{GIF:high_five}}')).toBe('high_five')
  })
})

describe('allocateGifs', () => {
  it('assigns the first valid token per slot', () => {
    const out = allocateGifs([
      ['a', 'hi {{gif:high_five}}'],
      ['b', 'no gif here'],
      ['c', 'yay {{gif:confetti}}'],
    ])
    expect(out).toEqual({ a: 'high_five', c: 'confetti' })
  })
  it('honors the per-report cap in slot order', () => {
    const many: Array<[string, string]> = Array.from({ length: 14 }, (_, i) => [`s${i}`, '{{gif:excitement}}'])
    const out = allocateGifs(many)
    expect(Object.keys(out)).toHaveLength(MAX_GIFS_PER_REPORT)
    expect(out.s0).toBe('excitement')
    expect(out.s10).toBeUndefined() // 11th slot dropped by the cap
  })
  it('skips invalid names without spending budget', () => {
    const out = allocateGifs([['a', '{{gif:bogus}}'], ['b', '{{gif:wink}}']], 1)
    expect(out).toEqual({ b: 'wink' })
  })
})

describe('vocabulary', () => {
  it('has 30 unique reactions including the requested anchors', () => {
    expect(GIF_NAMES).toHaveLength(30)
    for (const anchor of ['excitement', 'high_five', 'blow_kiss', 'mock_angry']) {
      expect(GIF_NAMES).toContain(anchor)
    }
  })
})
