# Personality card art

The personality result card shows an optional "character select" hero: a movie
background with the Disney character cut-out standing in front. It only appears
once the art files exist, otherwise the card stays text-only.

Drop files here, named by the **4-letter type code**:

- `public/characters/<TYPE>.png` — the character, **transparent background** (PNG with alpha). Stands in the foreground; it's bottom-anchored and slightly overflows, so leave a little headroom and let the feet sit at the bottom edge.
- `public/backgrounds/<TYPE>.jpg` — the movie scene behind the character (landscape, roughly 4:3 or 16:9; it's cropped to fill).

Both are optional and independent. You can ship just backgrounds, just characters, or both.

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
