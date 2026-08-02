# Charts sandbox

The private sandbox contains two complementary development surfaces:

- `pnpm dev:sandbox` opens the integrated data dashboard at `/`;
- `pnpm dev:interaction-geometry` opens the interaction geometry lab at
  `/?lab=interaction-geometry`.

## Interaction geometry lab

The lab compares legacy anchor-only focus with the current two-stage resolver:
scene-primitive containment in paint order first, then the primitive's `x`,
`y`, `xy`, or `geometry` fallback. Facet and nested transform/clip cases verify
post-layout traversal. Dedicated contracts contrast one-point default facet
focus with explicit synchronized x and y cursors and exercise destination-scene
picking while a bar animates in matched SVG and Canvas cards. Every chart names
its renderer and keeps its source disclosure directly beneath the rendered
result. The twenty-eight before/after families split evenly between SVG and
Canvas. Built-in marks contribute their natural focus affinity automatically;
four mixed-mark compositions combine vertical bars/lines/dots, horizontal
bars/dots, areas/lines/dots, and cells/bubbles without a chart-wide affinity
setting. The first three mixed compositions also add a third native grouped
tooltip card: `group-x` for vertical bars/lines/points and areas, and `group-y`
for horizontal bars/points. Those presets intentionally own nearest-axis
selection as well as grouping; they are shown separately from the default
containment-first card instead of implying that grouping is a tooltip-only
switch. The remaining cases include grouped bars, dense scatter, hexbin cells,
nested bubbles, a Sankey composition, plus faceted plain, grouped, stacked, and
bubble geometry. The final stress cases exercise 4,098 rectangles and 2,050
polygons containing 13,318 vertices.

Add a focused case in `src/InteractionGeometryLab.tsx` when a distinct mark
family or interaction shape exercises behavior not already represented. Keep
resolver invariants in Charts core tests; the lab test only locks each case's
before-and-after outcome and the contextual source contract.
