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
  description:
    'The original Fishbowl. Character, thinking style, team role and the words people reach for when they describe you.',
  audience: 'Anyone, at any level. The best first fishbowl.',
  emoji: '🐠',
  accent: '#1366ac',

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
    { key: 'work', label: 'We work together', hint: 'Colleague, manager, report, or client.', minN: 2, voice: 'work' },
    {
      key: 'personal',
      label: 'We are friends or family',
      hint: 'Friend, partner, family, or someone close.',
      minN: 2,
      voice: 'personal',
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
    { key: 'quick', label: 'Quick', modules: QUICK, minutes: [2, 3] },
    { key: 'standard', label: 'Standard', modules: STANDARD, minutes: [3, 4] },
    { key: 'full', label: 'Full', modules: FULL, minutes: [6, 8] },
  ],

  // Lead with the rich activities, coast out on the plain agree-scales.
  order: [30, 27, 28, 25, 26, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 24, 32, 20, 11, 14],

  thresholds: { minResponses: 3, minPerPersona: 2 },
}

// ── Topic #2: a leadership workshop ──────────────────────────────────────────────
// Genuinely different from topic #1, which is the point: a narrower module set, four
// personas instead of two, and wording that assumes the subject leads people. The
// report degrades to the modules present, so dropping the vibe and first-impression
// reads simply removes those slides.
const LEAD_CORE = ['virtues', 'appreciation']
const LEAD_STANDARD = [...LEAD_CORE, 'competencies', 'johari']
const LEAD_FULL = [...LEAD_STANDARD, 'candor', 'sdt', 'belbin', 'hats']

export const TOPIC_LEADERSHIP: TopicConfig = {
  key: 'leading-a-team',
  name: 'Leading a team',
  description:
    'How your leadership actually lands: whether people feel safe to disagree with you, what your feedback does to them, and the role you really play.',
  audience: 'Managers, leads and anyone who has people looking to them.',
  emoji: '🧭',
  accent: '#8a4b8f',

  modules: [
    // Rigor and generosity read as individual-contributor traits here; the leadership
    // read is carried by courage, candor, composure, collaboration and decisiveness.
    { key: 'virtues', exclude: [7, 9] },
    {
      key: 'competencies',
      exclude: [12, 13, 16],
      overrides: {
        11: { text: '{name} does what they said they would do.', section: 'As a leader' },
        14: { text: '{name} is reachable when you actually need them.', section: 'As a leader' },
        15: { text: '{name} makes the people around them better.', section: 'As a leader' },
      },
    },
    { key: 'appreciation', overrides: { 20: { text: 'What does {name} do as a leader that you would want to keep?' } } },
    { key: 'candor' },
    { key: 'sdt' },
    { key: 'belbin' },
    { key: 'hats' },
    { key: 'johari' },
  ],

  personas: [
    {
      key: 'report',
      label: 'They manage me',
      hint: 'You report to them, directly or dotted line.',
      minN: 2,
      overrides: {
        2: { text: 'When something needs saying to me, {name}…' },
        8: { text: 'When I push back on them, {name}…' },
        27: { text: 'After a one to one with {name}, you feel…' },
      },
    },
    {
      key: 'peer',
      label: 'We are peers',
      hint: 'You work alongside them at a similar level.',
      minN: 2,
      overrides: { 27: { text: 'After working alongside {name}, you feel…' } },
    },
    {
      key: 'manager',
      label: 'I manage them',
      hint: 'They report to you.',
      minN: 2,
      // A boss rating how their report's team feels is second-hand; drop it.
      exclude: [27],
      overrides: {
        4: { text: 'On stepping up to bigger things, {name}…' },
        10: { text: 'When a call needs making without me, {name}…' },
      },
    },
    {
      key: 'mentor',
      label: 'I mentor or coach them',
      hint: 'You advise them from outside their reporting line.',
      minN: 2,
      // A mentor sees the person, not the team dynamics.
      exclude: [27, 28],
    },
  ],

  lengths: [
    { key: 'standard', label: 'Standard', modules: LEAD_STANDARD, minutes: [4, 5] },
    { key: 'full', label: 'Full', modules: LEAD_FULL, minutes: [7, 9] },
  ],

  order: [30, 27, 28, 25, 26, 1, 2, 3, 4, 5, 6, 8, 10, 20, 11, 14, 15],

  thresholds: { minResponses: 3, minPerPersona: 2 },
}

// ── Topic #3: the short one ──────────────────────────────────────────────────────
// Deliberately small, to show that a topic can be a fifteen-minute workshop opener
// rather than a full instrument. One length, two personas, four modules.
export const TOPIC_FIRST_IMPRESSIONS: TopicConfig = {
  key: 'how-you-come-across',
  name: 'How you come across',
  description:
    'A short one. The gut read people form of you, the words they pick, and what they appreciate but rarely say out loud.',
  audience: 'A warm opener for a workshop, or a first fishbowl for a nervous team.',
  emoji: '👋',
  accent: '#c2557a',

  modules: [
    { key: 'vibe' },
    { key: 'firstImpression' },
    { key: 'johari' },
    { key: 'appreciation' },
  ],

  personas: [
    { key: 'work', label: 'We work together', hint: 'Colleague, manager, report, or client.', minN: 2, voice: 'work' },
    {
      key: 'personal',
      label: 'We know each other outside work',
      hint: 'Friend, partner, family, or someone close.',
      minN: 2,
      voice: 'personal',
      overrides: {
        20: { text: 'What do you most appreciate about {name}?' },
        33: { text: 'How did {name} come across when you first met?' },
      },
    },
  ],

  lengths: [{ key: 'quick', label: 'Quick', modules: ['vibe', 'firstImpression', 'johari', 'appreciation'], minutes: [2, 2] }],

  order: [33, 30, 32, 20],

  thresholds: { minResponses: 3, minPerPersona: 2 },
}

/** The catalogue, in the order it is browsed. */
export const TOPICS: TopicConfig[] = [TOPIC_WORK, TOPIC_LEADERSHIP, TOPIC_FIRST_IMPRESSIONS]

export const DEFAULT_TOPIC_KEY = TOPIC_WORK.key

/** Look up a topic, falling back to the default so a bad link never dead-ends. */
export const getTopic = (key: string | undefined | null): TopicConfig =>
  TOPICS.find((t) => t.key === key) ?? TOPIC_WORK
