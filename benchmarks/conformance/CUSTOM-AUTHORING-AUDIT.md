# Custom authoring audit

Date: 2026-08-04

Scope: the reviewed 2026-08-04 before-state of all 109 TanStack implementations
under `cases/`, including transitive case-owned support files.

This snapshot preserves the work observed when the audit was performed. Its
rows and totals do not change as cases migrate; current implementation sources,
capability status, and verification evidence live in
[`definition-coverage-roadmap.json`](./definition-coverage-roadmap.json).

This audit counts user-facing work outside the declarative mark, scale, guide,
and behavior configuration when it:

- creates scene nodes or paths;
- computes semantic coordinates, intervals, cells, topology, angles, or
  responsive pixel layouts consumed by generic marks; or
- renders and positions a visible overlay or interaction controller from the
  resolved scene.

It excludes fixture selection, revision slicing, sorting, formatting, normal
use of public Charts transforms and layouts, and conformance-only driver code.

## Coverage

Each case has one primary classification.

| Classification          |   Cases | Boundary                                                     |
| ----------------------- | ------: | ------------------------------------------------------------ |
| Strict custom authoring |      47 | Manual geometry, a custom scene mark, or a visible overlay   |
| Preparation review      |      13 | Author-owned semantic rows without a custom renderer         |
| Shell-only              |       7 | Visible controls or lifecycle code; chart geometry is native |
| Definition-native       |      42 | Built-in marks, transforms, interactions, or geo rendering   |
| **Total**               | **109** |                                                              |

The existing `support: native | composed` field is not an authoring-complexity
classification. Case 116 is `native` despite defining a raw custom mark, while
several `composed` cases use only public transforms or mark layouts.

The [definition coverage audit](./DEFINITION-COVERAGE-AUDIT.md) reviews the 67
non-baseline cases and decides whether the work can move into the current
definition, needs a reusable first-party primitive, belongs in an optional
adapter, or should remain application/custom code.

## Strict custom authoring

### Custom scene marks

| Case                                                                   | Work outside the definition object                                                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [38 — Contour topography](./cases/38-contour-topography/tanstack.ts)   | `contourMark` runs `d3-contour`, maps grid coordinates through a `geoTransform`, and emits area `SceneNode` paths.           |
| [39 — Density contours](./cases/39-density-contours/tanstack.ts)       | `densityMark` runs a responsive density estimator, emits paths, inverts centroids, and creates synthetic interaction points. |
| [65 — Voronoi tooltip](./cases/65-voronoi-nearest-tooltip/tanstack.ts) | `voronoiCells` builds Delaunay/Voronoi cells from resolved scales and emits one scene path per observation.                  |
| [116 — Geometry morph](./cases/116-geometry-morph/tanstack.ts)         | `morphMark` samples rectangles, circles, and sectors into compatible path topology and computes centroids for animation.     |

### Manual statistical and composite geometry

| Case                                                                           | Work outside the definition object                                                                                                                                   |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [15 — Boxplot](./cases/15-boxplot/tanstack.ts)                                 | Groups observations and computes quartiles, fences, whisker endpoints, and outliers.                                                                                 |
| [21 — Streamgraph](./cases/21-streamgraph/tanstack.ts)                         | Converts tidy rows to wide rows, runs the D3 wiggle stack, and rebases every interval.                                                                               |
| [26 — Diverging Likert](./cases/26-diverging-likert/transform.ts)              | Counts responses and advances a signed cursor to materialize every `x1`/`x2` segment.                                                                                |
| [29 — Waterfall](./cases/29-waterfall/tanstack.ts)                             | Computes running `start`/`end` coordinates and appends an explicit total bar.                                                                                        |
| [33 — Difference chart](./cases/33-difference-chart/tanstack.ts)               | Splits positive and negative runs and interpolates exact line-crossing coordinates.                                                                                  |
| [51 — Faceted distributions](./cases/51-faceted-distributions/tanstack.ts)     | Builds per-species bins and normalizes each bin to a facet-local proportion.                                                                                         |
| [57 — Marginal histograms](./cases/57-scatter-marginal-histograms/tanstack.ts) | Runs two D3 bins, normalizes counts, and maps rectangles into hard-coded top and right regions of the shared domains. Tick formatters then hide the reserved ranges. |
| [62 — Ridgeline](./cases/62-ridgeline-density/transform.ts)                    | Converts per-season bins into normalized density coordinates offset from authored baselines.                                                                         |
| [63 — Violin](./cases/63-violin-distributions/transform.ts)                    | Converts bins into mirrored widths around authored centers and separately materializes median geometry.                                                              |
| [64 — Marimekko](./cases/64-marimekko-mosaic/layout.ts)                        | Performs two-dimensional cumulative layout for variable-width cells and labels.                                                                                      |

### Spatial and topology layout

| Case                                                                     | Work outside the definition object                                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [36 — Hierarchy tree](./cases/36-hierarchy-tree/tanstack.ts)             | Runs D3 stratify/tree and converts the result into node, link, and label coordinates.                             |
| [37 — Delaunay network](./cases/37-delaunay-network/tanstack.ts)         | Extracts unique triangulation and hull edges into explicit link endpoints.                                        |
| [40 — Force network](./cases/40-force-directed-network/layout.ts)        | Runs and settles a D3 force simulation, resolves mutated endpoints, and derives padded domains.                   |
| [41 — Waffle](./cases/41-waffle-unit-chart/tanstack.ts)                  | Chooses a responsive column count and expands category proportions into individually positioned cells.            |
| [43 — Hexbin](./cases/43-hexbin-density/tanstack.ts)                     | Creates temporary pixel scales, runs D3 hexbin in outer-scene space, and inverts bin centers back to data values. |
| [52 — Beeswarm](./cases/52-beeswarm-dodge/tanstack.ts)                   | Runs a responsive pixel-space collision simulation and converts settled positions back into chart values.         |
| [74 — Treemap](./cases/74-recharts-treemap/tanstack.ts)                  | Runs D3 hierarchy/treemap and materializes rectangles plus case-owned label-fit decisions.                        |
| [110 — Projection gallery](./cases/110-projection-gallery/projection.ts) | Divides resolved plot bounds into a manual 2×2 grid and fits one projection per pane.                             |
| [111 — Basic Sankey](./cases/111-basic-sankey/tanstack.ts)               | Runs a responsive D3 Sankey layout and materializes nodes, proportional links, and label coordinates.             |
| [111 — Sankey flow](./cases/111-sankey-flow/tanstack.ts)                 | Adds responsive Sankey layout, direct labels, and label backdrops before passing rows to native marks.            |

### Polar and radial layout outside native marks

| Case                                                       | Work outside the definition object                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [76 — Pie](./cases/76-pie/tanstack.ts)                     | Runs a D3 pie layout before passing angular intervals to `radialArc`.                     |
| [77 — Donut](./cases/77-donut/tanstack.ts)                 | Runs a D3 pie layout before passing annular intervals to `radialArc`.                     |
| [78 — Gauge](./cases/78-gauge/tanstack.ts)                 | Aggregates gauge segments and runs a partial-angle D3 pie layout.                         |
| [93 — Labeled pie](./cases/93-labeled-pie/tanstack.ts)     | Runs a D3 pie layout and computes outside-label radius, anchors, and leader geometry.     |
| [94 — Center donut](./cases/94-center-donut/tanstack.ts)   | Runs a D3 pie layout and derives the center summary shown with the arcs.                  |
| [95 — Rounded donut](./cases/95-rounded-donut/tanstack.ts) | Runs a D3 pie layout and configures authored arc padding/corners.                         |
| [96 — Nested donut](./cases/96-nested-donut/transform.ts)  | Builds hierarchical ring rows and runs independent layouts for two concentric arc layers. |
| [97 — Rose](./cases/97-rose/tanstack.ts)                   | Runs an equal-angle pie layout and supplies a data-driven D3 arc generator.               |
| [98 — Needle gauge](./cases/98-needle-gauge/tanstack.ts)   | Materializes threshold bands, ticks, labels, and needle angle around native radial marks. |
| [100 — Radial bars](./cases/100-radial-bars/tanstack.ts)   | Materializes per-row radii/angles and supplies a data-driven D3 arc generator.            |
| [101 — Sunburst](./cases/101-sunburst/tanstack.ts)         | Runs D3 hierarchy/partition and supplies a depth-dependent D3 arc generator.              |

### Visible application overlays and controllers

| Case                                                                          | Work outside the definition object                                                                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [80 — Axis pointer](./cases/80-echarts-axis-pointer/view.tsx)                 | Renders a separate crosshair SVG and positions a grouped tooltip from resolved scene coordinates.                                                                              |
| [83 — Focus/context](./cases/83-focus-context-window/view.tsx)                | Coordinates two charts with an application-owned D3 brush and semantic range state.                                                                                            |
| [84 — Pinned nested tooltip](./cases/84-pinned-nested-chart-tooltip/view.tsx) | Positions a pinned external overlay that mounts a second chart.                                                                                                                |
| [85 — Resource lanes](./cases/85-scrollable-resource-lanes/shell.ts)          | Owns the scrolling viewport, fixed lane rail and legend, persistent task summary, schedule alternative, and focus auto-scroll. Scene/client conversion is conformance tooling. |
| [87 — Synchronized cursors](./cases/87-echarts-synchronized-cursors/view.tsx) | Coordinates multiple charts, external crosshairs, and a shared value summary.                                                                                                  |
| [88 — Free cursor](./cases/88-echarts-free-cursor/view.tsx)                   | Converts pointer positions into data values and renders crosshair, badges, and semantic sliders.                                                                               |
| [89 — Brush selection](./cases/89-brush-range-selection/)                     | Owns a D3 brush controller, painting, scale inversion, semantic handles, and range summary.                                                                                    |
| [90 — Zoomable window](./cases/90-zoomable-time-window/tanstack.ts)           | Owns D3 zoom, wheel/pan policy, transform-to-domain conversion, overlay, and controls.                                                                                         |
| [91 — Playback scrubber](./cases/91-timeline-playback-scrubber/tanstack.ts)   | Owns the playback overlay, range control, pointer capture, and scene-relative positioning.                                                                                     |
| [92 — Editable range](./cases/92-editable-event-range/tanstack.ts)            | Owns range/date inputs, drag-handle positioning, validation, and commit/cancel state.                                                                                          |
| [117 — Focus cursor motion](./cases/117-focus-cursor-motion/tanstack.ts)      | Owns crosshair SVG primitives, labels, a spring frame loop, repaint, and teardown.                                                                                             |
| [118 — Token calendar](./cases/118-token-usage-calendar/shell.ts)             | Owns responsive shell sizing and adjusts the generated first-month tick after measuring rendered cells.                                                                        |

### Scale-handle migration note

The Case 91 and 92 rows preserve the audited before-state. Both current
implementations use exact-subpath `handleX` in the definition. Charts owns the
track, optional rule, handle, final-scale candidate mapping, snapping, pointer
and touch capture, cancellation, keyboard slider semantics, and host teardown.
Case 91 retains playback timing, transport controls, status, and announcements.
Case 92 retains its date input, validation, event constraint, commit state,
status, and exact-value alternative.

The reusable seam is the one-dimensional candidate axis already used by
`brushX`, not the old overlay or a playback-specific scale. A single handle
needs no brush-range policy, continuous scale inverse, or D3 controller.

## Preparation review

These 13 cases derive meaningful rows outside the definition but do not
implement a separate coordinate engine or renderer.

| Case                                                                           | Preparation                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [02 — End-labeled lines](./cases/02-multi-line-end-labels/tanstack.ts)         | Selects the last row of every series for labels.                       |
| [14 — Error bars](./cases/14-error-bars/transform.ts)                          | Computes per-species means and deviation endpoints.                    |
| [22 — Bollinger band](./cases/22-bollinger-band/tanstack.ts)                   | Converts window mean/deviation output into lower and upper intervals.  |
| [27 — Parallel coordinates](./cases/27-parallel-coordinates/transform.ts)      | Normalizes unlike metrics and pivots wide observations to metric rows. |
| [30 — Slopegraph](./cases/30-slopegraph/transform.ts)                          | Pivots two period fields into line points and endpoint labels.         |
| [31 — Regression](./cases/31-linear-regression/tanstack.ts)                    | Computes covariance, slope, intercept, and two fitted endpoints.       |
| [55 — Indexed lines](./cases/55-indexed-multi-line/tanstack.ts)                | Rebases each series to its first value and selects label endpoints.    |
| [56 — Connected scatter](./cases/56-connected-scatter/transform.ts)            | Selects explicit segments for direction arrows.                        |
| [58 — Extrema](./cases/58-select-extrema/tanstack.ts)                          | Derives minimum and maximum annotation rows and offsets.               |
| [61 — Quantile ribbon](./cases/61-quantile-ribbon/tanstack.ts)                 | Computes grouped lower, median, and upper quantiles.                   |
| [71 — Population pyramid](./cases/71-recharts-population-pyramid/transform.ts) | Aggregates observations and signs one side of the comparison.          |
| [75 — Radar](./cases/75-radar/transform.ts)                                    | Normalizes unlike metrics into a shared radial domain.                 |
| [99 — Comparative radar](./cases/99-comparative-radar/transform.ts)            | Normalizes and pivots multiple profiles for polar comparison.          |

## Shell-only cases

These examples have substantial visible controls or lifecycle code, but their
chart geometry and motion policy remain declarative.

- [81 — Interactive legend](./cases/81-recharts-interactive-legend/tanstack.ts)
- [82 — Chart/table selection](./cases/82-chart-table-selection/view.tsx)
- [86 — Streaming window](./cases/86-streaming-window-preservation/view.tsx) —
  the normal definition owns the bounded line, points, scales, focus, and
  tooltip; only feed and viewport policy remain in the shell.
- [112 — Entrance motion](./cases/112-motion-entrance/tanstack.ts)
- [113 — Spring updates](./cases/113-motion-updates/tanstack.ts)
- [114 — Spring line](./cases/114-spring-line-motion/tanstack.ts)
- [115 — Definition motion](./cases/115-definition-motion/tanstack.ts)

## Definition-native cases

The remaining 42 cases were reviewed and excluded from the custom-work count:

- Standard mark composition: 01, 03, 04, 13, 16, 17, 20, 25, 28, 32,
  40-geojson-map, 42, 44, 53, 70, 72, 73, bar-grouped,
  bar-horizontal-ranking, bar-stacked, bar-vertical-sorted, facets-anscombe,
  heatmap-labeled, and scatter-bubble.
- Public Charts transforms or layouts: 18, 19, 24, 50, 54, 59, 60, and
  histogram.
- Native focus and tooltip configuration: 34 and 35. Their coordinate-heavy
  code is conformance-driver plumbing, not visualization authoring.
- Native `geoShape` rendering: 102–109. These cases still own source-data,
  atlas, join, or channel preparation, but Charts owns projection and path
  rendering. Case 110 is counted above because it manually partitions one
  plot into four independently fitted projection panes.

## Catalog contract

Do not infer this classification from source length, D3 imports, support-file
names, or `support`. Those are useful candidate signals but produce both false
positives and false negatives.

If this audit becomes public catalog metadata, use reviewed fields that keep
the ownership boundary explicit:

```ts
interface CatalogAuthoring {
  coverage: 'declarative' | 'prepared' | 'custom-render' | 'app-composed'
  disposition:
    | 'definition-now'
    | 'first-party-primitive'
    | 'optional-primitive'
    | 'application-boundary'
    | 'inline-custom-mark'
  work: readonly {
    kind:
      | 'data-transform'
      | 'data-space-layout'
      | 'responsive-pixel-layout'
      | 'custom-mark'
      | 'application-overlay'
      | 'interaction-controller'
      | 'low-level-renderer'
    stage:
      'before-definition' | 'definition-builder' | 'mark-render' | 'post-render'
    owner: 'charts' | 'd3' | 'case' | 'application'
    coordinateSpace: 'none' | 'data' | 'outer-scene' | 'resolved-plot' | 'dom'
    sources: readonly string[]
    dependencies?: readonly string[]
    summary: string
  }[]
}
```

The conformance report already records transitive authored-source paths and
totals. If these reviewed fields become public catalog metadata, keep them
beside those generated signals rather than replacing them.
