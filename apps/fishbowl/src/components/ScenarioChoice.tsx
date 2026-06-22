export default function ScenarioChoice({
  options,
  selected,
  onSelect,
}: {
  options: string[]
  selected: string | null
  onSelect: (o: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((o) => {
        const sel = selected === o
        return (
          <button
            key={o}
            type="button"
            onClick={() => onSelect(o)}
            className={`depress cursor-pointer rounded-2xl border-[2.5px] border-ink px-5 py-4 text-left text-lg font-semibold ${
              sel ? 'bg-red text-paper-hi is-on' : 'bg-paper-hi text-ink'
            }`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}
