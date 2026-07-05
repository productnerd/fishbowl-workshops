export default function FreeText({
  value,
  onChange,
  placeholder = 'Type here… (optional)',
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={maxLength && maxLength <= 140 ? 3 : 5}
        maxLength={maxLength}
        className="w-full resize-none rounded-2xl border-[2.5px] border-ink bg-paper-hi p-4 text-lg text-ink shadow-chunky-sm outline-none transition-shadow placeholder:text-ink-soft/55 focus:shadow-chunky"
      />
      {maxLength != null && (
        <div className="mt-1 text-right text-xs font-semibold text-ink-soft/70">
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  )
}
