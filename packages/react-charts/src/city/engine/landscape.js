import { ROAD_EVERY, random } from './model.js'

// Coordinate-seeded parks stay stable across renders, filters and pagination.
// Clearings and small clusters break up the grid without occupying built lots.
export function greenLots(layout) {
  const occupied = new Set(layout.companies.map((c) => `${c.col},${c.row}`))
  const lots = [],
    bounds = layout.roadBounds
  for (let row = bounds.z1; row <= bounds.z2; row++)
    for (let col = bounds.x1; col <= bounds.x2; col++) {
      if (
        col % ROAD_EVERY === 0 ||
        row % ROAD_EVERY === 0 ||
        occupied.has(`${col},${row}`)
      )
        continue
      // Coordinate seeds keep the same park looking the same after rebuilding.
      const rng = random(Math.imul(col + 59, 7349) ^ Math.imul(row + 41, 9157))
      const density = rng()
      const count =
        density < 0.18 ? 0 : density < 0.63 ? 1 : density < 0.92 ? 2 : 3
      const benches = []
      if (rng() < 0.09) {
        const rotation = (Math.floor(rng() * 4) * Math.PI) / 2
        benches.push({
          dx: Math.sin(rotation) * 0.94,
          dz: Math.cos(rotation) * 0.94,
          rotation,
        })
      }
      const trees = []
      // Bounded rejection sampling leaves space around canopies and benches.
      for (let attempt = 0; trees.length < count && attempt < 32; attempt++) {
        const tree = {
          dx: (rng() - 0.5) * 1.56,
          dz: (rng() - 0.5) * 1.56,
          scale: 0.32 + rng() * 0.18,
          color: rng() > 0.5 ? '#789b59' : '#94af68',
        }
        if (
          trees.some(
            (other) =>
              Math.hypot(tree.dx - other.dx, tree.dz - other.dz) <
              tree.scale + other.scale + 0.08,
          ) ||
          benches.some(
            (bench) =>
              Math.hypot(tree.dx - bench.dx, tree.dz - bench.dz) <
              tree.scale + 0.55,
          )
        )
          continue
        trees.push(tree)
      }
      lots.push({
        col,
        row,
        trees,
        benches,
      })
    }
  return lots
}
