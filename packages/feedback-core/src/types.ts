export type QuestionType =
  | 'mc'
  | 'rating'
  | 'freetext'
  | 'likert'
  | 'scenario'
  | 'virtue'
  | 'energizer'
  | 'responsibilities'
  | 'sixhats'
  | 'radical_candor'
  | 'sdt'
  | 'belbin'
  | 'via'
  | 'johari'

// Where a person sits relative to the Aristotelian mean on a virtue dimension.
export type Tendency = 'deficient' | 'balanced' | 'excessive'

// B2C ("Through Their Eyes") question taxonomy. Optional now that the model is
// shared — Fishbowl groups by the generic `dimension` field instead.
export type QuestionCategory =
  | 'first_impressions'
  | 'strengths'
  | 'communication'
  | 'emotional_intelligence'
  | 'reliability'
  | 'growth'
  | 'social'
  | 'habits'
  | 'appreciation'
  | 'final'

export interface Question {
  id: number
  type: QuestionType
  text: string // for 'likert', this is the statement being agreed/disagreed with
  section: string
  sectionDescription: string
  category?: QuestionCategory // B2C grouping
  dimension?: string // Fishbowl grouping key (e.g. 'courage', 'follow_through')
  // Survey sampling: questions with no `pool` are CORE (every colleague answers);
  // pooled questions share a module id and are sampled per respondent to cap length.
  pool?: string
  scoring?: 'mean-is-best' | 'higher-is-best' // virtue => mean-is-best; competency => higher-is-best
  options?: string[]
  lowLabel?: string
  highLabel?: string
  allowOther?: boolean
  // scenario: maps each chosen option to a tendency
  optionTendencies?: Record<string, Tendency>
  // virtue: bipolar 1-9 slider, 1 & 9 are vices, 5 is the virtue
  virtue?: {
    name: string
    deficientPole: string
    excessivePole: string
    deficientTraits?: string[]
    virtueTraits?: string[]
    excessiveTraits?: string[]
  }
}

export interface Session {
  id: string
  creator_name: string
  slug: string
  created_at: string
  response_count: number
  // Fishbowl: per-dimension subject means, stamped at report time (percentile layer).
  dimension_means?: Record<string, number> | null
  // Self-assessment: stamped when the subject finishes theirs (drives the Create
  // status pill). Non-sensitive flag; the self-assessment CONTENT is bearer-gated.
  self_completed_at?: string | null
  // Session-readable copy of the subject's responsibilities (so anon colleagues can
  // rate them). The self-tiers stay in the bearer-gated self row.
  responsibilities?: string[] | null
}

// The subject's private self-assessment. Read/written only through bearer-verified
// service-role edge functions — never slug-readable.
export interface SelfAssessment {
  session_id: string
  ocean_answers: Record<string, number>
  big_five: import('./personality').BigFiveScores | null
  mbti: import('./personality').MbtiType | null
  self_payload: Record<string, unknown>
  responsibilities: string[]
  completed: boolean
}

// answers is keyed by question id (number) for scalar answers, plus namespaced
// string keys for structured activities (e.g. `energizers` → {activityId: -2..2}).
export type AnswerValue = string | number | string[] | Record<string, number>

export interface Response {
  id: string
  session_id: string
  answers: Record<string | number, AnswerValue>
  completed_at: string
}

export interface VirtueResult {
  mu: number // mean placement (1-5), 3 = the virtuous mean
  sigma: number // spread — how differently people read this person
  tendency: Tendency
  balanceScore: number // 1 = perfectly balanced (mu=3), 0 = extreme pole
  scores: number[]
}

export interface ScenarioResult {
  counts: Record<string, number>
  winner: string
  winnerCount: number
  tendencyTally: Record<Tendency, number>
}

export interface AggregatedResults {
  totalResponses: number
  creatorName: string
  mcResults: Record<number, { counts: Record<string, number>; winner: string; winnerCount: number }>
  ratingResults: Record<number, { average: number; scores: number[] }>
  freetextResults: Record<number, string[]>
  likertResults: Record<number, { average: number; scores: number[] }>
  virtueResults: Record<number, VirtueResult>
  scenarioResults: Record<number, ScenarioResult>
}
