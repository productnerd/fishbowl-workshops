#!/usr/bin/env bash
# Make a transparent character cut-out for the personality cards.
#
#   ./cutout.sh <source-image> <TYPE>        e.g.  ./cutout.sh ~/Downloads/lisbeth.png INTJ
#
# Removes the background by flood-filling transparency inward from the four corners, then
# trims. FUZZ controls how much gets removed — LOWER is gentler (keeps more of the
# character, may leave a faint halo), HIGHER eats more (can nibble the edges). Default is
# deliberately on the gentle side; bump it only if a solid background survives:
#
#   FUZZ=8  ./cutout.sh source.png ESFP     # gentler
#   FUZZ=20 ./cutout.sh source.png ESFP     # more aggressive
#
# Works best on images that already have a plain / single-colour background. Busy movie
# stills won't cut cleanly this way — for those, start from a plain-background image.
set -euo pipefail
SRC="${1:?source image required}"
TYPE="${2:?4-letter TYPE required (e.g. INTJ)}"
FUZZ="${FUZZ:-11}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/characters/${TYPE}.png"

magick "$SRC" -alpha set -bordercolor none -border 1 \
  -fuzz "${FUZZ}%" -fill none \
  -draw 'alpha 0,0 floodfill' \
  -draw 'alpha %[fx:w-1],0 floodfill' \
  -draw 'alpha 0,%[fx:h-1] floodfill' \
  -draw 'alpha %[fx:w-1],%[fx:h-1] floodfill' \
  -shave 1x1 -trim +repage "$OUT"

echo "wrote ${OUT}  (fuzz ${FUZZ}%)"
