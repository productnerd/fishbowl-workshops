// A bright pool-blue caustic layer behind every page. Two seamless, tileable
// noise textures (defined in index.css) drift across each other on the GPU via
// CSS transform — constant linear translate by exactly one tile, so the loop is
// seamless and the motion is buttery (no per-frame CPU turbulence). Their
// interference reads as fluid, flowing water light. Honors prefers-reduced-motion
// (the layers simply hold still). Sits at -z-10, so content always paints on top.
export default function WaterBackground() {
  return (
    <div aria-hidden className="fishbowl-water pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="fishbowl-water-a" />
      <div className="fishbowl-water-b" />
    </div>
  )
}
