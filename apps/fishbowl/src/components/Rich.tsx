import { stripGifTokens } from '@fishbowl/feedback-core'

// Inline renderer for **bold** and *italic* markdown spans in the AI-generated report
// prose. Shared by the report cards (Results, ManagerReport, ResponsibilitiesLadder).
// Any {{gif:NAME}} tokens are stripped here so they never leak as literal text; the gif
// itself is rendered separately (GifReaction) by the slide that owns it.
export default function Rich({ text }: { text: string }) {
  return (
    <>
      {stripGifTokens(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} className="font-bold">
              {p.slice(2, -2)}
            </strong>
          )
        }
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) {
          return (
            <em key={i} className="italic">
              {p.slice(1, -1)}
            </em>
          )
        }
        return <span key={i}>{p}</span>
      })}
    </>
  )
}
