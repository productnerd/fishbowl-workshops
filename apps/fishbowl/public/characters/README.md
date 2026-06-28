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

## Type → Disney character

| TYPE | Character | File names |
|---|---|---|
| INTJ | Jafar | `INTJ.png` / `INTJ.jpg` |
| INTP | Milo Thatch | `INTP.png` / `INTP.jpg` |
| ENTJ | Scar | `ENTJ.png` / `ENTJ.jpg` |
| ENTP | Hades | `ENTP.png` / `ENTP.jpg` |
| INFJ | Elsa | `INFJ.png` / `INFJ.jpg` |
| INFP | Belle | `INFP.png` / `INFP.jpg` |
| ENFJ | Hans | `ENFJ.png` / `ENFJ.jpg` |
| ENFP | Rapunzel | `ENFP.png` / `ENFP.jpg` |
| ISTJ | Mufasa | `ISTJ.png` / `ISTJ.jpg` |
| ISFJ | Mrs. Potts | `ISFJ.png` / `ISFJ.jpg` |
| ESTJ | Captain Hook | `ESTJ.png` / `ESTJ.jpg` |
| ESFJ | Cinderella | `ESFJ.png` / `ESFJ.jpg` |
| ISTP | Tarzan | `ISTP.png` / `ISTP.jpg` |
| ISFP | Pocahontas | `ISFP.png` / `ISFP.jpg` |
| ESTP | Gaston | `ESTP.png` / `ESTP.jpg` |
| ESFP | Aladdin | `ESFP.png` / `ESFP.jpg` |

(Backgrounds go in `public/backgrounds/` with the same `<TYPE>.jpg` names.)
