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

      <div className="relative mx-auto max-w-md">
        {/* The letter paper */}
        <div
          className="relative rounded-[3px] px-5 pb-11 pt-5 text-left shadow-[6px_10px_0_rgba(42,36,32,0.22)] [rotate:-1.2deg]"
          style={{ ...ruled, backgroundColor: '#fbf7ec' }}
        >
          {/* Postage stamp */}
          <div className="absolute right-3.5 top-3.5 [rotate:4deg]">
            <div className="grid h-9 w-8 place-items-center rounded-[2px] border-2 border-dashed border-pink-deep/60 bg-paper-hi text-sm">
              💌
            </div>
          </div>

          <p className="handwritten text-xl leading-none text-ink-soft">Dear {name},</p>

          <div className="mt-2 space-y-1.5">
            {paras.map((p, i) => (
              <p key={i} className="handwritten text-[1.02rem] leading-[1.38] text-ink">
                <Rich text={p} />
              </p>
            ))}
          </div>

          <p className="handwritten mt-3 text-lg leading-tight text-ink">
            With love,
            <br />
            <span className="text-ink-soft">— the people you work with</span> 🫶
          </p>

          {ps.length >= 3 && (
            <p className="handwritten mt-2 text-[0.95rem] leading-snug text-pink-deep">
              P.S. the words we keep coming back to for you: {ps.join(', ')}.
            </p>
          )}
        </div>

        {/* Envelope pocket the letter sits in */}
        <svg viewBox="0 0 400 96" className="absolute -bottom-3 left-1/2 -z-0 w-[104%] -translate-x-1/2" aria-hidden="true">
          <rect x="2" y="20" width="396" height="74" rx="8" fill="#e0b48a" stroke="#2a2420" strokeWidth="3" />
          <path d="M2 28 L200 78 L398 28" fill="none" stroke="#2a2420" strokeWidth="3" strokeLinejoin="round" opacity="0.5" />
          <path d="M2 94 L150 52 M398 94 L250 52" stroke="#2a2420" strokeWidth="3" opacity="0.35" />
        </svg>
      </div>
    </div>
  )
}
