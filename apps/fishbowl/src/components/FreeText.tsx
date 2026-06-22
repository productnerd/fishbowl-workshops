export default function FreeText({
  value,
  onChange,
  placeholder = 'Type here… (optional)',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={5}
      className="w-full resize-none rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 text-lg text-ink shadow-chunky-sm outline-none transition-shadow placeholder:text-ink-soft/55 focus:shadow-chunky"
    />
  )
}
