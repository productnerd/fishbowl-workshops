# Reaction GIFs

The reactions are served as **tiny looping muted mp4 videos** in this folder
(`apps/fishbowl/public/gifs/<name>_N.mp4`), roughly 100x smaller than real GIFs while looking
identical. Source clips are picked as GIFs and converted to mp4 (see below).

## Naming: two variants per emotion

A single report **never shows the same clip twice**. So each emotion has up to two visual
variants, suffixed `_1` / `_2`:

- `<name>_1.mp4` — used the first time an emotion comes up
- `<name>_2.mp4` — used only if the same emotion comes up a second time

Example: `excitement_1.mp4` and `excitement_2.mp4`. The AI references the emotion by its base
name (`excitement`); the app plays `_1` the first time and `_2` the second. A third use of the
same emotion is dropped. A missing file is silently skipped (safe).

## Adding or replacing one

Pick a GIF, then convert it to a small looping mp4:

```
ffmpeg -i in.gif -vf "fps=20,scale=w=320:h=320:force_original_aspect_ratio=decrease:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -crf 30 -pix_fmt yuv420p -an -movflags +faststart <name>_1.mp4
```

Then drop `<name>_1.mp4` (and optionally `_2`) in this folder.

How it works: the AI may append a `{{gif:NAME}}` tag to a text-heavy slide, picking only from
the base names below. The app shows **at most one per slide** and **10 per report**, and
**never the same clip twice**. The prompt says firmly: **if no reaction truly fits, add none.**
Anything missing is silently skipped.

Canonical list also lives in `packages/feedback-core/src/gifs.ts`.

---

## Warm (affection, gratitude, celebrating the person)

- **`high_five`** — a triumphant high-five — "we did that together". *Search: "high five", "nailed it".*
- **`blow_kiss`** — blowing a kiss to camera. *Search: "blowing a kiss", "mwah".*
- **`standing_ovation`** — rising to their feet, applauding hard. *Search: "standing ovation".*
- **`warm_hug`** — a big cozy hug (Pooh / Baymax warmth). *Search: "warm hug", "big hug".*
- **`heart_hands`** — hands forming a heart / floating hearts. *Search: "heart hands", "finger heart".*
- **`happy_tears`** — tearing up with a smile, touched. *Search: "happy tears", "so touched".*

## Hype (energy, reveals, arrival)

- **`excitement`** — bouncing, arms up, giddy excitement. *Search: "so excited", "excited jump".*
- **`drumroll`** — hands drumming fast, building suspense. *Search: "drumroll", "suspense".*
- **`ta_da`** — a magician-style reveal, jazz hands / sparkles. *Search: "ta da", "tada reveal".*
- **`confetti`** — confetti bursting / party popper. *Search: "confetti", "celebration".*

## Playful (cheeky, witty, self-aware — never mean)

- **`mock_angry`** — a cute, obviously-not-serious angry pout. *Search: "cute angry", "grr playful".*
- **`wink`** — an exaggerated knowing wink. *Search: "wink", "cheeky wink".*
- **`chefs_kiss`** — fingers-to-lips chef's kiss. *Search: "chefs kiss", "perfect".*
- **`facepalm`** — hand-to-forehead "oh no". *Search: "facepalm", "oh no".*
- **`mind_blown`** — head/hands exploding, mind-blown. *Search: "mind blown".*
- **`mic_drop`** — dropping the mic and walking off. *Search: "mic drop".*
- **`slow_clap`** — a slow, building, tongue-in-cheek clap (Leo). *Search: "slow clap", "sarcastic clap".*
- **`eye_roll`** — a big, fond, exaggerated eye-roll. *Search: "eye roll", "playful eye roll".*
- **`smirk`** — a slow, knowing, self-satisfied smirk. *Search: "smirk", "smug smile".*
- **`finger_guns`** — double finger-guns at camera. *Search: "finger guns".*
- **`sunglasses`** — shades sliding on, deal-with-it. *Search: "deal with it", "sunglasses drop".*
- **`popcorn`** — eating popcorn, watching drama (MJ popcorn). *Search: "eating popcorn".*
- **`sip_tea`** — a pointed sip of tea, brows up (Kermit). *Search: "sipping tea", "none of my business".*
- **`plot_twist`** — a dramatic gasp / "plot twist!". *Search: "plot twist", "dramatic gasp".*
- **`shrug`** — a big "what can you do" shrug (the shruggie). *Search: "shrug", "i dont know shrug".*

## Growth (encouragement + gentle watch-outs — always kind)

- **`you_got_this`** — supportive thumbs-up / fist-pump cheer. *Search: "you got this".*
- **`deep_breath`** — a calming slow inhale/exhale. *Search: "deep breath", "breathe".*
- **`note_to_self`** — quickly scribbling a note / tapping temple. *Search: "taking notes", "note to self".*
- **`chin_up`** — a reassuring pat on the back / "chin up". *Search: "chin up", "pat on the back".*
- **`playful_side_eye`** — a slow, knowing side-eye glance. *Search: "side eye", "suspicious look".*
