import type { ReactNode } from 'react'

type Tone = 'paper' | 'red' | 'blue' | 'sand' | 'ink'
const tones: Record<Tone, string> = {
  paper: 'bg-paper-hi text-ink',
  red: 'bg-red text-paper-hi',
  blue: 'bg-blue text-ink',
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
