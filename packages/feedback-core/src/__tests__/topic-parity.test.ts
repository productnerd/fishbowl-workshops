// The P0 gate.
//
// v1's survey is hardcoded in `data/questions.ts` (skip lists, lens wording tables, pool
// sets, a fixed order). TOPIC_WORK claims to express all of that purely as configuration.
// This proves it: for every persona and every length, the config-driven resolver must return
// exactly what v1's getSurvey returns, question for question, word for word.
//
// If this test cannot be made to pass, the module boundaries are wrong and we want to know
// that before a builder UI is built on top of them.
// v1-survey.json was emitted from the hardcoded getSurvey BEFORE it was rewritten over the
// resolver, so it is a genuine record of v1 behaviour rather than a restatement of the new
// code. Do not regenerate it: if a change makes it fail, that change alters the v1 survey.
import { describe, it, expect } from 'vitest'
import { questions } from '../../../../apps/fishbowl/src/data/questions'
import { resolveSurvey } from '../topic'
import { MODULES, TOPIC_WORK } from '../topics'
import v1 from './fixtures/v1-survey.json'

const NAME = 'Alex'
const DEPTHS = ['quick', 'standard', 'full']
const PERSONAS = ['work', 'personal']

const fromConfig = (persona: string, length: string, hasResponsibilities: boolean) =>
  resolveSurvey({
    topic: TOPIC_WORK,
    modules: MODULES,
    bank: questions,
    persona,
    length,
    name: NAME,
    hasResponsibilities,
  })

describe('TOPIC_WORK reproduces the v1 survey from config', () => {
  for (const persona of PERSONAS) {
    for (const depth of DEPTHS) {
      for (const hasResponsibilities of [true, false]) {
        it(`matches v1 exactly: ${persona} / ${depth} / responsibilities=${hasResponsibilities}`, () => {
          const expected = (v1 as Record<string, unknown[]>)[`${persona}|${depth}|${hasResponsibilities}`]
          expect(expected, 'fixture case is missing').toBeDefined()
          const actual = fromConfig(persona, depth, hasResponsibilities).map((q) => ({
            id: q.id,
            text: q.text,
            section: q.section,
            sectionDescription: q.sectionDescription,
          }))
          expect(actual).toEqual(expected)
        })
      }
    }
  }
})

describe('registry integrity', () => {
  it('every module the topic uses exists in the registry', () => {
    const known = new Set(MODULES.map((m) => m.key))
    for (const use of TOPIC_WORK.modules) expect(known).toContain(use.key)
  })

  it('every module a length includes is used by the topic', () => {
    const used = new Set(TOPIC_WORK.modules.map((m) => m.key))
    for (const len of TOPIC_WORK.lengths) for (const key of len.modules) expect(used).toContain(key)
  })

  it('claims no question id that is not in the bank', () => {
    const bank = new Set(questions.map((q) => q.id))
    for (const m of MODULES) for (const id of m.questionIds) expect(bank).toContain(id)
  })

  it('assigns every question in the bank to exactly one module', () => {
    const owners = new Map<number, string[]>()
    for (const m of MODULES) for (const id of m.questionIds) owners.set(id, [...(owners.get(id) ?? []), m.key])
    for (const q of questions) expect(owners.get(q.id) ?? []).toHaveLength(1)
  })

  // minN is configurable rather than a hard floor: a trainer may deliberately expose a
  // single-manager column. What we guarantee is that the shipped default is the safe one,
  // so a trainer who never touches it gets per-persona anonymity for free.
  it('ships a safe default minN on every persona', () => {
    for (const p of TOPIC_WORK.personas) expect(p.minN).toBe(2)
  })
})
