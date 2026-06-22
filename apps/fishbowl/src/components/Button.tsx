import type { ReactNode } from 'react'

type Variant = 'red' | 'ink' | 'blue' | 'paper'
const variants: Record<Variant, string> = {
  red: 'bg-red text-paper-hi',
  ink: 'bg-ink text-paper-hi',
  blue: 'bg-blue text-ink',
  paper: 'bg-paper-hi text-ink',
}

export default function Button({
  children,
  onClick,
  variant = 'red',
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: Variant
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`press inline-flex items-center justify-center gap-2 rounded-full border-[2.5px] border-ink px-7 py-3.5 font-display text-lg font-black shadow-chunky cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
