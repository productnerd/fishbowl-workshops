import InfoDot from './InfoDot'

// A small ⓘ that explains the theory behind a section. Hover (desktop) or tap (mobile).
export default function InfoTip({ text }: { text: string }) {
  return <InfoDot>{text}</InfoDot>
}
