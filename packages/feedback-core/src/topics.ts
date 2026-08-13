// The module registry, and topic #1.
//
// The registry describes the modules Fishbowl owns: which question ids each covers, whether
// a trainer may add items to it, and which report slides it can feed. It holds ids only, so
// it stays independent of where the question bank itself lives.
//
// TOPIC_WORK reproduces the v1 consumer survey exactly, as configuration. Everything that
// was a hardcoded constant in `data/questions.ts` appears here as data: the colleague skip
// list became module excludes, the two relationship lenses became two personas, the pool
// sets became lengths, and the presentation order became `order`.
import type { ModuleSpec, TopicConfig } from './topic'

export const MODULES: ModuleSpec[] = [
  {
    key: 'virtues',
    name: 'Character virtues',
    questionIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    extensible: true,
    slides: ['virtue-gauges', 'strengths-map', 'golden-score'],
  },
  {
    key: 'competencies',
    name: 'At work',
    questionIds: [11, 12, 13, 14, 15, 16],
    extensible: true,
    slides: ['competency-bars'],
  },
  {
    key: 'scenarios',
    name: 'In the moment',
    questionIds: [17, 18, 19],
    extensible: true,
    slides: [],
  },
  { key: 'appreciation', name: 'In their words', questionIds: [20], extensible: false, slides: ['appreciations'] },
  {
    key: 'responsibilities',
    name: 'Responsibilities',
    questionIds: [24],
    extensible: true,
    slides: ['responsibilities'],
  },
  { key: 'hats', name: 'Six thinking hats', questionIds: [25], extensible: false, slides: ['hats-radar', 'golden-score'] },
  { key: 'candor', name: 'Feedback style', questionIds: [26], extensible: false, slides: ['candor-plot'] },
  { key: 'sdt', name: 'After working together', questionIds: [27], extensible: false, slides: ['sdt-bars'] },
  { key: 'belbin', name: 'Team role', questionIds: [28], extensible: false, slides: ['belbin-roles'] },
  { key: 'via', name: 'Signature strengths', questionIds: [29], extensible: true, slides: [] },
  { key: 'johari', name: 'In a word', questionIds: [30], extensible: true, slides: ['johari-window', 'strengths-map'] },
  { key: 'nohari', name: 'Watch-outs', questionIds: [31], extensible: true, slides: ['watchouts'] },
  { key: 'vibe', name: 'Vibe', questionIds: [32], extensible: false, slides: ['aura'] },
  { key: 'firstImpression', name: 'First impression', questionIds: [33], extensible: false, slides: ['first-impression'] },
]

// Asked of everyone at every length. Was "no `pool`" in v1.
const CORE = ['virtues', 'vibe', 'appreciation']
// Quick adds the light agree-scales; standard adds the merged adjective pick; full adds
// every deeper framework activity, responsibilities among them. Matches v1's
// QUICK_POOLS / STANDARD_POOLS / null.
const QUICK = [...CORE, 'competencies']
const STANDARD = [...QUICK, 'johari']
const FULL = [...STANDARD, 'responsibilities', 'hats', 'candor', 'sdt', 'belbin']

export const TOPIC_WORK: TopicConfig = {
  key: 'how-you-show-up-at-work',
  name: 'How you show up at work',

  // v1's COLLEAGUE_SKIP, expressed where each id belongs. The scenarios, VIA, Nohari and
  // first-impression modules are absent entirely: VIA and Nohari merge into the single
  // Johari pick, and the other two were cut from the colleague survey. They stay in the
  // question bank for the self flow and for report label lookups.
  modules: [
    { key: 'virtues' },
    { key: 'competencies', exclude: [12, 13, 15, 16] },
    { key: 'appreciation' },
    { key: 'responsibilities' },
    { key: 'hats' },
    { key: 'candor' },
    { key: 'sdt' },
    { key: 'belbin' },
    { key: 'johari' },
    { key: 'vibe' },
  ],

  personas: [
    { key: 'work', label: 'A colleague', minN: 2 },
    {
      key: 'personal',
      label: 'A friend or family member',
      minN: 2,
      // Team roles and work responsibilities do not translate outside work.
      exclude: [28, 24],
      // Same constructs, re-framed. Confidence, the adjective pick and the vibe read are
      // universal, so they carry no override.
      overrides: {
        1: { text: 'When something scary or hard comes up, {name}…' },
        2: { text: 'When something is off between you, {name}…' },
        4: { text: 'On going after what they want, {name}…' },
        5: { text: 'When things get tense or stressful, {name}…' },
        6: { text: 'When plans involve other people, {name}…' },
        7: { text: 'On following through on the little things, {name}…' },
        8: { text: 'When you give them honest feedback, {name}…' },
        9: { text: 'On showing up for the people around them, {name}…' },
        10: { text: 'When there is a call to make, {name}…' },
        11: { text: '{name} shows up when they say they will.', section: 'Showing up' },
        14: { text: '{name} is there for you when you need them.', section: 'Showing up' },
        20: { text: 'What do you most appreciate about {name}?' },
        26: { text: 'How does {name} balance honesty and kindness with you?', section: 'Honesty' },
        27: { text: 'After spending time with {name}, you feel…', section: 'After time together' },
      },
    },
  ],

  lengths: [
    { key: 'quick', label: 'Quick', modules: QUICK },
    { key: 'standard', label: 'Standard', modules: STANDARD },
    { key: 'full', label: 'Full', modules: FULL },
  ],

  // Lead with the rich activities, coast out on the plain agree-scales.
  order: [30, 27, 28, 25, 26, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 24, 32, 20, 11, 14],

  thresholds: { minResponses: 3, minPerPersona: 2 },
}
