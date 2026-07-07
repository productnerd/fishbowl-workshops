# Reaction GIFs

Drop one file per reaction in **this folder** (`apps/fishbowl/public/gifs/`), named exactly
`<name>.gif` (lowercase, as listed below). Source them from Giphy or anywhere; keep them
small and tasteful (ideally under ~1.5 MB, roughly square or landscape).

How it works: the report AI may append a `{{gif:NAME}}` tag to a text-heavy slide, picking
only from this list. The client shows **at most one gif per slide** and **10 per report**.
The prompt tells the AI in strong terms: **if no gif truly fits the moment, add none** (that
is the default; gifs are meant to be rare and special). Any name without a file is silently
skipped, so nothing appears or breaks until you add files.

Canonical list also lives in `packages/feedback-core/src/gifs.ts`. Filenames must match exactly.

---

## Warm (affection, gratitude, celebration of the person)

- **`high_five.gif`** — two people slapping a triumphant high-five, or a solo enthusiastic
  high-five to camera. *Feeling: "we did that together." Search: "high five", "nailed it".*
- **`blow_kiss.gif`** — someone blowing a kiss toward the camera, hand sweeping from lips.
  *Feeling: affectionate sign-off on the team letter. Search: "blowing a kiss", "mwah".*
- **`standing_ovation.gif`** — a crowd or a person rising to their feet, applauding hard.
  *Feeling: full-hearted applause for the whole person. Search: "standing ovation", "applause".*
- **`warm_hug.gif`** — two characters wrapping into a big, cozy hug (Pooh/Baymax-style warmth
  reads well). *Feeling: comfort and belonging. Search: "warm hug", "big hug".*
- **`heart_hands.gif`** — hands forming a heart shape, or hearts floating up from the chest.
  *Feeling: "the team adores you." Search: "heart hands", "finger heart", "love you".*
- **`happy_tears.gif`** — someone tearing up with a smile, dabbing a joyful tear, touched.
  *Feeling: a line that makes them feel truly seen. Search: "happy tears", "so touched".*

## Hype (energy, reveals, arrival)

- **`excitement.gif`** — bouncing, arms up, giddy can't-sit-still excitement.
  *Feeling: opening / first big positive beat. Search: "so excited", "excited jump".*
- **`drumroll.gif`** — hands drumming fast on a table/drum, building suspense.
  *Feeling: the beat right before a reveal. Search: "drumroll", "suspense".*
- **`ta_da.gif`** — a magician-style reveal with jazz hands / sparkles, "ta-da!".
  *Feeling: the reveal lands with a flourish. Search: "ta da", "tada reveal", "jazz hands".*
- **`confetti.gif`** — confetti and streamers bursting, party-popper going off.
  *Feeling: milestone / "look how far you've come." Search: "confetti", "celebration".*

## Playful (light humor, self-aware, cheeky, never mean)

- **`mock_angry.gif`** — a cute, obviously-not-serious angry pout or tiny fist shake (a kitten
  or cartoon works best). *Feeling: teasing "okay, we need to talk" framed with love.
  Search: "cute angry", "mock angry", "grr playful".*
- **`wink.gif`** — an exaggerated, knowing wink to camera.
  *Feeling: a cheeky inside-joke aside. Search: "wink", "cheeky wink".*
- **`chefs_kiss.gif`** — fingers-to-lips chef's kiss, then flung open.
  *Feeling: "that, right there, is perfect." Search: "chefs kiss", "perfect".*
- **`facepalm.gif`** — a hand slapping the forehead in gentle "oh no" self-recognition.
  *Feeling: relatable "that IS me" on a watch-out. Search: "facepalm", "oh no".*
- **`mind_blown.gif`** — head/hands exploding, mind-blown gesture near the temples.
  *Feeling: a surprising reframe. Search: "mind blown", "mind explosion".*

## Growth (encouragement and gentle watch-outs, always kind)

- **`you_got_this.gif`** — a supportive thumbs-up, fist-pump, or "you can do it" cheer.
  *Feeling: kicking off the action plan. Search: "you got this", "you can do it".*
- **`deep_breath.gif`** — a calming, slow inhale/exhale, shoulders dropping (yoga/breathe).
  *Feeling: pause and reset before a heavier note. Search: "deep breath", "breathe", "calm down".*
- **`note_to_self.gif`** — someone quickly scribbling a note / tapping their temple to remember.
  *Feeling: "write this one down." Search: "taking notes", "note to self", "writing fast".*
- **`chin_up.gif`** — a reassuring pat on the back or gentle "chin up" lift.
  *Feeling: one habit does not define you. Search: "chin up", "it's okay", "pat on the back".*
- **`playful_side_eye.gif`** — a slow, knowing side-eye glance to camera, eyebrow slightly up.
  *Feeling: a warm teasing callout of a recurring habit. Search: "side eye", "suspicious look".*
