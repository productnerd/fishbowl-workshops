// A bright pool-blue caustic backdrop behind every page. Two static noise textures
// (defined in index.css) scaled to cover and screen-blended. No animation, no tiling
// (so no seams and nothing drifts). Sits at -z-10, so content always paints on top.
export default function WaterBackground() {
  return (
    <div aria-hidden className="fishbowl-water pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="fishbowl-water-a" />
      <div className="fishbowl-water-b" />
    </div>
  )
}
