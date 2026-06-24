// A faint, living water-refraction layer rendered behind every page.
// Inline SVG (not a CSS background) so the turbulence can actually animate:
// feTurbulence's baseFrequency is morphed via SMIL, which a background-image
// data-URI freezes. preserveAspectRatio="slice" + an overscaled drift keep it
// full-bleed, so it never seams at the right edge. Styling lives in index.css
// (.fishbowl-water); honors prefers-reduced-motion by dropping the animation.
export default function WaterBackground() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <div aria-hidden className="fishbowl-water pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="fb-water" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.013"
              numOctaves={2}
              seed={7}
              stitchTiles="stitch"
              result="t"
            >
              {!reduced && (
                <animate
                  attributeName="baseFrequency"
                  dur="26s"
                  values="0.008 0.013;0.011 0.017;0.008 0.013"
                  keyTimes="0;0.5;1"
                  calcMode="spline"
                  keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>
            {/* Flatten the RGBA noise to a single Greek-blue tint; alpha carries the ripple. */}
            <feColorMatrix
              in="t"
              type="matrix"
              values="0 0 0 0 0.05  0 0 0 0 0.31  0 0 0 0 0.55  0 0 0 0.7 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#fb-water)" />
      </svg>
    </div>
  )
}
