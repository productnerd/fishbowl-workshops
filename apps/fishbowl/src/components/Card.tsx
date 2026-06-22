import type { ReactNode } from 'react'

type Tone = 'paper' | 'pink' | 'blue' | 'sand' | 'ink'
const tones: Record<Tone, string> = {
  paper: 'bg-paper-hi text-ink',
  pink: 'bg-pink text-ink sc-pink',
  blue: 'bg-blue text-paper-hi sc-navy',
  sand: 'bg-sand text-ink',
  ink: 'bg-ink text-paper-hi',
}

export default function Card({
  children,
  tone = 'paper',
  press = false,
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  press?: boolean
  className?: string
}) {
  return (
    <div className={`card-3d ${tones[tone]} ${press ? 'press cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}
