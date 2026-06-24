// VIA Classification of character strengths: 24 strengths grouped under 6 virtues
// (Peterson & Seligman). The subject and colleagues each pick their TOP-5 from the
// same 24; the report overlays the two. A signature strength is one others see in
// you, not merely one you claim. The 6-virtue grouping drives the report's spread.

export interface ViaStrength {
  id: string
  name: string
  virtue: string
}

export const VIA_STRENGTHS: ViaStrength[] = [
  // Wisdom & Knowledge
  { id: 'creativity', name: 'Creativity', virtue: 'Wisdom & Knowledge' },
  { id: 'curiosity', name: 'Curiosity', virtue: 'Wisdom & Knowledge' },
  { id: 'judgment', name: 'Judgment', virtue: 'Wisdom & Knowledge' },
  { id: 'love-of-learning', name: 'Love of Learning', virtue: 'Wisdom & Knowledge' },
  { id: 'perspective', name: 'Perspective', virtue: 'Wisdom & Knowledge' },
  // Courage
  { id: 'bravery', name: 'Bravery', virtue: 'Courage' },
  { id: 'perseverance', name: 'Perseverance', virtue: 'Courage' },
  { id: 'honesty', name: 'Honesty', virtue: 'Courage' },
  { id: 'zest', name: 'Zest', virtue: 'Courage' },
  // Humanity
  { id: 'love', name: 'Love', virtue: 'Humanity' },
  { id: 'kindness', name: 'Kindness', virtue: 'Humanity' },
  { id: 'social-intelligence', name: 'Social Intelligence', virtue: 'Humanity' },
  // Justice
  { id: 'teamwork', name: 'Teamwork', virtue: 'Justice' },
  { id: 'fairness', name: 'Fairness', virtue: 'Justice' },
  { id: 'leadership', name: 'Leadership', virtue: 'Justice' },
  // Temperance
  { id: 'forgiveness', name: 'Forgiveness', virtue: 'Temperance' },
  { id: 'humility', name: 'Humility', virtue: 'Temperance' },
  { id: 'prudence', name: 'Prudence', virtue: 'Temperance' },
  { id: 'self-regulation', name: 'Self-Regulation', virtue: 'Temperance' },
  // Transcendence
  { id: 'appreciation-of-beauty', name: 'Appreciation of Beauty & Excellence', virtue: 'Transcendence' },
  { id: 'gratitude', name: 'Gratitude', virtue: 'Transcendence' },
  { id: 'hope', name: 'Hope', virtue: 'Transcendence' },
  { id: 'humor', name: 'Humor', virtue: 'Transcendence' },
  { id: 'spirituality', name: 'Spirituality', virtue: 'Transcendence' },
]

export const VIA_PICK = 5
