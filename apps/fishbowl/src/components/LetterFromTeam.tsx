import Rich from './Rich'

// A letter from the team: their good-vibes note (goodVibes) narrated as a handwritten
// letter on skeuomorphic stationery, tucked into an envelope. Paragraphs in the note are
// split on the ¶¶ sentinel the model uses (keeps the source JSON newline-free).
export default function LetterFromTeam({ name, body, words }: { name: string; body: string; words: string[] }) {
  const paras = body.split(/¶+/).map((p) => p.trim()).filter(Boolean)
  const ps = words.slice(0, 5)

  // Faint ruled lines under the handwriting.
  const ruled = {
    backgroundImage: 'repeating-linear-gradient(#fbf7ec, #fbf7ec 29px, rgba(90,79,69,0.13) 29px, rgba(90,79,69,0.13) 30px)',
  }

  return (
    <div className="text-center">
      <p className="kicker mb-4 text-paper-hi/80">✉ a letter from your team</p>

      <div className="mx-auto max-w-md">
        {/* The letter paper */}
        <div
          className="relative rounded-[3px] px-5 pb-6 pt-5 text-left shadow-[6px_10px_0_rgba(42,36,32,0.22)] [rotate:-1.2deg]"
          style={{ ...ruled, backgroundColor: '#fbf7ec' }}
        >
          {/* Postage stamp */}
          <div className="absolute right-3.5 top-3.5 [rotate:4deg]">
            <div className="grid h-9 w-8 place-items-center rounded-[2px] border-2 border-dashed border-pink-deep/60 bg-paper-hi text-sm">
              💌
            </div>
          </div>

          <p className="handwritten text-lg leading-none text-ink-soft">Dear {name},</p>

          <div className="mt-2 space-y-1">
            {paras.map((p, i) => (
              <p key={i} className="handwritten text-[0.92rem] leading-[1.32] text-ink">
                <Rich text={p} />
              </p>
            ))}
          </div>

          <p className="handwritten mt-2.5 text-base leading-tight text-ink">
            With love,
            <br />
            <span className="text-ink-soft">— the people you work with</span> 🫶
          </p>

          {ps.length >= 3 && (
            <p className="handwritten mt-2 text-[0.82rem] leading-snug text-pink-deep">
              P.S. the words we keep coming back to for you: {ps.join(', ')}.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
