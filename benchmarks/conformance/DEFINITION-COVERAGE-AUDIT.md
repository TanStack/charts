# Definition coverage audit

Date: 2026-08-05

Scope: all 110 catalog directories. The 67 cases previously classified as
strict custom authoring, preparation review, or shell-only are reviewed beside
the former 42-case definition-native control group from
[the custom authoring audit](./CUSTOM-AUTHORING-AUDIT.md). That audit remains
the historical before-state; Case 119 was added afterward and is classified by
the same ownership test. This document records the current disposition of every
case.

Delivery status, dependencies, acceptance criteria, and verification gates
live in the [definition coverage plan](./DEFINITION-COVERAGE-PLAN.md) and its
[machine-readable roadmap](./definition-coverage-roadmap.json).

## Decision

One hundred seven of the 110 cases present their visualization as a normal chart
definition. Fifty-eight use the definition API without a new visualization
primitive. Thirty-five use a reusable first-party primitive, including Case
70's final-scale bar thickness cap. Fourteen use a tree-shakeable first-party
adapter around a heavier layout or gesture algorithm.

Only two application shells and one custom mark justify case-owned custom
work:

- case 85 owns scrolling, a fixed rail, and focus-driven viewport movement;
- case 86 owns streaming data and follow-window policy; and
- case 116 owns a deliberately bespoke cross-shape morph topology.

| Disposition           |   Cases | Meaning                                                                  |
| --------------------- | ------: | ------------------------------------------------------------------------ |
| Definition now        |      58 | Current marks and eager transforms are sufficient                        |
| First-party primitive |      35 | Add a reusable mark, transform, layout, guide, or controlled signal      |
| Optional primitive    |      14 | Keep a heavy dependency granular, but hide its layout DTOs and lifecycle |
| Application boundary  |       2 | The remaining work is product state, DOM layout, or data arrival         |
| Inline custom mark    |       1 | The geometry is intentionally case-specific                              |
| **Total**             | **110** |                                                                          |

A normal definition does not require every implementation algorithm to live
in Charts core. D3 may implement an optional `sankeyDiagram`, `densityContour`,
or `brushX`. The author should still supply semantic source data and options in
the definition instead of materializing layout coordinates, copying scales,
or painting a second scene.

## Ownership test

Charts should own work when any of these are true:

- it depends on final scales, plot bounds, mark radius, or guide layout;
- it creates coordinates, intervals, topology, or paths only to draw a known
  visualization;
- it repeats across cases or represents a named statistical or layout
  operation; or
- it must participate in focus, motion, accessibility, scale inference, or
  renderer-neutral scene output.

Application code should own domain-specific metric meaning, network and data
arrival state, persistence, forms, tables, timers, and DOM scrolling. A custom
mark is appropriate only when the geometry itself is the point and no stable
reusable semantic contract has emerged.

## API shape

This does not reopen a chart-owned reactive `prepare` phase or add a generic
`transformData` graph. Keep the ownership decisions from F-128 and F-163:
ordinary framework state owns invalidation, and row transforms are eager,
typed functions.

The missing layers are narrower:

1. Eager row transforms such as `fold`, called next to the marks that consume
   them.
2. Composite marks that accept raw rows only when their statistics and geometry
   form one coupled contract, such as `boxY` and `differenceY`. Prepared-profile
   marks such as `ridgelineY` and `violinY` keep binning, normalization, and
   summaries explicit.
3. A deterministic mark-local resolved-layout stage after positional scales
   and inner bounds are known. It may emit derived rows, channels, points, and
   scene nodes before final rendering. Hexbin, density, dodge, Delaunay, and
   waffle need this stage. Voronoi demonstrates the narrower case: ordinary
   mark rendering already sees final scales and bounds when geometry contributes
   no derived channels, points, or child mark.
4. General view composition with shared or independent scales, axes, focus,
   and selections. Marginal plots should be three coordinated views, not one
   domain with hidden reserved ranges.
5. Controlled interaction signals plus first-party focus guides, selection
   states, handles, brush, and zoom behaviors. Optional scale inversion should
   propagate from the configured scale; Charts should not implement a second
   scale algorithm.
6. Granular `spatial`, `hierarchy`, `network`, and interaction subpaths so
   dependency weight does not force case authors to own repeated algorithms.

## Repeated primitive candidates

| Candidate                                                          | Cases                           |
| ------------------------------------------------------------------ | ------------------------------- |
| Use current marks, transforms, geo, polar, and focus APIs directly | 58 definition-now cases         |
| `fold` / wide-to-long                                              | 27, 30, 75, 99                  |
| Additional stack and cumulative layouts                            | 21, 26, 29, 64                  |
| Statistical composites and profile marks                           | 15, 31, 33, 62, 63              |
| Multi-view composition                                             | 57, 87                          |
| Controlled signals and keyed selection                             | 81–83, 88–92                    |
| Final-scale bar thickness cap                                      | 70                              |
| Final-plot mark geometry                                           | 37–41, 43, 52, 65               |
| Optional hierarchy and network layouts                             | 36, 40, 74, 101, both 111 cases |
| Polar value allocation and radial bars                             | 76–78, 93–98, 100               |
| Focus guides and continuous cursors                                | 80, 87, 88, 117                 |
| Controlled legend and point selection                              | 81, 82                          |
| Brush, zoom, and scale-bound handles                               | 83, 89–92                       |
| Per-tick label styling and anchoring                               | 118                             |

## Definition-native case review

These 42 cases were previously recorded only as a control-group total. Each is
now an explicit roadmap entry with its own source evidence and reviewed
ownership boundary.

| Case                                                                                   | Disposition           | Current definition boundary                                                                                                                          |
| -------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01 — Line gaps](./cases/01-line-gaps/tanstack.ts)                                     | Definition now        | A nullable native line channel owns discontinuity geometry and source focus lineage.                                                                 |
| [03 — Temperature range](./cases/03-temperature-range-band/tanstack.ts)                | Definition now        | Native area and line marks consume the same observations without range DTOs.                                                                         |
| [04 — Stacked time area](./cases/04-stacked-time-area/tanstack.ts)                     | Definition now        | Native stacking, scales, guides, and legend consume tidy industry rows.                                                                              |
| [13 — Interval timeline](./cases/13-interval-timeline/tanstack.ts)                     | Definition now        | Native horizontal interval bars own open-to-close endpoints and band geometry.                                                                       |
| [16 — Lollipop](./cases/16-lollipop/tanstack.ts)                                       | Definition now        | Native links and dots express the pattern without a lollipop-specific primitive.                                                                     |
| [17 — Dumbbell](./cases/17-dumbbell/tanstack.ts)                                       | Definition now        | One native endpoint link and two dot layers remain source-bound.                                                                                     |
| [18 — Cumulative histogram](./cases/18-cumulative-histogram/tanstack.ts)               | Definition now        | Public `binX` and `cumulative` outputs feed native rectangles.                                                                                       |
| [19 — Moving average](./cases/19-moving-average-line/tanstack.ts)                      | Definition now        | The public `window` transform owns rolling means before native lines.                                                                                |
| [20 — Normalized stacked area](./cases/20-normalized-stacked-area/tanstack.ts)         | Definition now        | Public normalized stack layout remains inside the area definition.                                                                                   |
| [24 — Quantitative binned heatmap](./cases/24-quantitative-binned-heatmap/tanstack.ts) | Definition now        | Public `binXY` emits semantic intervals consumed by native rectangles.                                                                               |
| [25 — Calendar heatmap](./cases/25-calendar-heatmap/tanstack.ts)                       | Definition now        | Calendar accessors are authored semantics; native cells and band scales own geometry.                                                                |
| [28 — Candlestick](./cases/28-candlestick/tanstack.ts)                                 | Definition now        | Native links express high-low and open-close intervals; gain/loss is presentation policy.                                                            |
| [32 — Change arrows](./cases/32-change-arrows/tanstack.ts)                             | Definition now        | Native arrow endpoints remove any need for prepared paths.                                                                                           |
| [34 — Pointer tooltip](./cases/34-pointer-tooltip/tanstack.ts)                         | Definition now        | Native focus, decorative line ownership, and point tooltip behavior live in the definition.                                                          |
| [35 — Grouped tooltip](./cases/35-grouped-tooltip/tanstack.ts)                         | Definition now        | Native grouped focus and ordered portal tooltip behavior live in the definition.                                                                     |
| [40 — GeoJSON map](./cases/40-geojson-map/tanstack.ts)                                 | Definition now        | `geoShape` and a public projection descriptor own fitting and path rendering.                                                                        |
| [42 — Vector field](./cases/42-vector-field/tanstack.ts)                               | Definition now        | The native vector mark owns geometry and one interaction point per sampled source row; focused sampling and runtime tests prove the boundary.        |
| [44 — Framed scatter](./cases/44-framed-scatter/tanstack.ts)                           | Definition now        | Native frame and dot marks share ordinary Cartesian scales.                                                                                          |
| [50 — Empirical CDF](./cases/50-empirical-cdf/tanstack.ts)                             | Definition now        | Public tied ranking plus explicit probability mapping feeds a native stepped line.                                                                   |
| [53 — Log scatter](./cases/53-log-scale-scatter/tanstack.ts)                           | Definition now        | A source-domain guard and configured log scale feed native dots directly.                                                                            |
| [54 — Bump ranking](./cases/54-bump-ranking/tanstack.ts)                               | Definition now        | Public ranking and maximum-date selection feed native line, dot, and text marks.                                                                     |
| [59 — Grouped reducer bars](./cases/59-grouped-reducer-bars/tanstack.ts)               | Definition now        | Public grouped mean output feeds native bars and labels.                                                                                             |
| [60 — Lag autocorrelation](./cases/60-lag-autocorrelation/tanstack.ts)                 | Definition now        | Public two-row windows form lag pairs for native dots and a reference line.                                                                          |
| [70 — Composed chart](./cases/70-composed-chart/tanstack.ts)                           | First-party primitive | Native `barY.maxThickness` applies a centered cap after final band, subgroup, and inset resolution; one private resolver also serves `barX`.         |
| [72 — Mixed bars](./cases/72-recharts-mixed-bars/tanstack.ts)                          | Definition now        | Public grouped bar layout expresses adjacent stacked and independent slots.                                                                          |
| [73 — Many-point scatter](./cases/73-many-point-scatter/tanstack.ts)                   | Definition now        | Native dots own explicit keys and a configured radius scale over selected source rows.                                                               |
| [102 — World choropleth](./cases/102-world-choropleth/tanstack.ts)                     | Definition now        | `geoShape`, a public Equal Earth descriptor, and threshold color render joined countries.                                                            |
| [103 — Bubble map](./cases/103-bubble-map/tanstack.ts)                                 | Definition now        | `geoShape` owns projected point geometry while an ordinary radius channel carries population.                                                        |
| [104 — Orthographic globe](./cases/104-orthographic-globe/tanstack.ts)                 | Definition now        | Sphere, graticule, and land are ordinary `geoShape` layers with a public projection descriptor.                                                      |
| [105 — Route map](./cases/105-route-map/tanstack.ts)                                   | Definition now        | Land, graticule, route, and sphere share one public Equal Earth descriptor.                                                                          |
| [106 — Polar line](./cases/106-polar-line/tanstack.ts)                                 | Definition now        | Native polar grids and radial line consume semantic angle and radius channels.                                                                       |
| [107 — Polar scatter](./cases/107-polar-scatter/tanstack.ts)                           | Definition now        | Native polar grids and radial dots consume wind direction, band, and speed channels.                                                                 |
| [108 — Country choropleth](./cases/108-country-choropleth/tanstack.ts)                 | Definition now        | `geoShape` plus a public projection descriptor and quantized color render joined countries.                                                          |
| [109 — US choropleth](./cases/109-us-state-choropleth/tanstack.ts)                     | Definition now        | County features pass the public Albers USA descriptor to `geoShape`; focused tests prove descriptor ownership, fitting, lineage, and quantile color. |
| [Grouped bars](./cases/bar-grouped/tanstack.ts)                                        | Definition now        | Public grouped reduction and bar layout stay inside the responsive definition.                                                                       |
| [Horizontal ranking bars](./cases/bar-horizontal-ranking/tanstack.ts)                  | Definition now        | Authored ordering feeds native horizontal bars and automatic label measurement.                                                                      |
| [Stacked bars](./cases/bar-stacked/tanstack.ts)                                        | Definition now        | Public `fold` and `stack` outputs feed native bars directly.                                                                                         |
| [Sorted vertical bars](./cases/bar-vertical-sorted/tanstack.ts)                        | Definition now        | Native bars own geometry; responsive input changes only tick-label rotation.                                                                         |
| [Anscombe facets](./cases/facets-anscombe/tanstack.ts)                                 | Definition now        | Native facet composition owns child bounds and source-bound dot scenes.                                                                              |
| [Labeled heatmap](./cases/heatmap-labeled/tanstack.ts)                                 | Definition now        | Native cells and text share explicit category and color scales.                                                                                      |
| [Histogram](./cases/histogram/tanstack.ts)                                             | Definition now        | Public `binX` output feeds native semantic rectangle intervals.                                                                                      |
| [Bubble scatter](./cases/scatter-bubble/tanstack.ts)                                   | Definition now        | Native dot color and radius channels consume model rows directly.                                                                                    |

## Statistical and prepared-data cases

| Case                                                                           | Disposition           | Target definition boundary                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [02 — End labels](./cases/02-multi-line-end-labels/tanstack.ts)                | Definition now        | Use grouped `select` by maximum date directly as the `text` data, preserving the intended endpoint under row reordering.                                                                                                                                        |
| [14 — Error bars](./cases/14-error-bars/tanstack.ts)                           | Definition now        | Use current `groupBy` mean and deviation outputs with native rule and tick marks; the estimator choice remains authored.                                                                                                                                        |
| [15 — Boxplot](./cases/15-boxplot/tanstack.ts)                                 | First-party primitive | Add `boxX` / `boxY`; quartiles, fences, whiskers, and outlier partitioning are canonical composite-mark work.                                                                                                                                                   |
| [21 — Streamgraph](./cases/21-streamgraph/tanstack.ts)                         | First-party primitive | Add `inside-out` stack order to the current `stack({ offset: 'wiggle' })`; native `areaY` already owns the geometry.                                                                                                                                            |
| [22 — Bollinger band](./cases/22-bollinger-band/tanstack.ts)                   | Definition now        | Call current `window` mean and deviation outputs beside one `areaY` and one `lineY`.                                                                                                                                                                            |
| [26 — Diverging Likert](./cases/26-diverging-likert/tanstack.ts)               | First-party primitive | Add an anchored stack offset that can center a named or fractional neutral series; current `groupBy` already owns the counts.                                                                                                                                   |
| [27 — Parallel coordinates](./cases/27-parallel-coordinates/transform.ts)      | First-party primitive | Add `fold`, followed by current grouped `normalize`; metric direction remains a domain accessor.                                                                                                                                                                |
| [29 — Waterfall](./cases/29-waterfall/tanstack.ts)                             | First-party primitive | Add an eager waterfall layout that returns stable `start`, `end`, `delta`, and total rows.                                                                                                                                                                      |
| [30 — Slopegraph](./cases/30-slopegraph/transform.ts)                          | First-party primitive | Use `fold` for the two period fields; current line, text, and endpoint selection marks suffice.                                                                                                                                                                 |
| [31 — Regression](./cases/31-linear-regression/tanstack.ts)                    | First-party primitive | Add `linearRegressionX` / `linearRegressionY`, optionally including a confidence band.                                                                                                                                                                          |
| [33 — Difference](./cases/33-difference-chart/tanstack.ts)                     | First-party primitive | Add `differenceX` / `differenceY`; crossing interpolation and positive/negative clipping belong to the composite mark.                                                                                                                                          |
| [51 — Faceted distributions](./cases/51-faceted-distributions/tanstack.ts)     | Definition now        | Compose current grouped `binX`, facet-local `normalize`, and `facet` in the definition.                                                                                                                                                                         |
| [55 — Indexed lines](./cases/55-indexed-multi-line/tanstack.ts)                | Definition now        | Use grouped `normalize({ basis: 'first' })` and grouped maximum-date `select`.                                                                                                                                                                                  |
| [56 — Connected scatter](./cases/56-connected-scatter/tanstack.ts)             | Definition now        | Use current two-row `window` output with the native `arrow`; the sparse arrow filter is editorial intent.                                                                                                                                                       |
| [57 — Marginal histograms](./cases/57-scatter-marginal-histograms/tanstack.ts) | First-party primitive | Add a multi-view composition with a main view plus top and right views, shared primary scales, and independent count scales.                                                                                                                                    |
| [58 — Extrema](./cases/58-select-extrema/tanstack.ts)                          | Definition now        | Feed current min/max `select` results directly to native dot and text marks.                                                                                                                                                                                    |
| [61 — Quantile ribbon](./cases/61-quantile-ribbon/tanstack.ts)                 | Definition now        | Feed current grouped quantile reducers directly to `areaY` and `lineY`.                                                                                                                                                                                         |
| [62 — Ridgeline](./cases/62-ridgeline-density/transform.ts)                    | First-party primitive | Add a ridge layout over binned or density rows so categorical baselines, overlap, domains, and tick labels stay semantic.                                                                                                                                       |
| [63 — Violin](./cases/63-violin-distributions/transform.ts)                    | First-party primitive | Keep grouped bins, max normalization, and medians explicit; add `violinX` / `violinY` only for mirrored category-step geometry and let ordinary ticks render summaries.                                                                                         |
| [64 — Marimekko](./cases/64-marimekko-mosaic/tanstack.ts)                      | First-party primitive | Keep grouped count or sum policy explicit, then use `mosaicY` / `mosaicX` for the two normalized interval dimensions; pie shares the proportional allocator, while waffle keeps unit fragmentation and pixel packing.                                           |
| [71 — Population pyramid](./cases/71-recharts-population-pyramid/tanstack.ts)  | Definition now        | Public `groupBy`, one signed value accessor, and one native diverging `barX` stack express the chart with complete observation lineage; no new primitive is warranted.                                                                                          |
| [75 — Radar](./cases/75-radar/transform.ts)                                    | First-party primitive | Use generic `fold` plus current extent normalization and `radialArea`. `angleGrid` already exposes label context and correct anchor/baseline defaults; the same-reference 1.1px `labelDy` and compact margin remain explicit presentation, not a shared helper. |
| [99 — Comparative radar](./cases/99-comparative-radar/transform.ts)            | First-party primitive | Use the same `fold` and grouped normalization while retaining profile identity. It keeps the same explicit 1.1px angle-label offset and compact margin for reference parity without adding a radar helper.                                                      |

## Spatial, hierarchy, and polar cases

| Case                                                                   | Disposition           | Target definition boundary                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [36 — Hierarchy tree](./cases/36-hierarchy-tree/tanstack.ts)           | Optional primitive    | Add a granular `tree` mark that accepts path or parent identity and owns stratification, node/link layout, and source lineage.                                                                                                                |
| [37 — Delaunay network](./cases/37-delaunay-network/tanstack.ts)       | Optional primitive    | Add `delaunayLink` in a spatial subpath; triangulation must use final screen positions.                                                                                                                                                       |
| [38 — Contour topography](./cases/38-contour-topography/tanstack.ts)   | Optional primitive    | A current `geoShape` can replace the raw renderer immediately, but a granular `contour` mark should own grid-to-isoline geometry.                                                                                                             |
| [39 — Density contours](./cases/39-density-contours/tanstack.ts)       | Optional primitive    | Add `densityContour`; the estimator needs final scales and inner bounds and should emit normal interaction lineage.                                                                                                                           |
| [40 — Force network](./cases/40-force-directed-network/layout.ts)      | Optional primitive    | Add a granular force-layout mark or transform with explicit forces, determinism, and static/live policy; modeling choices become definition options.                                                                                          |
| [41 — Waffle](./cases/41-waffle-unit-chart/tanstack.ts)                | First-party primitive | Add `waffleX` / `waffleY`; unit allocation and responsive packing are standard mark semantics.                                                                                                                                                |
| [43 — Hexbin](./cases/43-hexbin-density/tanstack.ts)                   | Optional primitive    | The resolved-screen `hexbin` primitive bins final projected pixels, internally inverts bin centers to semantic values for its adopted hexagon child, then remaps through the configured final scales; case code owns none of that round trip. |
| [52 — Beeswarm](./cases/52-beeswarm-dodge/tanstack.ts)                 | First-party primitive | Add `dodgeX` / `dodgeY` as dot layouts; preserve the measured coordinate exactly and resolve collisions after scaling.                                                                                                                        |
| [65 — Voronoi](./cases/65-voronoi-nearest-tooltip/tanstack.ts)         | Optional primitive    | Add visible `voronoi` cells as a spatial mark; nearest-point focus should continue through the native spatial index.                                                                                                                          |
| [74 — Treemap](./cases/74-recharts-treemap/tanstack.ts)                | Optional primitive    | Add a hierarchy subpath `treemap` that accepts raw hierarchy/value channels and owns coordinate convention and lineage.                                                                                                                       |
| [76 — Pie](./cases/76-pie/tanstack.ts)                                 | First-party primitive | Add polar `pie()` allocation from a value channel, returning angle intervals, midpoint, fraction, key, and source datum.                                                                                                                      |
| [77 — Donut](./cases/77-donut/tanstack.ts)                             | First-party primitive | Use the same `pie()` layout with the current `radialArc` inner radius.                                                                                                                                                                        |
| [78 — Gauge](./cases/78-gauge/tanstack.ts)                             | First-party primitive | Use partial-range `pie({ startAngle, endAngle })`; semantic agreement aggregation remains ordinary preparation.                                                                                                                               |
| [93 — Labeled pie](./cases/93-labeled-pie/tanstack.ts)                 | First-party primitive | Add pie allocation plus radial arc labels with pixel offset, automatic outside anchor, and optional leaders.                                                                                                                                  |
| [94 — Center donut](./cases/94-center-donut/tanstack.ts)               | First-party primitive | Use pie allocation and current center `radialText`; the displayed total is legitimate semantic reduction.                                                                                                                                     |
| [95 — Rounded donut](./cases/95-rounded-donut/tanstack.ts)             | First-party primitive | Give pie allocation explicit angular-gap semantics and keep current arc corner radius.                                                                                                                                                        |
| [96 — Nested donut](./cases/96-nested-donut/transform.ts)              | First-party primitive | Run independent declarative pie layouts for each ring; domain-specific family aggregation remains prepared data.                                                                                                                              |
| [97 — Rose](./cases/97-rose/tanstack.ts)                               | First-party primitive | Add a radial bar whose categorical angle band and quantitative radius vary per datum.                                                                                                                                                         |
| [98 — Needle gauge](./cases/98-needle-gauge/tanstack.ts)               | First-party primitive | Use pie allocation for threshold bands; current radial rule, dot, text, and guide marks already express the needle and ticks.                                                                                                                 |
| [100 — Radial bars](./cases/100-radial-bars/tanstack.ts)               | First-party primitive | Add the transposed radial bar: categorical radius band with quantitative angle extent.                                                                                                                                                        |
| [101 — Sunburst](./cases/101-sunburst/tanstack.ts)                     | Optional primitive    | Add a hierarchy subpath `sunburst` that owns partition layout and depth-dependent radii while exposing visual channels.                                                                                                                       |
| [110 — Projection gallery](./cases/110-projection-gallery/tanstack.ts) | Definition now        | Use current `facet` with one child `geoShape` chart per projection; remove manual pane bounds and projection fitting.                                                                                                                         |
| [111 — Basic Sankey](./cases/111-basic-sankey/tanstack.ts)             | Optional primitive    | Add granular `sankeyDiagram({ nodes, links })`; hide mutation cloning, endpoint resolution, responsive layout, and DTO conversion.                                                                                                            |
| [111 — Sankey flow](./cases/111-sankey-flow/tanstack.ts)               | Optional primitive    | Use the same Sankey primitive with authored node, link, label, and backdrop presentation channels.                                                                                                                                            |
| [116 — Geometry morph](./cases/116-geometry-morph/tanstack.ts)         | Inline custom mark    | Keep the normalized-topology `createMark`; cross-type path-token continuity is the example's unique geometry contract.                                                                                                                        |

## Interaction and shell cases

| Case                                                                             | Disposition           | Target definition or application boundary                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [80 — Axis pointer](./cases/80-echarts-axis-pointer/tanstack.ts)                 | Definition now        | Resolved with `focusGuideX`, grouped x focus, native grouped tooltip, and the native color legend; only conformance observation remains outside.                                                                                                                                                                                                                   |
| [81 — Interactive legend](./cases/81-recharts-interactive-legend/tanstack.ts)    | First-party primitive | Resolved with a controlled accessible color legend: full domains resolve before series geometry and focus points are filtered.                                                                                                                                                                                                                                     |
| [82 — Chart/table selection](./cases/82-chart-table-selection/view.tsx)          | First-party primitive | Resolved with `keyedSelection` and `whenSelected`; the semantic HTML table, status, clear action, representative-row policy, and persistence remain application or case UI.                                                                                                                                                                                        |
| [83 — Focus/context](./cases/83-focus-context-window/view.tsx)                   | Optional primitive    | `brushX`, controlled signals, and `keyedSelection` own the semantic window and detail selection. Two chart hosts are warranted rather than `viewGrid`: detail and overview have independent rows, domains, axes, margins, sizes, and behavior. The range input and four-month policy remain application UI.                                                        |
| [84 — Pinned nested tooltip](./cases/84-pinned-nested-chart-tooltip/view.tsx)    | Definition now        | Resolved with sticky pin-only tooltip visibility, portal placement, dismissal, inline pinned state, and adapter body composition; only cohort policy and the nested child remain outside.                                                                                                                                                                          |
| [85 — Resource lanes](./cases/85-scrollable-resource-lanes/tanstack.ts)          | Application boundary  | Native interval marks, inferred ID identity, focus, and tooltip own chart semantics. DOM scrolling, fixed rail/legend, auto-scroll, persistent details, and schedule semantics remain application-owned.                                                                                                                                                           |
| [86 — Streaming window](./cases/86-streaming-window-preservation/view.tsx)       | Application boundary  | Resolved: one exported definition bounds rows before scale inference, paints a decorative line plus interactive observations, and owns focus and tooltip. Arrival, viewport policy, controls, and announcements remain application-owned.                                                                                                                          |
| [87 — Synchronized cursors](./cases/87-echarts-synchronized-cursors/tanstack.ts) | Definition now        | Resolved with one `viewGrid`, shared x semantics, grouped focus, child `focusGuideX` marks, decorative lines, and native sticky pinning. Only the live value summary remains application UI.                                                                                                                                                                       |
| [88 — Free cursor](./cases/88-echarts-free-cursor/tanstack.ts)                   | First-party primitive | Resolved with `continuousCursor`: final-scale inversion, unsnapped rules, marker and labels, transient pointer/touch previews, controlled pinning and Escape clearing are definition-owned. Semantic sliders and status remain application UI.                                                                                                                     |
| [89 — Brush selection](./cases/89-brush-range-selection/tanstack.ts)             | Optional primitive    | Resolved with controlled `brushX`: final-scale candidate mapping, observed-date snapping, reverse normalization, painting, keyboard handles, cancellation, and teardown are definition-owned. The monthly cohort and live financial summary remain application-owned.                                                                                              |
| [90 — Zoomable window](./cases/90-zoomable-time-window/tanstack.ts)              | Optional primitive    | Resolved with controlled `zoomX`: final-scale inversion, pointer-anchored wheel zoom, drag and horizontal-wheel pan, touch, keyboard, clamping, cancellation, focus-gated wheel capture, and teardown are definition-owned. Visible-row and y-domain policy, status, reset, and persistence remain application-owned.                                              |
| [91 — Playback scrubber](./cases/91-timeline-playback-scrubber/tanstack.ts)      | First-party primitive | Resolved with controlled `handleX`: final-scale track, rule and playhead painting, observed-date snapping, pointer and touch capture, cancellation, keyboard slider semantics, and teardown are definition-owned. Playback timing, transport controls, status, and announcements remain application-owned.                                                         |
| [92 — Editable range](./cases/92-editable-event-range/tanstack.ts)               | First-party primitive | Resolved with the same controlled `handleX`: final-scale end-handle painting, constrained date snapping, semantic lane placement, pointer and touch capture, cancellation, keyboard slider semantics, and teardown are definition-owned. The date input, validation, event constraint, commit state, status, and exact-value alternative remain application-owned. |
| [112 — Entrance motion](./cases/112-motion-entrance/tanstack.ts)                 | Definition now        | Motion is already definition-local; replay and demo settings are shell controls.                                                                                                                                                                                                                                                                                   |
| [113 — Spring updates](./cases/113-motion-updates/tanstack.ts)                   | Definition now        | Keyed enter/update/exit, interruption, and per-datum policy are already declarative; stage controls remain outside.                                                                                                                                                                                                                                                |
| [114 — Spring line](./cases/114-spring-line-motion/tanstack.ts)                  | Definition now        | Line morph and per-series spring overrides are already declarative; demo controls remain outside.                                                                                                                                                                                                                                                                  |
| [115 — Definition motion](./cases/115-definition-motion/tanstack.ts)             | Definition now        | Chart, mark, datum, axis, tick, and label motion are already definition-owned.                                                                                                                                                                                                                                                                                     |
| [117 — Focus cursor motion](./cases/117-focus-cursor-motion/tanstack.ts)         | First-party primitive | Add a stable-key focus guide with x/y rules, marker, labels, and normal motion; remove the second SVG and spring loop.                                                                                                                                                                                                                                             |
| [118 — Token calendar](./cases/118-token-usage-calendar/shell.ts)                | First-party primitive | Add per-tick text style, anchor, and offset accessors so the first month label needs no post-render DOM mutation.                                                                                                                                                                                                                                                  |
| [119 — Stacked bar cursor](./cases/119-stacked-bar-band-cursor/chart.ts)         | First-party primitive | Use renderer-native `crosshair` axes for the categorical band, endpoint rule, labels, grouped focus, and ordinary definition motion; only conformance observation remains outside.                                                                                                                                                                                 |

## Reference evidence

Observable Plot demonstrates that mark-oriented APIs can own canonical
composites instead of requiring prepared DTOs: its
[box](https://observablehq.com/plot/marks/box),
[Bollinger](https://observablehq.com/plot/marks/bollinger),
[difference](https://observablehq.com/plot/marks/difference), and
[linear regression](https://observablehq.com/plot/marks/linear-regression)
marks accept source observations.

It also treats final-screen work as mark or transform behavior:
[density](https://observablehq.com/plot/marks/density),
[Delaunay and Voronoi](https://observablehq.com/plot/marks/delaunay),
[hexbin](https://observablehq.com/plot/transforms/hexbin), and
[dodge](https://observablehq.com/plot/transforms/dodge) do not require authors
to duplicate responsive scales. Plot's
[crosshair](https://observablehq.com/plot/interactions/crosshair) is evidence
that a focus guide can be a normal mark.

Observable Plot is not the ceiling. Vega-Lite keeps ordered
[data transforms](https://vega.github.io/vega-lite/docs/transform.html) and
[multi-view composition](https://vega.github.io/vega-lite/docs/composition.html)
inside specifications. Vega exposes a D3-backed
[force transform](https://vega.github.io/vega/docs/transforms/force/) with
forces and static/live policy as declarative options. These precedents support
first-party optional adapters without requiring the algorithms in the root
bundle.

## Delivery result

All 110 catalog directories now have one roadmap record and case-local
evidence. All 107 normal-definition cases are verified against their current
boundary; only cases 85, 86, and 116 retain accepted application or bespoke
geometry work. The roadmap validator compares its IDs with the live catalog
directories so a new case cannot silently remain outside this review.
