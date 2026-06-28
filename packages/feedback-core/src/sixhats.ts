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
  // Fuller, behaviour-level explanations for each end and the middle (shown on hover).
  tooLittleInfo: string
  idealInfo: string
  tooMuchInfo: string
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
    tooLittleInfo: 'You run on gut and vibes, making claims without checking the numbers or naming sources, so decisions rest on assumptions nobody has verified.',
    idealInfo: 'You bring the relevant facts and separate what is actually known from what is assumed, so the conversation stands on evidence.',
    tooMuchInfo: 'You keep gathering more data and cannot act until everything is certain, so progress stalls waiting for one more number.',
  },
  {
    key: 'hat_red',
    name: 'Red',
    mode: 'Feelings & intuition',
    tint: '#f4cccc',
    tooLittle: 'Bottles it up',
    ideal: "Names the room's mood",
    tooMuch: 'Runs on pure gut',
    tooLittleInfo: 'You keep emotion out of it and ignore the mood in the room, so real reactions go unspoken and resurface later as friction.',
    idealInfo: 'You name how people actually feel, including your own gut read, and treat it as real signal worth acting on.',
    tooMuchInfo: 'You run on raw emotion in the moment, letting how you feel override the facts and steer the decision.',
  },
  {
    key: 'hat_yellow',
    name: 'Yellow',
    mode: 'Optimism & value',
    tint: '#f3e2a0',
    tooLittle: 'Sees no upside',
    ideal: 'Spots the real upside',
    tooMuch: 'Rose-tinted / Pollyanna',
    tooLittleInfo: 'You default to why things will not work and struggle to see the upside, so promising ideas get dismissed before they get a fair hearing.',
    idealInfo: 'You spot the genuine value and best case in an idea and make the constructive argument for it.',
    tooMuchInfo: 'You see only the upside and wave away real concerns, selling a rosy picture that sets people up for nasty surprises.',
  },
  {
    key: 'hat_black',
    name: 'Black',
    mode: 'Caution & risks',
    tint: '#d3cec3',
    tooLittle: 'Skips the risks',
    ideal: 'Flags real risks early',
    tooMuch: 'Shoots it all down',
    tooLittleInfo: 'You skip the risks and downsides, so foreseeable problems blindside the team later when they are expensive to fix.',
    idealInfo: 'You flag the real risks and failure modes early, while there is still time to plan around them.',
    tooMuchInfo: 'You lead with what could go wrong and shoot ideas down, so momentum and good options die in caution.',
  },
  {
    key: 'hat_green',
    name: 'Green',
    mode: 'Creativity & ideas',
    tint: '#cce4b9',
    tooLittle: 'Sticks to the known',
    ideal: 'Opens up new options',
    tooMuch: 'Endless ideas, no landing',
    tooLittleInfo: 'You stick to the known and proven and rarely float alternatives, so the team never sees options that might have been better.',
    idealInfo: 'You open up fresh options and possibilities, widening what the group considers before it commits.',
    tooMuchInfo: 'You generate endless ideas without ever converging, so nothing lands and the team drowns in possibilities.',
  },
  {
    key: 'hat_blue',
    name: 'Blue',
    mode: 'Process & meta',
    tint: '#c8dbf2',
    tooLittle: 'Lets it sprawl',
    ideal: 'Keeps thinking on track',
    tooMuch: 'Over-controls',
    tooLittleInfo: 'You let discussions sprawl with no agenda or summary, so meetings wander and decisions never get captured.',
    idealInfo: 'You keep the thinking on track, set the agenda, and pull out the decision and the next steps.',
    tooMuchInfo: 'You over-manage the process and police how everyone thinks, until the structure crowds out the actual work.',
  },
]

// hat key -> 1..9
export type HatScores = Record<string, number>
