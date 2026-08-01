# Charts sandbox

The private sandbox contains two complementary development surfaces:

- `pnpm dev:sandbox` opens the integrated data dashboard at `/`;
- `pnpm dev:interaction-geometry` opens the interaction geometry lab at
  `/?lab=interaction-geometry`.

## Interaction geometry lab

The lab compares legacy anchor-only focus with the current two-stage resolver:
painted-shape containment first, then the mark's declared `x`, `y`, `xy`, or
`geometry` fallback. Every chart keeps its source disclosure directly beneath
the rendered result. Its final stress cases exercise 4,098 rectangles and
2,050 polygons containing 13,318 vertices.

Add a focused case in `src/InteractionGeometryLab.tsx` when a distinct mark
family or interaction shape exercises behavior not already represented. Keep
resolver invariants in Charts core tests; the lab test only locks each case's
before-and-after outcome and the contextual source contract.
