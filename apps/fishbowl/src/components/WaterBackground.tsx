// A bright pool-blue backdrop behind every page. A single baked, blurred pool image
// (public/pool.jpg) scaled to cover the viewport — a flat raster with NO SVG turbulence
// and NO blend modes, so every device and browser renders the exact same pool. The old
// screen/multiply-blended noise version could collapse to a muddy dark teal under phone
// night-modes; a plain image does not. Sits at -z-10 so content always paints on top.
export default function WaterBackground() {
  return (
    <div
      aria-hidden
      className="fishbowl-water pointer-events-none fixed inset-0 -z-10"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}pool.jpg)` }}
    />
  )
}
