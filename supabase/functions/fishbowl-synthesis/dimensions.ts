// Trait-dimension data + scorer used to bake dimension scores into the synthesis prompt.
// This is a HAND-KEPT mirror of packages/feedback-core/src/dimensions.ts, because a Deno
// edge function can't import the npm workspace package. It is deliberately dependency-free
// (no Deno APIs, no imports) so both Deno and the test runner can load it.
//
// Drift guard: packages/feedback-core/src/__tests__/synthesis-dimensions.test.ts imports
// BOTH this file and the canonical source and fails CI if the data or the scores diverge.
// Since CI gates the deploy, this mirror can no longer silently rot.

export const ORIENTATION_TITLE: Record<string, string> = {
  cognitive: 'How you think',
  interpersonal: 'How you engage with others',
  motivational: 'How you apply yourself',
}

export const DIMENSIONS: { key: string; label: string; orientation: string; items: { id: string; reverse: boolean }[] }[] = [
  { key: 'creative', label: 'Creative', orientation: 'cognitive', items: [{ id: 'ocean_O1', reverse: false }, { id: 'ocean_O5', reverse: false }, { id: 'ocean_O7', reverse: false }, { id: 'ocean_O6', reverse: true }] },
  { key: 'deliberative', label: 'Deliberative', orientation: 'cognitive', items: [{ id: 'dim_delib_logic', reverse: false }, { id: 'dim_delib_impartial', reverse: false }, { id: 'ocean_C2', reverse: false }] },
  { key: 'detailed', label: 'Detailed & Reliable', orientation: 'cognitive', items: [{ id: 'ocean_C1', reverse: false }, { id: 'ocean_C7', reverse: false }, { id: 'ocean_C3', reverse: true }, { id: 'ocean_C8', reverse: true }] },
  { key: 'conceptual', label: 'Conceptual', orientation: 'cognitive', items: [{ id: 'dim_conceptual', reverse: false }, { id: 'ocean_O7', reverse: false }, { id: 'ocean_O8', reverse: true }] },
  { key: 'extraverted', label: 'Extraverted', orientation: 'interpersonal', items: [{ id: 'ocean_E1', reverse: false }, { id: 'ocean_E5', reverse: false }, { id: 'ocean_E7', reverse: false }, { id: 'ocean_E3', reverse: true }, { id: 'ocean_E6', reverse: true }] },
  { key: 'tough', label: 'Tough', orientation: 'interpersonal', items: [{ id: 'ocean_A3', reverse: false }, { id: 'ocean_A4', reverse: false }, { id: 'ocean_A6', reverse: false }, { id: 'ocean_A8', reverse: false }, { id: 'ocean_A1', reverse: true }] },
  { key: 'nurturing', label: 'Nurturing', orientation: 'interpersonal', items: [{ id: 'dim_empathy', reverse: false }, { id: 'ocean_A5', reverse: false }, { id: 'ocean_A2', reverse: false }, { id: 'ocean_A7', reverse: false }] },
  { key: 'leadership', label: 'Leadership', orientation: 'interpersonal', items: [{ id: 'dim_lead_charge', reverse: false }, { id: 'dim_lead_bar', reverse: false }, { id: 'ocean_E5', reverse: false }] },
  { key: 'composed', label: 'Composed', orientation: 'motivational', items: [{ id: 'ocean_N3', reverse: false }, { id: 'ocean_N4', reverse: false }, { id: 'ocean_N6', reverse: false }, { id: 'ocean_N8', reverse: false }, { id: 'ocean_N2', reverse: true }] },
  { key: 'autonomous', label: 'Autonomous', orientation: 'motivational', items: [{ id: 'dim_auto_accountable', reverse: false }, { id: 'dim_auto_internal', reverse: false }, { id: 'ocean_C1', reverse: false }] },
  { key: 'flexible', label: 'Flexible', orientation: 'motivational', items: [{ id: 'dim_flex_agile', reverse: false }, { id: 'dim_flex_growth', reverse: false }, { id: 'ocean_N3', reverse: false }] },
  { key: 'determined', label: 'Determined', orientation: 'motivational', items: [{ id: 'dim_determined', reverse: false }, { id: 'ocean_C1', reverse: false }, { id: 'ocean_N8', reverse: false }] },
]

export function scoreDimensions(answers: Record<string, number>) {
  return DIMENSIONS.map((d) => {
    const vals = d.items
      .map((it) => (typeof answers[it.id] === 'number' ? (it.reverse ? 8 - answers[it.id] : answers[it.id]) : null))
      .filter((v): v is number => v != null)
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 4
    // <3 answered items shrinks toward neutral 50, so one answer can't swing a score.
    const raw = ((mean - 1) / 6) * 100
    const confidence = Math.min(vals.length, 3) / 3
    return { key: d.key, label: d.label, orientation: d.orientation, score: Math.round(50 + (raw - 50) * confidence), answered: vals.length }
  })
}
