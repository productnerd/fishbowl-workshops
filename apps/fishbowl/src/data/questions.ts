import type { Question } from '@fishbowl/feedback-core'

// Mirrors supabase/functions/fishbowl-ai-insights QUESTIONS (ids must match).
// Placeholder content — wording will change; structure is the contract.
export const questions: Question[] = [
  // ── Character: 10 Aristotelian virtue sliders (1 & 5 are vices, 3 is the virtue) ──
  { id: 1, type: 'virtue', dimension: 'courage', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On facing risk and hard calls, {name} is…', virtue: { name: 'Courage', deficientPole: 'Avoids all risk', excessivePole: 'Recklessly bold' } },
  { id: 2, type: 'virtue', dimension: 'candor', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On directness, {name} is…', virtue: { name: 'Candor', deficientPole: 'Evasive', excessivePole: 'Brutally blunt' } },
  { id: 3, type: 'virtue', dimension: 'confidence', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On self-assurance, {name} is…', virtue: { name: 'Confidence', deficientPole: 'Self-deprecating', excessivePole: 'Arrogant' } },
  { id: 4, type: 'virtue', dimension: 'drive', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On ambition, {name} is…', virtue: { name: 'Drive', deficientPole: 'Complacent', excessivePole: 'Ruthless' } },
  { id: 5, type: 'virtue', dimension: 'composure', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'Under pressure, {name} is…', virtue: { name: 'Composure', deficientPole: 'A pushover', excessivePole: 'Short-fused' } },
  { id: 6, type: 'virtue', dimension: 'collaboration', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On working with others, {name} is…', virtue: { name: 'Collaboration', deficientPole: 'A lone wolf', excessivePole: 'Cannot decide alone' } },
  { id: 7, type: 'virtue', dimension: 'rigor', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On attention to detail, {name} is…', virtue: { name: 'Rigor', deficientPole: 'Sloppy', excessivePole: 'Cannot ship' } },
  { id: 8, type: 'virtue', dimension: 'receptiveness', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On taking input, {name} is…', virtue: { name: 'Receptiveness', deficientPole: 'Defensive', excessivePole: 'Over-accommodating' } },
  { id: 9, type: 'virtue', dimension: 'generosity', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On sharing credit and helping, {name} is…', virtue: { name: 'Generosity', deficientPole: 'Credit-hoarding', excessivePole: 'Self-sacrificing' } },
  { id: 10, type: 'virtue', dimension: 'decisiveness', section: 'Character', sectionDescription: 'Place {name} between two extremes. The middle is the virtue.', text: 'On making decisions, {name} is…', virtue: { name: 'Decisiveness', deficientPole: 'Indecisive', excessivePole: 'Impulsive' } },

  // ── At Work: 6 competencies (1-5 agree, higher is better) ──
  { id: 11, type: 'likert', dimension: 'follow_through', scoring: 'higher-is-best', section: 'At Work', sectionDescription: 'How much do you agree?', text: '{name} reliably delivers on what they commit to.', lowLabel: 'Disagree', highLabel: 'Agree' },
  { id: 12, type: 'likert', dimension: 'clarity', scoring: 'higher-is-best', section: 'At Work', sectionDescription: 'How much do you agree?', text: '{name} communicates clearly and concisely.', lowLabel: 'Disagree', highLabel: 'Agree' },
  { id: 13, type: 'likert', dimension: 'ownership', scoring: 'higher-is-best', section: 'At Work', sectionDescription: 'How much do you agree?', text: '{name} takes ownership when things go wrong.', lowLabel: 'Disagree', highLabel: 'Agree' },
  { id: 14, type: 'likert', dimension: 'responsiveness', scoring: 'higher-is-best', section: 'At Work', sectionDescription: 'How much do you agree?', text: '{name} is responsive and easy to reach when needed.', lowLabel: 'Disagree', highLabel: 'Agree' },
  { id: 15, type: 'likert', dimension: 'mentoring', scoring: 'higher-is-best', section: 'At Work', sectionDescription: 'How much do you agree?', text: '{name} helps others grow and shares knowledge generously.', lowLabel: 'Disagree', highLabel: 'Agree' },
  { id: 16, type: 'likert', dimension: 'prioritization', scoring: 'higher-is-best', section: 'At Work', sectionDescription: 'How much do you agree?', text: '{name} focuses on what matters most.', lowLabel: 'Disagree', highLabel: 'Agree' },

  // ── In the Moment: 3 scenarios ──
  { id: 17, type: 'scenario', dimension: 'conflict_style', section: 'In the Moment', sectionDescription: 'Pick what feels most true.', text: "When {name} disagrees with a teammate's approach, they usually…", options: ['Avoid it and let it slide', 'Raise it directly and hear them out', 'Push hard until they win'], optionTendencies: { 'Avoid it and let it slide': 'deficient', 'Raise it directly and hear them out': 'balanced', 'Push hard until they win': 'excessive' } },
  { id: 18, type: 'scenario', dimension: 'deadline_style', section: 'In the Moment', sectionDescription: 'Pick what feels most true.', text: 'Facing a slipping deadline, {name} tends to…', options: ['Quietly hope it works out', 'Flag it early and re-plan', 'Pull all-nighters and burn out'], optionTendencies: { 'Quietly hope it works out': 'deficient', 'Flag it early and re-plan': 'balanced', 'Pull all-nighters and burn out': 'excessive' } },
  { id: 19, type: 'scenario', dimension: 'feedback_style', section: 'In the Moment', sectionDescription: 'Pick what feels most true.', text: 'Given critical feedback, {name}…', options: ['Gets defensive', 'Considers it and adjusts', 'Over-corrects and loses their own view'], optionTendencies: { 'Gets defensive': 'deficient', 'Considers it and adjusts': 'balanced', 'Over-corrects and loses their own view': 'excessive' } },

  // ── In Their Words: 3 free-text (synthesized, never shown verbatim) ──
  { id: 20, type: 'freetext', dimension: 'appreciation', section: 'In Their Words', sectionDescription: 'A few honest words. Stays anonymous.', text: 'What do you most appreciate about working with {name}?' },
  { id: 21, type: 'freetext', dimension: 'growth', section: 'In Their Words', sectionDescription: 'A few honest words. Stays anonymous.', text: 'What is one thing that would make {name} even more effective?' },
  { id: 22, type: 'freetext', dimension: 'message', section: 'In Their Words', sectionDescription: 'A few honest words. Stays anonymous.', text: 'If {name} could read one thing from this feedback, what should it be?' },
]

export function getQuestionsForName(name: string): Question[] {
  return questions.map((q) => ({
    ...q,
    text: q.text.replace(/\{name\}/g, name),
    sectionDescription: q.sectionDescription.replace(/\{name\}/g, name),
  }))
}
