import Rich from './Rich'

// A letter from the team: their good-vibes note (goodVibes) narrated as a handwritten
// letter on skeuomorphic stationery. Rendered "bare" (no card chrome) so the paper itself
// is the object. Paragraphs are split on the ¶¶ sentinel the model uses.
export default function LetterFromTeam({ name, body, words, postscript }: { name: string; body: string; words: string[]; postscript?: string }) {
  const paras = body.split(/¶+/).map((p) => p.trim()).filter(Boolean)
  const ps = words.slice(0, 5)

  // Faint ruled lines under the handwriting.
  const ruled = {
    backgroundImage: 'repeating-linear-gradient(#fbf7ec, #fbf7ec 33px, rgba(90,79,69,0.13) 33px, rgba(90,79,69,0.13) 34px)',
  }

  return (
    <div className="text-center">
      <p className="kicker mb-4 text-ink-soft">✉ a letter from your team</p>

      <div className="mx-auto max-w-lg">
        {/* The letter paper */}
        <div
          className="relative rounded-[3px] px-7 pb-6 pt-6 text-left shadow-[7px_12px_0_rgba(42,36,32,0.24)] [rotate:-1.2deg]"
          style={{ ...ruled, backgroundColor: '#fbf7ec' }}
        >
          {/* Postage stamp */}
          <div className="absolute right-4 top-4 [rotate:4deg]">
            <div className="grid h-10 w-9 place-items-center rounded-[2px] border-2 border-dashed border-pink-deep/60 bg-paper-hi text-base">
              💌
            </div>
          </div>

          <p className="handwritten text-xl leading-none text-ink-soft">Dear {name},</p>

          <div className="mt-2.5 space-y-1.5">
            {paras.map((p, i) => (
              <p key={i} className="handwritten text-[1.05rem] leading-[1.45] text-ink">
                <Rich text={p} />
              </p>
            ))}
          </div>

          <p className="handwritten mt-3 text-lg leading-tight text-ink">
            With love,
            <br />
            <span className="text-ink-soft">the people you work with</span> 🫶
          </p>

          {postscript ? (
            <p className="handwritten mt-3 text-base leading-snug text-pink-deep">P.S. {postscript}</p>
          ) : ps.length >= 3 ? (
            <p className="handwritten mt-3 text-base leading-snug text-pink-deep">
              P.S. the words we keep coming back to for you: {ps.join(', ')}.
            </p>
          ) : null}
          {postscript && ps.length >= 3 && (
            <p className="mt-2 text-xs italic leading-snug text-ink-soft/80">the words we keep coming back to: {ps.join(', ')}.</p>
          )}
        </div>
      </div>
    </div>
  )
}
