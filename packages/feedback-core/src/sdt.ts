// What You Fuel (Self-Determination Theory needs). TEAM ONLY — the subject does
// not self-rate; the report shows what they leave in collaborators' tanks.
// Colleagues distribute up to 20 points across the needs, completing the stem
// "After working with {name}, I feel…". The first three are Deci & Ryan's canonical
// triad; the rest are well-supported SDT-adjacent extensions.

export interface SdtNeed {
  key: string
  label: string
  feelStem: string
}

export const SDT_NEEDS: SdtNeed[] = [
  { key: 'autonomy', label: 'Autonomy', feelStem: '…free and trusted to do it my own way' },
  { key: 'competence', label: 'Competence', feelStem: '…more capable and on top of my game' },
  { key: 'relatedness', label: 'Relatedness', feelStem: '…genuinely connected and part of a team' },
  { key: 'purpose', label: 'Purpose', feelStem: '…clear on why the work matters' },
  { key: 'safety', label: 'Safety', feelStem: '…safe to speak up and be honest' },
  { key: 'vitality', label: 'Vitality', feelStem: '…energized rather than drained' },
  { key: 'growth', label: 'Growth', feelStem: '…like I am learning and getting sharper' },
  { key: 'recognition', label: 'Recognition', feelStem: '…seen and appreciated for what I bring' },
  { key: 'impact', label: 'Impact', feelStem: '…that my work makes a real difference' },
]

export const SDT_TOTAL = 20
