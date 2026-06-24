// Energizers vs Drains (Marcus Buckingham). The SAME activity list is tagged by
// the subject (self) and, separately, by colleagues (team) on a signed −2…+2
// scale; the report overlays the two. A strength is what energizes you, not
// merely what you're good at.

export interface EnergizerActivity {
  id: string
  label: string
}

export const ENERGIZER_ACTIVITIES: EnergizerActivity[] = [
  { id: 'connect', label: 'Talking to people & building relationships' },
  { id: 'present', label: 'Presenting & public speaking' },
  { id: 'deepwork', label: 'Deep-focus solo work' },
  { id: 'plan', label: 'Planning & organizing ahead' },
  { id: 'firefight', label: 'Firefighting & the unexpected' },
  { id: 'mentor', label: 'Mentoring & developing others' },
  { id: 'analyze', label: 'Analysis & working with data' },
  { id: 'negotiate', label: 'Negotiating & persuading' },
  { id: 'ideate', label: 'Brainstorming & new ideas' },
  { id: 'execute', label: 'Detailed execution & finishing things' },
  { id: 'lead', label: 'Leading & directing a group' },
  { id: 'reflect', label: 'Giving & receiving feedback' },
]

export const ENERGIZER_SCALE: { v: number; label: string; emoji: string }[] = [
  { v: -2, label: 'Drains', emoji: '🪫' },
  { v: -1, label: 'Tires', emoji: '😮‍💨' },
  { v: 0, label: 'Neutral', emoji: '😐' },
  { v: 1, label: 'Lifts', emoji: '🙂' },
  { v: 2, label: 'Energizes', emoji: '⚡' },
]

// activityId -> -2..2
export type EnergizerTags = Record<string, number>
