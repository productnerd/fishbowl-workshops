# Bento card activity previews

Drop a **cropped screenshot of the real activity** here, named by its `key` (see
`FRAMEWORKS` in `apps/fishbowl/src/pages/Landing.tsx`). The app probe-loads each file
and shows it clearly under the card's title; if it's missing, the card falls back to a
small hand-built mock of the activity.

- Format: `<key>.png`. Crop to just the activity UI (e.g. open the self-assessment,
  screenshot the step, crop to the slider / chips / scale).
- It renders full-width inside the card with a border, so keep the crop tidy.

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
