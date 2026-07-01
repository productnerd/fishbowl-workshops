type Role = { name: string; short: string; cluster: string }
type Fuel = { label: string; feelStem: string }

const CLUSTER_ICON: Record<string, string> = { Thinking: '🧠', Action: '⚡', People: '🤝' }
const FUEL_ICON: Record<string, string> = {
  Autonomy: '🕊️', Competence: '💪', Relatedness: '🤝', Purpose: '🎯', Safety: '🛡️', Vitality: '🔋',
}

// One combined slide: the Belbin role the team most casts you in, and the top needs
// (SDT) you leave others feeling. Replaces the two separate role/fuel slides.
export default function RoleFuel({ role, fuels }: { role: Role | null; fuels: Fuel[] }) {
  return (
    <div className="flex flex-col gap-4">
      {role && (
        <div className="rounded-2xl border-[2.5px] border-ink bg-sand p-5 shadow-chunky-sm">
          <p className="kicker mb-2 text-blue-deep">the role you play</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{CLUSTER_ICON[role.cluster] ?? '🧩'}</span>
            <p className="serif text-2xl font-black leading-tight text-ink">{role.name}</p>
          </div>
          <p className="mt-2.5 leading-relaxed text-ink-soft">{role.short}</p>
        </div>
      )}
      {fuels.length > 0 && (
        <div className="rounded-2xl border-[2.5px] border-ink bg-paper-hi p-5 shadow-chunky-sm">
          <p className="kicker mb-3 text-pink-deep">what you spark in others</p>
          <ul className="flex flex-col gap-3.5">
            {fuels.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <span className="text-2xl leading-none">{FUEL_ICON[f.label] ?? '✨'}</span>
                <span>
                  <span className="serif font-black text-ink">{f.label}</span>
                  <span className="block text-sm leading-snug text-ink-soft">They leave {f.feelStem}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
