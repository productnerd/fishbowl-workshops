// Six Thinking Hats (de Bono), adapted as a "too little / ideal / too much" balance
// lens. Each hat is rated on a 1-9 bipolar scale where 1 = too little, 5 = ideal,
// 9 = too much. The subject (self) and colleagues (team) rate the same six hats;
// the report overlays the two. Note: de Bono treats hats as modes to wear
// deliberately, not traits to balance — this is a playful adaptation.

export interface Hat {
  key: string
  name: string
  mode: string
  tint: string // pastel version of the hat's colour, for the box background
  tooLittle: string
  ideal: string
  tooMuch: string
}

export const HATS: Hat[] = [
  {
    key: 'hat_white',
    name: 'White',
    mode: 'Facts & info',
    tint: '#edeae1',
    tooLittle: 'Hand-wavy / ignores data',
    ideal: 'Grounds talk in real facts',
    tooMuch: 'Analysis paralysis',
  },
  {
    key: 'hat_red',
    name: 'Red',
    mode: 'Feelings & intuition',
    tint: '#f4cccc',
    tooLittle: 'Bottles it up',
    ideal: "Names the room's mood",
    tooMuch: 'Runs on pure gut',
  },
  {
    key: 'hat_yellow',
    name: 'Yellow',
    mode: 'Optimism & value',
    tint: '#f3e2a0',
    tooLittle: 'Sees no upside',
    ideal: 'Spots the real upside',
    tooMuch: 'Rose-tinted / Pollyanna',
  },
  {
    key: 'hat_black',
    name: 'Black',
    mode: 'Caution & risks',
    tint: '#d3cec3',
    tooLittle: 'Skips the risks',
    ideal: 'Flags real risks early',
    tooMuch: 'Shoots it all down',
  },
  {
    key: 'hat_green',
    name: 'Green',
    mode: 'Creativity & ideas',
    tint: '#cce4b9',
    tooLittle: 'Sticks to the known',
    ideal: 'Opens up new options',
    tooMuch: 'Endless ideas, no landing',
  },
  {
    key: 'hat_blue',
    name: 'Blue',
    mode: 'Process & meta',
    tint: '#c8dbf2',
    tooLittle: 'Lets it sprawl',
    ideal: 'Keeps thinking on track',
    tooMuch: 'Over-controls',
  },
]

// hat key -> 1..9
export type HatScores = Record<string, number>
