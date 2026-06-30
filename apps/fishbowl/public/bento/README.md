# Bento card backgrounds

Drop a background image here for any landing-page bento card, named by its `key`
(see `FRAMEWORKS` in `apps/fishbowl/src/pages/Landing.tsx`). The app probe-loads
each file; if it's missing, the card falls back to a faded emoji watermark.

- Format: `.png` (transparent ok) or `.jpg`. Use `<key>.png`.
- They render as a faded, tone-washed cover behind the card content, so busy images
  still keep the title readable.

Keys:

| key           | activity / framework                |
| ------------- | ----------------------------------- |
| personality   | Your personality type (Big Five)    |
| virtues       | The ten virtues (Aristotle)         |
| hats          | Thinking hats (de Bono)             |
| via           | Signature strengths (VIA)           |
| belbin        | Team role (Belbin)                  |
| johari        | Johari window                       |
| nohari        | Watch-outs (Nohari)                 |
| energy        | Energy map (energizers & drains)    |
| candor        | Feedback style (Radical Candor)     |
| sdt           | What you fuel (Self-Determination)  |
| jungian       | Light & shadow (Jungian archetype)  |
