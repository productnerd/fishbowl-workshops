import type { MbtiType } from '@fishbowl/feedback-core'

function TypeContent({ mbti }: { mbti: MbtiType }) {
  return (
    <div className="text-center text-paper-hi">
      <p
        className="kicker text-paper-hi/70"
        title="A playful Big-Five→MBTI approximation — fun, not a real Myers-Briggs result."
      >
        your type ⓘ
      </p>
      <p className="display mt-2 text-6xl tracking-tight">{mbti.type}</p>
      <p className="serif mt-1 text-2xl">{mbti.nickname}</p>
      <p className="mt-3 text-paper-hi/90">{mbti.flavour}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {mbti.signature.map((s) => (
          <span key={s} className="rounded-full border-2 border-paper-hi/60 px-3 py-1 text-sm font-semibold">
            {s}
          </span>
        ))}
      </div>
      <p className="mt-5 text-xs text-paper-hi/60">A playful Big-Five-to-MBTI approximation — fun, not science.</p>
    </div>
  )
}

// bare = render just the content (the parent provides the blue card); otherwise
// render the self-contained blue card-3d (used on the self-assessment reveal).
export default function TypeCard({ mbti, bare = false }: { mbti: MbtiType; bare?: boolean }) {
  if (bare) return <TypeContent mbti={mbti} />
  return (
    <div className="card-3d sc-navy bg-blue p-7">
      <TypeContent mbti={mbti} />
    </div>
  )
}
