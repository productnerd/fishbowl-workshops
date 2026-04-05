import { Fragment, type ReactNode } from 'react'

// Renders a string with **bold** markdown segments as <strong>.
// Deliberately tiny: no links, no italics, no nesting. Safe by construction
// (we build the tree from text nodes, no dangerouslySetInnerHTML).
export default function RichText({ text }: { text: string }) {
  if (!text) return null
  const parts: ReactNode[] = []
  const regex = /\*\*([^*]+)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>)
    }
    parts.push(
      <strong key={key++} className="text-text-primary font-semibold">
        {match[1]}
      </strong>
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>)
  }
  return <>{parts}</>
}
