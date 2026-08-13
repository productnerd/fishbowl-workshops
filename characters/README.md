# Personality card art

The personality result shows an optional "character select" look:
- the **movie scene** becomes the full-page background (behind the cards, replacing the water on this view), and
- the **character cut-out** stands at the top of the card, above the type name.

Each is optional and independent, and only appears once its file exists (otherwise
the card stays text-only on the normal water background).

Drop files here, named by the **4-letter type code**:

- `public/characters/<TYPE>.png` — the character, **transparent background** (PNG with alpha). Shown ~176px tall, centered above the type name.
- `public/backgrounds/<TYPE>.jpg` — the movie scene, used as the full-page background (cropped to fill the viewport; any landscape size works).

NOTE: the files currently in these folders are throwaway colored placeholders so
the wiring is visible. Replace them with the real art using the same file names.

## Type → character (fictional protagonists)

| TYPE | Character | Source | File names |
|---|---|---|---|
| ISTJ | Carl Fredricksen | Up | `ISTJ.png` / `ISTJ.jpg` |
| ISFJ | Samwise Gamgee | The Lord of the Rings | `ISFJ.png` / `ISFJ.jpg` |
| INFJ | Jean Valjean | Les Misérables | `INFJ.png` / `INFJ.jpg` |
| INTJ | Lisbeth Salander | The Girl with the Dragon Tattoo | `INTJ.png` / `INTJ.jpg` |
| ISTP | Max Rockatansky | Mad Max: Fury Road | `ISTP.png` / `ISTP.jpg` |
| ISFP | Ponyo | Ponyo | `ISFP.png` / `ISFP.jpg` |
| INFP | Amélie Poulain | Amélie | `INFP.png` / `INFP.jpg` |
| INTP | Ellie Sattler | Jurassic Park | `INTP.png` / `INTP.jpg` |
| ESTP | Long John Silver | Treasure Island | `ESTP.png` / `ESTP.jpg` |
| ESFP | Kuzco | The Emperor's New Groove | `ESFP.png` / `ESFP.jpg` |
| ENFP | Jack Sparrow | Pirates of the Caribbean | `ENFP.png` / `ENFP.jpg` |
| ENTP | Tyrion Lannister | A Song of Ice and Fire | `ENTP.png` / `ENTP.jpg` |
| ESTJ | Hank Schrader | Breaking Bad | `ESTJ.png` / `ESTJ.jpg` |
| ESFJ | Molly Weasley | Harry Potter | `ESFJ.png` / `ESFJ.jpg` |
| ENFJ | John Keating | Dead Poets Society | `ENFJ.png` / `ENFJ.jpg` |
| ENTJ | Miranda Priestly | The Devil Wears Prada | `ENTJ.png` / `ENTJ.jpg` |

(Backgrounds go in `public/backgrounds/` with the same `<TYPE>.jpg` names.)
