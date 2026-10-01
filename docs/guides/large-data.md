---
title: Large Data
description: Choose bounded visual representations, measure preparation separately, preserve analytical invariants, and avoid rendering more detail than pixels can communicate.
---

Large-data charting starts with representation, not renderer throughput.

Ask:

1. What question must the chart answer?
2. Must a reader inspect every observation?
3. How many independently useful marks fit in the available pixels?
4. Which totals, extrema, order, or identities must never be lost?
5. How frequently does the source update?

Raw output is correct only while independently rendering every observation is
both meaningful and affordable.

## Count every stage

Track four quantities:

- **source**: rows received by the application;
- **represented**: source rows accounted for by the encoding;
- **prepared**: rows or vertices passed to marks;
- **rendered**: scene nodes and path vertices, plus the selected renderer's DOM
  or draw work.

Do not describe a million-row chart as a million rendered points when the
visible result is a few thousand aggregate cells. The bounded output is a
feature, but its accounting must be honest.

## Bounded representations

| Problem                          | Representation                           | Invariant                                                  |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Dense point cloud                | Fixed density grid                       | Cell counts sum to source count                            |
| High-rate ordered signal         | Pixel-width first/min/max/last envelope  | Every row belongs to one bucket and global extrema survive |
| Numeric distribution             | Fixed-boundary histogram                 | Bin counts sum to source count                             |
| High-cardinality categories      | Leading categories plus Other            | Leading and remainder totals sum to source count           |
| Large time range with a viewport | Domain-clipped or width-bounded envelope | Visible extrema and boundary continuity survive            |

Choose bucket count from the task and available resolution. A test fixture's
grid or threshold count is not a universal default.

<!-- ::chart-example id=73-many-point-scatter height=480 -->

## When raw output is still useful

- One line path can retain many ordered observations without creating one DOM
  node per row.
- A scatterplot creates an independently addressable mark for every
  observation.
- Stable keys make rolling updates reuse surviving nodes.

Identity reuse reduces allocation and replacement. It cannot make ten thousand
independent SVG elements a sensible default when those elements compete for
the same pixels.

Switch representations before the raw update cost exceeds the product's frame
budget or the output stops being readable.

## When Canvas helps

The optional Canvas renderer removes per-node SVG DOM and reconciliation cost.
It can be useful when a measured bottleneck is SVG element creation or paint.
It does not remove channel materialization, scale and guide work, scene
compilation, path construction, or `ChartPoint` creation.

A dot mark still produces one scene node and one interaction point per
observation. Default nearest-point focus still scans those points linearly.
Supply a measured `spatialIndex`, such as
[`gridSpatialIndex`](#indexed-nearest-point-lookup), when individual points
are still the correct pointer target, and use a focus strategy with a bounded
`navigation` order when every observation is not a useful keyboard stop.

Do not treat Canvas as permission to promise a million independently
interactive marks. Compare source, represented, prepared, and rendered counts;
measure compilation, paint, interaction, and memory; then aggregate, sample,
or bound the window when the representation exceeds the product budget.

## Transform ownership

Put width-independent aggregation in application code. Memoize it with the
framework's computed-state primitive when it should survive a presentation
change.

Surface-responsive transforms may use the responsive builder's full scene width.
Exact screen-space transforms need the final inner plot bounds and resolved
scales, so implement them in a custom mark's render phase or an
application-owned overlay. Keep either cost visible rather than hiding it in
an unrelated renderer.

```ts
function summarizeDensity(rows: Input['rows']) {
  return summarizeSource(rows)
}

function createDensityChart(rows: Input['rows']) {
  const summary = summarizeDensity(rows)

  return defineChart(({ width }) => {
    const thresholds = width < 480 ? 12 : width < 900 ? 24 : 40
    const bins = buildSemanticBins(summary, { thresholds })
    return densitySpec(bins)
  })
}
```

The full scene dimensions equal final plot dimensions only for a deliberately
guide-free, zero-margin chart. See
[Responsive Charts](./responsive-charts.md#responsive-construction) for the
geometry boundary.

Use the official D3 modules linked from
[Scales](../concepts/scales-and-d3.md) for grouping, binning, summary
statistics, spatial indexing, and shape preparation. TanStack Charts consumes
the resulting rows and intervals.

## Interaction over dense output

First decide whether the encoded mark or the original observation is the focus
target.

- Focus aggregate cells when the chart communicates density.
- Provide drill-down or a linked table when readers need original rows.
- Use a spatial index only when individual points remain the correct
  representation.
- Keep keyboard navigation bounded to useful targets instead of stepping
  through every source observation.
- Keep exact values outside hover-only UI.

An index can accelerate nearest-point lookup. It does not reduce scene size,
DOM or draw count, path construction, paint cost, or visual overplotting.

## Indexed nearest-point lookup

`gridSpatialIndex` from `@tanstack/charts/spatial/grid-index` is an opt-in
`spatialIndex` factory. Charts that do not import it do not ship it.

```ts
import { gridSpatialIndex } from '@tanstack/charts/spatial/grid-index'

const chart = defineChart(spec, { spatialIndex: gridSpatialIndex })
```

It returns exactly what a linear scan of point anchors returns, including the
earliest-point tie and the `maxDistance` limit. It finds the nearest point
center. It does not test bars, areas, or lines for containment, so keep the
default lookup for marks whose painted shape is the target.

The host rebuilds the index after each scene change. With the default
48-pixel radius, Node 24 on an Apple M5 Max measured these medians with
`pnpm performance:pointer`. Anchors are uniform in a 960 × 540 plot and
pointers sweep the plot.

|  Points | Linear scan / query | Grid build | Grid / query | D3 quadtree build | D3 quadtree / query |
| ------: | ------------------: | ---------: | -----------: | ----------------: | ------------------: |
|   1,000 |              1.8 µs |    0.03 ms |       0.1 µs |           0.14 ms |              0.5 µs |
|  10,000 |               17 µs |    0.11 ms |       0.3 µs |            1.0 ms |              1.2 µs |
| 100,000 |             0.19 ms |     1.1 ms |       2.4 µs |             16 ms |              5.2 µs |

Points on one vertical or horizontal line stay under 1 µs per query at
100,000 points. The worst case is a dense cluster with the pointer inside it:
the grid cannot split points that share a cell, so it scans the cluster. With
98% of points within 2 pixels, it measured about 2× slower than the linear
scan at 1,000 points, about 1.2× slower at 10,000, and about 2× faster at
100,000. D3 quadtree handles that case better. The benchmark prints every
layout, radius, and size.

The grid keeps about 24 bytes per point, against about 90 for the quadtree.
At a few hundred points the linear scan is already fast; measure before
adding an index there.

## Streaming windows

For a rolling source:

- store complete history outside the renderer when the product needs it;
- pass a bounded window or envelope;
- preserve keys for surviving observations;
- decide whether the viewport follows the newest data;
- preserve a locked viewport during offscreen updates;
- announce meaningful offscreen changes through application UI.

Measure same-key value changes, partial rolls, full replacement, resize, and a
sustained update stream. A fast mount does not prove a healthy update path.

## Performance measurement

Separate:

- deterministic source creation;
- analytical preparation;
- scene compilation;
- SVG serialization;
- DOM reconciliation;
- Canvas painting;
- pointer activation and sustained movement;
- memory after repeated updates and destroy.

Validation hashes and invariant checks belong outside timed preparation.
Report failed correctness cells as failures, not as fast results.

The repository's stress harness provides product-shaped and encoded workloads:

```bash
pnpm benchmark:stress:quick
pnpm benchmark:stress:standard
```

Use focused filters while developing, then run the canonical profile before a
release. See [Bundle Size and Performance](./bundle-size-and-performance.md)
for current budgets and import boundaries.

## Large-data checklist

- The representation answers the stated question.
- Every source row is accounted for or sampling is disclosed.
- Totals, extrema, ordering, and identity invariants are executable.
- Source, represented, prepared, and rendered counts are reported separately.
- Width-dependent preparation invalidates on resize.
- Output complexity is bounded in its native units.
- Rolling data preserves surviving keys.
- Dense focus targets match the represented meaning.
- Exact values have a table, drill-down, or textual alternative.
