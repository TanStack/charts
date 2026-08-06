# Definition coverage plan

The [definition coverage audit](./DEFINITION-COVERAGE-AUDIT.md) records the
reviewed decision for every catalog chart. The
[definition coverage overview](./DEFINITION-COVERAGE-OVERVIEW.md) is the
case-by-case handoff, and the machine-readable
[`definition-coverage-roadmap.json`](./definition-coverage-roadmap.json) is the
delivery tracker. Update it in the same change that starts, migrates, defers,
or verifies a capability or case.

This plan does not add a chart-owned reactive preparation graph. Eager row
transforms remain ordinary typed functions. Resolved layout remains
deterministic, synchronous, renderer-neutral, and local to the mark that owns
it.

## Status contract

Capability statuses are:

- `planned`: the boundary is accepted but implementation has not started;
- `active`: contract or implementation work is in progress;
- `available`: the required API exists, but all mapped case migrations are not
  verified;
- `verified`: the capability and every mapped case satisfy their gates; and
- `deferred`: work stopped with a recorded reason.

Case statuses are:

- `planned`: the target boundary is known;
- `active`: migration is in progress;
- `verified`: the target definition and its evidence pass; and
- `accepted-boundary`: reviewed application or bespoke-mark work remains
  intentionally outside a normal definition.

Dependencies live only on capability records. A case is blocked while any of
its capabilities are `planned`, `active`, or `deferred`; do not duplicate a
second blocker list on the case.

Each case also retains compact `work` records. `sources` identify where the
work is currently implemented, while `owner` identifies its destination
owner. A case-local basename points into that case; a repository-relative path
points to migrated Charts code. This distinction prevents a migration from
hiding layout in another support file. A case may retain application or
case-owned work after its Charts-owned work moves behind a definition
primitive.

## Delivery phases

| Phase                   | Cases | Exit                                                                                                            |
| ----------------------- | ----: | --------------------------------------------------------------------------------------------------------------- |
| 0 — Existing boundaries |    60 | Verify 57 current-API cases and accept cases 85, 86, and 116 as explicit boundaries                             |
| 1 — Shared foundations  |     2 | Prove resolved mark layout with cases 41 and 43; establish composite marks, views, signals, and scale inversion |
| 2 — Core primitives     |    26 | Land eager transforms, composites, polar work, bar caps, radial bars, and tick-label accessors                  |
| 3 — Optional layouts    |    11 | Land isolated spatial, hierarchy, force, and Sankey entries without changing ordinary bundles                   |
| 4 — Interaction         |    10 | Migrate controlled selection, focus guides, cursors, brush, zoom, and handles                                   |
| 5 — Closure             |   109 | Re-audit authored-source closure and verify every catalog disposition                                           |

Phases describe verification order, not a ban on parallel work. Leaf
primitives can proceed once their capability dependencies are available.

## First active slice: resolved mark layout

`resolved-mark-layout` is the first cross-cutting capability. It unlocks
waffle, hexbin, dodge, Delaunay, density, and responsive optional layout
adapters, including responsive Sankey flow. Voronoi needs final scales and
bounds but no derived channels or child mark, so its ordinary render callback
is the correct scheduling boundary. Scalar-grid contours share geometry helpers
with density but do not depend on resolved layout.

The engine already calls `InitializedMark.render` with resolved chart bounds
and positional scales. The first implementation extends that bounded solver
with a pure mark-local `resolveLayout` stage. Case 43 now proves derived color
channels, reducers, scale inversion, source lineage, and exact-subpath bundle
isolation. It projects observations with the final configured scales, bins in
pixel space, inverts each bin center internally to a semantic child value, and
lets that child remap once through the same final scales. That bounded round
trip belongs to the primitive; the case neither copies scales nor exposes
pixel DTOs. Case 41 proves bounds-only responsive packing, cumulative unit
allocation, source-level one-to-many identity, and root/exact-subpath bundle
isolation. Case 65 proves that final-screen geometry can reuse the same
projection helpers without entering resolved layout when it only emits scene
nodes. Case 39 proves resolved density estimation, derived presentation
channels, and structured disconnected polygons and holes without synthetic
interaction points. Together they close this lifecycle slice.

### Resolved-layout decomposition

`resolveLayout` owns scheduling only. One smaller contract is now proven:

- Axis-composable input projection: `projectLayoutX` and `projectLayoutY`
  preserve source rows and indexes while adding semantic/pixel anchor pairs.
  `materializeLayoutXYRows` establishes the paired-axis completeness rule.
  Dodge uses one axis; hexbin, Delaunay, and Voronoi compose both. Voronoi uses
  them in ordinary rendering, so these helpers do not imply a resolved-layout
  dependency. They remain internal.
- Direct child-mark adoption: `adoptResolvedChildMark` forwards a non-layout
  child's channels, states, labels, and render closure. Hexbin adopts
  `hexagon`; Delaunay adopts `link`. Nested resolved layouts are rejected.
- Multi-child resolved composition: `composeResolvedChildMarks` initializes
  several ordinary marks against identity pixel scales, namespaces every child
  node and point under its resolved parent, merges non-positional channels and
  labels, and preserves child focus/state behavior. Sankey proves links,
  rectangles, labels, backdrops, and titles without exposing a second scene
  renderer.
- Canonical spatial grouping: `groupRowsByChartKey` partitions normalized
  projected rows by `valueKey`, preserves source order inside each group, and
  returns groups in stable identity order. Density, Delaunay, and Voronoi now
  share it; ordinary line layering intentionally retains first-seen order.
- Structured contour identity: `identifyContourLevels` keys explicit levels by
  value and duplicate occurrence, while generated levels use the requested
  count and ordinal. Density and scalar-grid contours can therefore share
  motion identity even though their threshold-generation semantics differ.
  `mapContourPolygons` separately owns validated multipolygon and hole mapping.

Case 38 establishes a separate scheduling boundary. Marching-squares topology
over a regular scalar grid depends only on source values, dimensions,
thresholds, and smoothing, so `contour` computes it eagerly during definition
construction. Its ordinary render callback only maps structured rings into the
final bounds. It shares contour identity, threshold validation, and polygon
mapping with responsive density estimation, but not scale projection, spatial
grouping, KDE, or `resolveLayout`.

Case 40 establishes the corresponding eager boundary for relational layout.
`forceLayout` settles node coordinates synchronously in data space, resolves
link endpoints, and returns padded domains before normal marks initialize.
Chart resize only remaps those coordinates through ordinary scales, so the
transform has no `resolved-mark-layout` dependency and no renderer lifecycle.
It reuses the existing `TransformValue`, materialization, accessor-context, and
lineage conventions; it does not share contour, spatial grouping, pixel
projection, or resolved child-mark machinery with the geometric cases.

The ordered `link`, `manyBody`, `center`, `collide`, `x`, and `y` descriptors
are the reusable first-principles inputs. Cloning, ticking, endpoint resolution,
and domain derivation remain one static settlement invariant: exposing any
halfway result would leak D3's mutable simulation records and make authors
reconstruct the same cleanup. Continuous ticking, custom D3 forces, drag, and
reheat policy remain application-owned rather than becoming a live chart
controller.

Case 36 proves the same eager scheduling boundary for flat hierarchy input.
`treeLayout` converts path or parent-reference rows into a validated hierarchy,
runs tidy-tree placement in arbitrary semantic breadth/depth units, orients the
result, and emits ordinary node and link rows. Normal x/y scales own the final
responsive projection; the transform needs neither resolved bounds nor a
composite mark. The case retains only subtree selection, styling, label policy,
margin, and tooltip language.

A private flat-hierarchy layer is now established for tree, treemap, and
sunburst work. It owns path normalization, explicit id/parent construction,
imputed ancestors, structural validation, source indexes, and authored child
order without exposing mutable D3 hierarchy nodes. The tree transform adds
only tidy placement, orientation, sorting/separation contexts, and native-mark
DTOs. The treemap mark is the second consumer and extracts one more private
contract: immutable hierarchy node metadata and direct source lineage. Future
hierarchy layouts should reuse those construction and context layers, but not
tree or treemap coordinates.

Case 74 proves the responsive hierarchy boundary. Squarified row topology
depends on the final plot aspect ratio, while padding, inset, and label fit use
CSS pixels. A fixed normalized square followed by Cartesian scaling therefore
cannot preserve the layout. The exact optional `treemap` mark resolves a
private hierarchy copy against the final inner bounds, retains the
downward-increasing screen convention inside the mark, and emits interactive
leaf rectangles plus measured in-cell labels. Semantic path/value accessors run
once, stable node contexts carry aggregate value and direct lineage, and no x/y
scale or pixel-to-value inversion is introduced. Stateful resquarification
remains application-owned because layout passes must be deterministic rather
than depend on prior render history.

Treemap shares final-bounds scheduling with waffle and the flat-hierarchy
construction/context layer with tidy tree. It does not share waffle's
cumulative unit allocation, the spatial marks' scale projection or grouping,
hexbin's child-mark adoption, or force settlement. Case-owned work stops at
subtree selection, palette, tiling preference, and visual style. The migrated
definition improves the responsive diagnostic geometry baseline from 86.9% to
99.4% while using 45 source lines versus the Recharts reference's 129.

Tree and force links deliberately stop at a shared field vocabulary rather
than a generic materializer. Tree edges are synthesized and inherit target-node
lineage; force edges preserve authored link rows. Both reuse `toArray`,
`transformValues`, immutable source data, stable identity, and ordinary mark
composition.

Other contracts remain candidates until repeated use proves them:

- Indexed reduction: aggregate projected rows without losing source lineage.
- Pure named kernels: keep waffle packing, hexagonal binning, dodge, and other
  algorithms independent of chart lifecycle code.

Resolved outputs retain semantic and pixel anchors. Scale inversion is
reserved for actual pixel-to-value behavior, not a semantic-to-pixel-to-semantic
round trip for child rendering. No universal `layout()` callback, transform
protocol, or reactive dependency graph is planned. Promote a candidate helper
only after a second consumer establishes the boundary.

The proof is complete under these gates:

- case 41 accepts source category/value rows and chooses unit packing from the
  final inner bounds, including guide and legend consumption;
- case 43 accepts raw observations, bins through the configured final scales,
  and does not create parallel scales or invert bins in case code;
- case 65 accepts source observations, clips structured Voronoi cells through
  final scales and bounds in ordinary rendering, and leaves focus points to its
  dot layer;
- case 38 accepts raw scalar-grid observations and owns eager topology without
  entering resolved layout;
- case 40 accepts raw node and link rows, owns deterministic eager settlement,
  and feeds its result to native link, dot, and text marks without case-owned
  coordinates or endpoint resolution;
- case 36 accepts raw path or parent-reference rows, owns hierarchy validation
  and semantic tidy-tree placement, and feeds native link, dot, and text marks
  without case-owned stratification, coordinates, or DTO conversion;
- case 74 accepts raw path rows, owns responsive hierarchy tiling, y-down
  screen coordinates, node DTOs, lineage, interactions, and measured label fit,
  and contains no case-owned hierarchy conversion, cell layout, or copied
  scales;
- both case 111 definitions accept semantic node and link rows, own responsive
  graph layout, endpoint resolution, proportional widths, immutable lineage,
  and multi-child mark composition without case-owned positioned graph DTOs;
- one-to-one and many-to-one outputs retain source datum lineage, stable keys,
  interaction points, and deterministic resize/update behavior;
- derived geometry cannot feed back into positional-domain or guide layout in
  an unbounded pass;
- the same scene output works through static SVG, DOM SVG, Canvas, and native
  renderers where the emitted node kinds are supported;
- the public extension contract used by first-party marks is available to a
  custom mark without private imports; and
- waffle, hexbin, dodge, Delaunay, Voronoi, scalar-grid contour, static force
  layout, tidy-tree layout, treemap, and Sankey have isolated bundle fixtures;
  optional algorithms stay absent from ordinary retained-input graphs, and
  shared lifecycle baseline movement is explicitly reviewed.

## First phase-2 slice: wide-to-long fold

`fold` closes the repeated structural gap in cases 27, 30, 75, and 99. It is
an eager data transform rather than a mark layout: selected fields become
ordinary long-form rows before scales or geometry exist. Output is
source-row-major and follows authored field order, preserves untouched source
properties, and records direct source row/index lineage. It does not filter or
map values. Duplicate fields, conflicting output names, and reserved lineage
names fail synchronously.

The four migrations establish the composition boundary:

- case 27 folds the complete decathlon population, normalizes each event with
  explicit timed-event negation, then selects the final row per country and
  event to preserve its previous `Map` semantics;
- case 30 folds two wage fields, maps their authored field names to display
  years through an x accessor, selects final endpoints for labels, and keys
  each point by metro plus folded field;
- case 75 folds and normalizes the complete population, then selects the first
  row per event for one zero-to-one radial profile; and
- case 99 runs the same complete-population pipeline, filters USA and GBR, and
  selects the first row per country and event for two profiles.

The ordered event lists, lower-is-better timed metrics, chosen countries,
field-to-year labels, and profile selection remain case semantics in selection
files. They are not a generic radar or parallel-coordinate utility. Both radar
definitions use the existing polar marks and guide defaults; the duplicated
angle-label baseline callbacks were redundant and are removed. `angleGrid`
already exposes the public label context and correct default anchor/baseline.
Cases 75 and 99 retain an identical 1.1px `labelDy` and compact margin only for
same-dataset/reference presentation parity. That policy stays explicit in each
definition rather than becoming a Charts primitive or hidden shared helper.

Focused tests cover source-major field order, full-population normalization,
selection policy, zero-to-one domains, native scene geometry, stable composite
keys, nested direct lineage, dynamic slopegraph updates, and the absence of
case-owned D3 extent preparation. The exact fold entry remains independently
measured and absent from consumers that do not import it.

Focused standard conformance keeps geometry at 96.0% for case 27,
98.9% for case 30, and 100.0% for cases 75 and 99, with clean visual and strict
type gates. TanStack authored source moves from 102 to 97 lines, 94 to 84,
142 to 124, and 181 to 139 respectively.

## Completed phase-2 slice: final-scale bar thickness

Case 70 now expresses its layered weather chart as one static definition. The
precipitation layer uses `barY({ maxThickness: 20 })`; it no longer guesses the
inner width, reconstructs a band scale, or converts a pixel cap into dynamic
inset.

The mark applies a finite nonnegative cap after the final categorical band,
optional subgroup band, and authored inset resolve, then centers the painted
bar. One private orientation-neutral resolver serves `barY` and `barX` because
both need the same final-scale thickness policy. It is not a public layout
utility: no non-bar consumer has this invariant.

Focused core tests prove centered vertical and horizontal caps. The Case 70
runtime test proves six 20px wide bars at the normal width, natural narrower
bars in a compact plot, and source closure without a responsive definition
builder or guessed inner width.

## Next phase-2 slice: polar value allocation

`pie` establishes value allocation as an eager data-space transform in the
existing `@tanstack/charts/polar` entry. It accepts a typed value channel plus
explicit order and angle options, then returns flat source rows with direct
lineage, visible start/end intervals, midpoint angle, fraction, and angular
index. Output remains in source order while `index` records explicit angular
order. Missing values are omitted, negative values fail, and finite values are
normalized without overflowing their total.

`gapAngle` reserves radius-independent empty angle before proportional
allocation. Complete revolutions include the seam gap; partial ranges use only
internal gaps and preserve both authored endpoints. The returned `padAngle` is
zero because the visible interval already owns the gap; D3 arc padding remains
a separate lower-level `radialArc` option.

Cases 76–78 are the first proofs. The pie and donut definitions pass selected
alphabet rows directly to `pie`, while the gauge passes its two semantic
agreement rows through an authored 270-degree range. All three use ordinary
`radialArc` channels, explicit semantic keys, and flat data without a D3
`datum.data` bridge. Case 77 adds only the responsive `innerRadius` that turns
the same arc intervals into a donut. Case 78 uses the same radius channel and
changes only the allocator's start and end angles. Neither shape needs a
specific allocator or composite mark. Selection, survey reduction, palettes,
percentage formatting, radii, and accessibility language remain case-owned.
Case 94 feeds the same flat intervals to an annular arc and adds one ordinary
center `radialText` row. The selected-frequency sum and its formatting remain
case-owned because they are semantic aggregation and presentation, not pie
allocation. Case 95 uses `gapAngle` to materialize the five direct three-degree
gaps before an ordinary `radialArc` applies its responsive inner radius and
eight-pixel corners. No rounded-donut composite, corner-gap helper, or
`padRadius` policy is needed. Case 96 independently allocates the prepared
family and detail rows, then composes two keyed `radialArc` layers with separate
responsive radii. The Flare-specific classifier and sums remain case-owned; a
grouped-pie or nested-donut abstraction would only hide them. Case 98 uses the
same partial-range allocation for threshold bands, then composes
ordinary rule, dot, and text marks for ticks, needle, hub, and readout. Its
thresholds, tick cadence, reading selection, and display language remain
case-owned. All mapped polar-allocation cases are now verified. Radial bars
remain independent categorical-band geometry.

Case 93 establishes that outside labels do not need a composite mark. The same
flat pie rows feed `radialArc`, decorative `radialRule`, and interactive
`radialText` marks. Signed `radiusOffset`, `radius1Offset`, and `radius2Offset`
visual channels apply scene pixels after semantic radius mapping without
entering domain inference. `radialText({ anchor: "outside" })` and `angleGrid`
share one private, angle-based anchor rule. Selection, palette, font styling,
the 20px spacing choice, and the amount of reserved outer space remain
case-owned. The case no longer creates a D3 pie DTO, label DTO, responsive
radius callback, or side-anchor callback.

Focused tests cover field and accessor inference, source-order output,
ascending and descending ties, lineage and collision ownership, zero and
missing values, overflowing finite totals, positive and negative full/partial
sweeps, direct gaps, rounded-donut end-trim parity, arc path/centroid
integration, stable explicit keys, deterministic iterables, and exact-subpath
export isolation. Focused case runtime tests additionally cover responsive
annular radii, flat direct lineage, source order, stable semantic keys, dynamic
values, and the absence of case-owned D3 layout. Case 78 also proves that the
agreement reducer remains visible application preparation while only its
partial angular allocation moves into the definition. The pie bundle fixture
imports no application-owned D3 pie generator, while the arc-only fixture
rejects retention of the allocator.

Focused case 93 tests cover flat lineage, stable semantic keys and colors,
responsive post-scale leader and label geometry, exact interaction-point
positions, and source-level absence of D3 layout, DTO mapping, and dynamic
width preparation. Core tests cover signed per-datum offsets at multiple
sizes, radius-domain isolation, every nonfinite offset form, invalid semantic
rows, cardinal and near-cardinal anchors, angle-grid sharing, and authored
guide-anchor precedence. The dedicated source fixture is 17.75 KiB gzip and
rejects retention of the pie allocator. Packed declarations compile the new
text and rule options through the published polar entry.

Focused case 94 tests cover the selected sum, flat direct lineage, responsive
annular radii, exact center placement, stable slice and center keys, and the
absence of the former D3 pie DTO. No center-label composite or aggregate
transform is warranted for its single visible reduction.

Focused case 95 tests cover both revision windows, source and angular order,
all internal and seam gaps, zero mark padding, direct lineage, responsive
annular centroids, exact rounded D3 arc paths, semantic keys, and removal of
the former D3 pie/end-trim workaround.

Focused case 96 tests cover independent complete-ring allocation, direct
lineage to the prepared family/detail rows, aligned family boundaries,
responsive inner and outer annuli, exact arc paths, stable semantic ring keys,
and removal of both D3 pie DTOs while retaining the domain aggregation.

Focused case 98 tests cover flat threshold-band lineage and fractions, the
shared authored half-circle range, all eleven tick rules, scale-driven needle,
fixed-pixel hub/readout geometry, responsive radii, semantic layer keys, flat
tooltips, and removal of case-owned pie and trigonometry. Radial endpoint
offsets are intentionally not used: the tick and needle lengths scale with
chart radius, while the readout's `dy` must remain screen-down.

Standard browser conformance for case 76 reports 100.0% geometry similarity
with clean visual and strict-type gates. TanStack and Recharts use 53 and 56
authored lines and 25.38 and 145.71 KiB gzip respectively. Median mount is
0.10 ms versus 1.20 ms; median update is 0.10 ms versus 0.60 ms. Packed
declarations, runtime, and isolation pass. The exact pie-only consumer is
2.10 kB minified and 1.06 KiB gzip with no D3 runtime, and pie allocation is
absent from universal, core, and React fixtures that do not import it.
Case 77 also reports 100.0% geometry with clean visual and strict-type gates.
Its TanStack definition uses 54 lines and 25.41 KiB gzip versus Recharts' 56
lines and 145.72 KiB; median mount is 0.20 ms versus 1.20 ms and median update
is 0.10 ms versus 0.70 ms.
Case 78 reports the same 100.0% geometry and clean visual/type gates over its
270-degree sweep. Its complete authored closure uses 78 lines and 25.46 KiB
gzip versus Recharts' 79 lines and 145.80 KiB; median mount is 0.10 ms versus
1.10 ms and median update is 0.10 ms versus 0.50 ms.
Case 93 reports 99.9% geometry with clean visual/type gates. Its complete
authored closure uses 81 lines and 34.16 KiB gzip versus Recharts' 72 lines and
145.78 KiB; median mount is 0.20 ms versus 1.40 ms and median update is 0.20 ms
versus 1.00 ms. Case 94 also reports 99.9% geometry with clean visual/type
gates. Its complete authored closure uses 75 lines and 33.97 KiB gzip versus
Recharts' 74 lines and 145.84 KiB; median mount is 0.20 ms versus 1.20 ms and
median update is 0.10 ms versus 0.60 ms.
Case 95 reports 100.0% geometry with clean visual/type gates. Its complete
authored closure uses 59 lines and 25.43 KiB gzip versus Recharts' 61 lines and
145.73 KiB; median mount is 0.20 ms versus 1.10 ms and median update is 0.10 ms
versus 0.60 ms.
Case 96 reports 100.0% geometry with clean visual/type gates. Its complete
authored closure uses 134 lines and 25.57 KiB gzip versus Recharts' 151 lines
and 145.98 KiB; median mount is 0.20 ms versus 1.50 ms and median update is
0.10 ms versus 0.80 ms.
Case 98 reports 100.0% geometry with clean visual/type gates. Its complete
authored closure uses 139 lines and 34.79 KiB gzip versus Recharts' 134 lines
and 146.13 KiB; median mount is 0.20 ms versus 1.20 ms and median update is
0.20 ms versus 0.60 ms.

## Next phase-2 slice: radial bars

Cases 97 and 100 establish two transposed bar semantics rather than another
pie or a generic sector API. `radialBarRadius` maps a categorical angle band
and quantitative radius interval. `radialBarAngle` maps a categorical radius
band and quantitative angle interval. Both preserve raw rows, semantic keys,
interval metadata, and geometry-attached focus. D3 band padding owns category
occupancy; there is no second bar-ratio option.

`PolarRadiusOptions.range` is the smaller shared coordinate capability. It
copies a configured radius scale into responsive physical endpoints without
mutating the source scale. An omitted radius-extending baseline paints from
physical radius zero, while an explicit `radius1` maps semantically. This lets
the rose retain a visible minimum outer radius without preparing normalized
radius DTOs. The angle-extending mark maps its default semantic-zero baseline
normally.

One private band resolver and one private sector path/boundary kernel serve
both orientations. The sector trace follows the same rounded D3 geometry used
for paint, so hit testing does not accept clipped cap corners. Radial bars
carry both arc geometry and bar semantic roles; motion resolves the bar role.
The lazy sector generator keeps this code out of other polar consumers. A
public generic ranged-sector mark remains deferred until another audited case
proves its channel and interaction contract.

Focused core tests cover both orientations, implicit and explicit intervals,
responsive and reversed ranges, source-scale immutability, invalid rows,
positive band requirements, exact paths, full corners, paint callback timing,
semantic motion role, and painted-geometry containment. Case tests cover both
revisions, raw lineage, fixed domains, exact paths and endpoints, palette and
stroke identity, stable keys, responsive radii, and removal of D3 generators
and the case-100 transform utility.

Browser conformance reports 100.0% geometry for case 97 and 99.9% for case
100, with clean visual and strict-type gates. Case 97 uses 60 authored lines
and 34.08 KiB gzip versus Recharts' 71 lines and 145.79 KiB; median mount is
0.20 ms versus 1.30 ms and median update is 0.10 ms versus 0.80 ms. Case 100
uses 63 lines and 34.08 KiB versus 76 lines and 145.09 KiB; median mount is
0.20 ms versus 1.60 ms and median update is 0.10 ms versus 1.10 ms. The
dedicated dual-orientation fixture is 21.38 KiB gzip under its 21.5 KiB cap;
packed runtime verifies four painted paths and both public option contracts.

## Completed phase-3 slice: hierarchy sunburst

Case 101 establishes an optional `sunburst` polar mark rather than a public
partition DTO or generic four-endpoint sector. Partitioning depends on the
enclosing polar layout's final radius, and every rendered node needs hierarchy
identity, aggregate value, direct source lineage, branch color, stable keys,
and geometry-backed focus. Those responsibilities belong together at the mark
boundary.

The implementation reuses two smaller private contracts. Tree, treemap, and
sunburst share flat path/parent hierarchy construction, canonical path IDs,
opaque explicit IDs, imputed ancestors, validation, metadata, and direct
lineage. Radial bars and sunburst share D3 sector path generation plus a
renderer-neutral, paint-derived interaction polygon. Layout-specific tree
links, treemap cells, and partition rings remain separate. This is the useful
first-principles split; a public generic hierarchy graph or sector mark would
erase important differences without another concrete consumer.

The mark's default outer radius fills all visible depths. Case 101 uses one
declarative `outerRadius` callback to preserve Recharts' allocation of a third
radial slot to the hidden structural root. Selection, palette, sweep direction,
hole ratio, two-pixel gap, white separators, and tooltip wording remain
case-owned. No D3 hierarchy object, arc DTO, generator, or case-owned layout is
present in the TanStack definition.

Focused tests cover path and explicit-parent input, opaque slash IDs, imputed
ancestors, direct lineage, descendant aggregation, invisible branches, sorting,
responsive and reversed radii, fixed pixel gaps, partial and reversed sweeps,
paint-derived focus geometry, and stable keys. The exact source is 7.00 KiB
gzip versus 1.97 KiB for D3 stratify plus partition, a 5.03 KiB increment under
its 5.1 KiB cap; packed runtime, declarations, and isolation pass. Browser
conformance reports 100.0% geometry with clean visual and type gates. TanStack
uses 58 authored lines and 28.24 KiB gzip versus Recharts' 91 lines and 132.17
KiB; median mount is 0.30 ms versus 0.70 ms and median update is 0.20 ms for
both.

## Completed phase-3 slice: Sankey composition

Both case 111 definitions now pass semantic node and link rows to the exact
optional `sankeyDiagram` mark. Sankey column allocation, link thickness, and
node padding depend on final pixel bounds, so an eager transform would either
freeze the aspect ratio or make the application copy chart layout. The mark
instead resolves the D3 layout inside the bounded mark lifecycle and gives its
`marks` callback immutable final-pixel node and link rows. That callback returns
ordinary `link`, `rect`, and `text` marks; Sankey is not a second renderer.

Three smaller private contracts are reusable outside Sankey:

- Force and Sankey share graph materialization, node-key validation, duplicate
  rejection, endpoint lookup, and missing-endpoint errors. Static force
  settlement remains eager while Sankey remains final-bounds responsive.
- Resolved composite marks can initialize and adopt several ordinary child
  marks at once, namespace child nodes and interaction points, merge
  non-positional channels and labels, and retain each child's focus/state
  behavior. Nested resolved layouts and invalid pixel channels remain errors.
- Parent and child motion policies use the same deterministic merge shared by
  polar composites.

The D3 mutation copy, relaxation, endpoint ordering, proportional widths, and
immutable Sankey node/link materialization remain one cohesive invariant.
Exposing any of those halfway would make authors rebuild the cleanup the mark
exists to own. There is no public generic graph-layout protocol, positioned
Sankey DTO transform, label/backdrop DSL, live flow controller, or vertical
orientation policy.

The basic case retains responsive width, padding, inset, short labels, and
theme paint. The income-statement case retains business-node order, profit and
cost tones, compact wording, label side, two-line display values, backdrops,
and title placement inside the visible child-mark callback. These are authored
presentation decisions rather than reusable Sankey layout.

Focused tests cover responsive D3 parity, frozen input, graph errors, raw-row
identity, immutable lineage, stable parallel-link keys, child composition,
and omission of Cartesian scales. Browser conformance at 320px and 640px has
no diagnostics, clean types and visual review, and 98.3% mean geometry: 99.9%
for Basic Sankey and 96.8% for Sankey Flow. Basic Sankey uses 146 authored
lines and 29.75 KiB gzip versus Recharts' 164 lines and 135.54 KiB. Sankey Flow
uses 655 lines and 31.54 KiB versus 607 lines and 137.16 KiB; its longer source
closure retains the explicit financial model and label presentation rather
than hiding them in a layout utility. The exact source is 6.94 KiB gzip versus
1.83 KiB for the D3 Sankey kernel, a 5.11 KiB increment under its 5.25 KiB
cap; the packed production consumer is 14.33 KiB. Exact source and published
exports, declarations, runtime, framework consumers, and retained-input
isolation pass. Every non-Sankey bundle fixture rejects both the adapter and
`d3-sankey`, closing F-164.

## Completed phase-0 slice: grouped error intervals

Case 14 needs no error-bar composite or new reducer API. The definition filters
to observations that contribute a body-mass value, groups those rows once with
public `groupBy`, and emits typed mean and sample-deviation outputs with direct
source lineage. Native `link`, two `tickY` marks, and `dot` share those rows;
their channel accessors compose the low and high endpoints without a custom
summary DTO or materialized coordinates.

The one-deviation estimator and zero-width singleton fallback remain explicit
case meaning. Core `deviation` keeps its standard sample semantics and returns
`NaN` below two finite values. This is the same reduction boundary used by the
rolling Bollinger case, but interval meaning and endpoint policy do not justify
a shared error-bar transform or mark.

Observable Plot can emit grouped `y1` and `y2` channels through `groupX`, but
each rule, cap, and point owns a separate mark-option transform. The reference
now demonstrates that native boundary directly; TanStack's reusable typed
group table is the clearer multi-mark composition in this case.

Focused tests cover exact reducer output, three intervals, six caps, three
means, contributing-row identity, filtered-input indexes, revision updates,
singleton policy, and removal of the shared manual transform. The standard
browser matrix passes at 98.0% geometry with clean visual and type gates.
TanStack and Plot each use 86 authored lines; TanStack is 33.04 KiB gzip versus
Plot's 85.12 KiB.

## Completed phase-2 slice: Tukey box marks

Case 15 now passes the raw Morley observations directly to `boxY`; `boxX`
provides the transposed horizontal form. The mark groups first-seen categories,
filters invalid numeric values, computes linearly interpolated quartiles,
applies 1.5-IQR Tukey fences, chooses the extreme observed values inside those
fences as whiskers, and retains strict outliers in global source order. Each
summary and outlier carries direct source rows and indexes.

The geometry is still normal mark composition. A whisker `link`, interquartile
`bar`, median `tick`, and outlier `dot` share one generic child-mark
initializer. The box body is the sole summary interaction target and anchors
at the median; outlier dots retain their own raw-row targets. Decorative
whiskers and medians do not multiply focus or tooltip candidates.

The repeated ordinary-child boundary is also public as `compositeMark`. It
preserves child datum and positional unions, namespaces channels, scene keys,
points, and motion, and rejects duplicate child IDs or children that schedule
their own resolved layout. Public composites retain each ordinary child's
interaction points. First-party marks can reuse the same internal kernel while
selecting the children that own interaction.

The useful subcontracts stop below the full box summary. Box marks reuse the
private sorted-quantile kernel behind the public quantile reducer, grouped
source indexes, lineage conventions, and existing link, bar, tick, and dot
marks. Quartiles, fences, whiskers, and outlier partitioning remain one atomic
private operation so separate calls cannot disagree after filtering or
grouping.

Focused tests cover exact Morley statistics, singleton, two-value, zero-IQR,
boundary, and invalid groups, horizontal transposition, global outlier order,
repeated initialization, derived motion data, raw-row identity, channel and
scene namespacing, and interaction ownership. Case source tests exclude
case-owned D3 quantiles and summary helpers. Exact composite and box bundle
fixtures protect the granular entry points.

## Completed phase-2 slice: inside-out wiggle stacks

Case 21 now passes the 1,708 tidy industry observations directly to `areaY`
with `layout: stack({ offset: 'wiggle', order: 'inside-out' })`. The definition
no longer pivots rows, invokes D3 in case code, clones source records, or
materializes `y1` and `y2` endpoints.

The existing `stackExtents` kernel is the reusable boundary. It already serves
vertical and horizontal areas, bars, `stackRowsY`, and `stackRowsX`.
Inside-out order delegates to D3's exported order primitive. Wiggle keeps D3's
dense zero-imputed calculation, then translates every completed endpoint once
so the global minimum start is zero. Missing cells affect layout but emit no
synthetic row. Position and series sequences remain first-seen, while reverse
changes geometric order without changing returned row order or lineage.

Observable Plot is not an endpoint-identity target here: its sparse handling,
peak ties, and wiggle phase differ from D3. The contract preserves the existing
TanStack/D3 streamgraph recipe while moving its reusable work into the normal
definition. Wiggle remains intended for nonnegative layers; no streamgraph
mark, wide-row transform, origin option, or implicit inside-out default is
introduced.

Focused tests cover canonical and reversed endpoints, zero origin, thickness,
sparse cells, duplicate rejection, first-seen positions, transposition, and
input-aligned lineage. The native case test covers raw object identity and the
removal of case-owned preparation. Inside-out/wiggle is tracked separately
from the still-planned anchored stack needed by case 26. Browser conformance
passes all six responsive/theme scenarios with clean types and 93.8%
diagnostic geometry. TanStack uses 54 authored lines and 37.73 KiB gzip versus
Plot's 53 lines and 91.65 KiB. The exact stack transform is 2.25 KiB gzip under
its 2.30 KiB budget.

## Completed phase-0 slice: Bollinger band composition

Case 22 needs no `bollingerY` mark or new statistical primitive. The definition
runs one public full trailing `window` over the selected AAPL rows, naming
the mean and sample-deviation outputs. `areaY` derives its lower and upper
channels directly from those outputs, while `lineY` consumes the same mean.
No helper clones the window rows or hides materialized interval fields.

The reusable boundary is already shared with case 14: public reducers,
transform ordering, direct source lineage, and channel accessors that compose
interval endpoints. The aggregation scopes are intentionally different—case
14 groups observations, while case 22 advances a trailing window. Case 19
shares the public trailing-window boundary, and case 61 shares ordinary
interval-area plus center-line composition. None needs a combined primitive.
The twenty-day scope, sample estimator, two-deviation multiplier, and financial
interpretation remain authored meaning. A generic mean-plus-spread transform
would obscure those choices and duplicate the current reducer composition.

Focused tests cover both revisions, exact D3 mean/deviation parity, strict
twenty-row lineage, endpoint-row identity, shared area/line data, direct
channel arithmetic, and removal of the helper DTO. Browser conformance passes
all six responsive/theme scenarios with clean types and 97.5% diagnostic
geometry. TanStack uses 55 authored lines and 38.21 KiB gzip versus Plot's 44
lines and 93.69 KiB.

## Completed phase-2 slice: anchored stacks

Case 26 groups raw survey observations once with public `groupBy`, then passes
the typed counts directly to `barX` with
`stack({ order, anchor: { series: 'Neutral', fraction: 0.5 } })`. The case no
longer advances a signed cursor or materializes `x1` and `x2` rows.

The existing `stackExtents` kernel is the shared boundary, as it is for case
21, ordinary stacked bars and areas, and both public stack-row transforms.
Anchor mode first lays out ordered nonnegative lengths with dense zero-imputed
cells, then translates every completed interval at a position by the selected
series fraction. Missing anchor cells retain their ordered boundary without
emitting synthetic rows. Negative inputs and normalize, center, or wiggle
offsets are rejected because their anchoring semantics are ambiguous.

Response filtering and order, neutral-series choice, anchor fraction, colors,
and axis language remain authored survey meaning. No Likert mark, response
schema, signed-count transform, cursor helper, or broader offset protocol is
warranted. The reusable API stops at a named series and a scalar fraction;
per-position accessors or arbitrary targets would hide application policy and
have no second consumer.

Focused tests cover exact geometry, missing anchor cells, fraction boundaries,
invalid combinations, transposition, lineage, grouped counts, and source
closure. Packed runtime and declaration contracts cover the exact stack entry
and universal type parity; the stack fixture retains both wiggle and anchored
branches. Browser conformance passes with clean types and 94.2% diagnostic
geometry. TanStack uses 91 authored lines and 35.41 KiB gzip versus Plot's 99
lines and 86.83 KiB. Reviewed anchored-stack retention moves the exact stack
fixture to 2.61 KiB gzip and the representative mark bundle to 62,809 minified
bytes / 23,354 gzip bytes.

## Completed phase-2 slice: waterfall transform

Case 29 derives adjacent gasoline-price changes with the existing ordered
two-row `window` and `difference` reducer, then passes those rows through the
eager `waterfall` transform. Native `barY` consumes `start` and `end` directly.
The case no longer imports D3 pairs, advances a mutable cursor, clones a last
observation into a synthetic total, or defines a waterfall DTO.

The shared logic stops at existing transform infrastructure: `transformValues`
resolves the signed contribution, `materializeGroups` preserves first-seen
groups, `orderedIndexes` supplies stable semantic order, and all eager
transforms use the same direct-lineage contract. Case 22 shares the window
boundary; case 26 and ordinary stacks also derive intervals, but their kernel
accumulates concurrent series within each position. Waterfall instead advances
sequential categories across positions, so routing it through `stackExtents`
or exposing a generic interval cursor would obscure the data model.

`waterfall` atomically owns cumulative endpoints, sign classification,
optional zero-based totals, overflow rejection, and aggregate lineage. A total
is a discriminated synthetic row containing only group and derived fields, not
an arbitrary source datum. The year window, adjacent difference, total label,
palette, currency wording, and zero rule remain authored meaning. No waterfall
mark, generic synthetic-row protocol, initial-baseline option, or second
cumulative reducer is warranted from this case.

Focused tests cover ascending and descending order, independent groups, zero
and invalid values, immutable input, step and total lineage, reserved group
names, overflow, exact case geometry, raw-window lineage, and source closure.
Browser conformance passes with clean types and 96.7% diagnostic geometry.
TanStack uses 95 authored lines and 36.10 KiB gzip versus Plot's 77 lines and
85.44 KiB. The exact waterfall transform is 1.02 KiB gzip under its 1.10 KiB
budget; the transform suite is 7.16 KiB under 7.25 KiB.

## Completed shared foundation: transposed lines

Cases 31 and 33 need ordinary connected paths whose numeric value is on x and
whose independent value is on y. `lineX` now provides that strict transpose of
`lineY`. Both orientations share grouping, invalid-row gaps, inferred keys,
paint, curve output, interaction points, focus affinity, states, and motion;
only channel defaults, numeric validation, scale-domain contribution, and
independent-axis affinity vary by orientation.

The useful extraction is the shared line pipeline, not a public orientation
utility. Regression retains its data-space statistical kernel; Difference
retains its resolved-screen crossing kernel. Both compose `lineX` with existing
marks. Reimplementing either algorithm as a line option would mix statistical
or clipping policy into base path geometry, while duplicating the full line
implementation would let the two orientations drift.

Focused SVG, Canvas, type, Date, categorical, grouping, gap, identity, and
renderer tests pass. Packed root, universal, exact-subpath, declaration, and
production consumers pass. The shared orientation seam adds 193 minified bytes
and 71–78 gzip bytes to existing line consumers; lineX-specific channel
extraction still tree-shakes. Its isolated static-SVG fixture is 16.62 KiB gzip
under a 16.8 KiB budget.

## Completed phase-2 slice: linear regression marks

Case 31 now passes the selected car rows directly to `linearRegressionY`.
`linearRegressionY` and `linearRegressionX` own centered least-squares fitting,
optional grouping, semantic-domain sampling, Student-t fitted-mean confidence
bands, degenerate-group omission, and aggregate source lineage. They compose
ordinary area and line children; only the fitted line participates in
interaction.

The reusable boundary is composition, not a generic statistical mark utility.
Both orientations share `lineX`/`lineY`, `areaX`/`areaY`, composite namespacing
and motion, first-seen grouping, and lineage. Centered covariance, residual
error, Student-t quantiles, and confidence intervals remain one private
regression kernel. Difference shares none of that math.

Focused tests cover numeric and temporal domains, groups, stability,
confidence intervals, transposition, gaps, identity, interaction, and motion.
Browser conformance passes at 96.5% diagnostic geometry with clean types.
TanStack uses 63 authored lines and 37.49 KiB gzip versus Plot's 46 lines and
88.95 KiB. The exact regression fixture is 22.47 KiB gzip, 5.82 KiB over an
ordinary line plus static SVG and below its 6 KiB cap. Exact exports,
declarations, packed runtime, docs, TypeScript, and bundle isolation pass.

## Completed phase-2 slice: difference marks

Case 33 now applies the public rolling `window` transform and passes those rows
directly to `differenceY`. `differenceY` and `differenceX` own sign runs,
stable lobe identity, exact shared crossings, decorative positive and negative
areas, and two interactive raw boundary lines. The case no longer materializes
crossing rows, sign segments, or rolling-average DTOs.

Crossings are a resolved-layout concern, not unconditional data-space
interpolation. Difference maps both straight boundary segments through the
final positional scales, solves their rendered intersection, and inverts that
point to semantic values before adopting ordinary area and line children.
This reuses the resolved-layout adoption seam established for Hexbin and
Delaunay and remains exact for invertible log, power, symlog, reversed,
numeric, and temporal scales. Non-finite mapped rows become shared gaps.

The other shared pieces are `lineX`/`lineY`, `areaX`/`areaY`, composite
namespacing, child interaction filtering, motion, grouping, inferred keys, and
lineage. Regression shares those structural primitives but not the crossing
algorithm. The case's twenty-day mean reuses the same `window` contract as the
moving-average and Bollinger cases; its period and output name remain authored
analytical meaning.

Focused tests cover both orientations, linear, Date, and nonlinear crossings,
zero plateaus, semantic and mapped gaps, groups, keys, fill suppression,
identity, states, motion, lineage, and non-invertible scales. Browser
conformance passes at 89.8% diagnostic geometry with clean types. TanStack uses
68 authored lines and 42.90 KiB gzip versus Plot's 89 lines and 92.70 KiB. The
exact Difference fixture is 23.03 KiB gzip, 6.37 KiB over an ordinary line plus
static SVG and below its 6.5 KiB cap. Exact exports, declarations, packed
runtime, docs, TypeScript, and bundle isolation pass.

## Completed phase-0 slice: faceted distributions

Case 51 needs no new primitive. It groups the existing `binX` transform by
species, normalizes each species count with `normalize({ basis: "sum" })`, and
passes the resulting rows to ordinary `facet` and `rect` marks. The D3 bin
builder, custom bin DTO, manual denominator, and hidden preparation helper are
gone.

`binX` owns fixed intervals, counts, and aggregate raw-row lineage. `normalize`
owns the explicit per-species denominator and retains each aggregate bin as its
source. `facet` owns responsive panels. Species order, threshold values,
zero-bin display, shared domains, percent formatting, and paint remain authored
meaning; no facet-local reducer or histogram mark is warranted.

Focused revision tests cover 16 nonempty bins, explicit facet order, fixed
500-gram boundaries, per-species totals and proportions, strict types, and
nested identity through normalized rows and aggregate bins to raw penguins.
Browser conformance passes visual, geometry-count, paint, containment,
accessibility, and type gates. TanStack uses 95 authored lines and 35.71 KiB
gzip versus Plot's 56 lines and 87.89 KiB.

## Completed phase-2 slice: coordinated views

Case 57 now uses three normal chart definitions: a scatterplot, an x histogram,
and a y histogram. Public `binX` and `binY` transforms produce the marginal
rows with aggregate lineage; ordinary `dot` and `rect` marks render them.
`viewGrid` places the definitions in named fixed and flexible tracks, shares
the two semantic position scales, and leaves each histogram's count scale
independent. The D3 bins, normalized counts, hard-coded data-space reservations,
hidden ticks, and separator rules are gone.

The reusable boundary is complete-view adoption, not another resolved child
mark. Hexbin and Difference derive geometry inside one parent scale pair.
`viewGrid` compiles independent child scales and scenes, resolves child guide
margins, then aligns plot endpoints and embeds each scene. It shares one
renderer-neutral adoption helper with facets for point offsets, stable
namespaces, mark IDs, focus, interactions, and states. Host behavior remains
owned by the outer definition; unsupported child resources and guide motion
fail explicitly.

Focused tests cover shared and aligned scales, responsive tracks, raw and
aggregate lineage, stable identity, namespacing, focus and state remapping,
invalid graphs, and authored-source closure. Exact package, docs, TypeScript,
and bundle gates pass. Browser conformance passes at 95.3% diagnostic geometry
with clean visual and type gates. TanStack uses 165 authored lines and 38.58
KiB gzip versus Plot's 129 lines and 84.80 KiB. The isolated coordinated-view
fixture is 20.88 KiB gzip, a 3.90 KiB increment below its 4 KiB cap.

## Completed phase-0 slice: extrema annotations

Case 58 needs no extrema or annotation primitive. Public `select` returns the
original minimum and maximum AAPL rows, and separate ordinary `dot` and `text`
marks render each role. Label wording, anchors, and offsets stay on the text
marks. The annotation DTO, row spreads, combined helper, and presentation
fields in prepared data are gone.

This reuses the eager `select` transform already used for endpoints and profile
selection. Its reusable contract is raw-row identity, deterministic first-tie
selection, grouping, and finite-value handling. It shares no resolved layout,
binning, composite geometry, or view composition with the preceding cases; the
five explicit layers are the chart grammar.

Focused tests prove exact datum typing, reference identity, stable timestamp
keys, two point and two label roles, label placement, and authored-source
closure. Browser conformance passes at 98.5% diagnostic geometry with clean
visual and type gates. TanStack uses 76 authored lines and 37.05 KiB gzip
versus Plot's 74 lines and 90.42 KiB.

## Completed phase-0 slice: quantile ribbons

Case 61 now groups raw industry observations once with public `groupBy` and
three named `quantile` reducers. The same aggregate rows feed an ordinary
`areaY` ribbon and `lineY` median. The D3 rollup, case-owned summary DTO,
optional-result guards, flattened output, and reconstructed dates are gone.

This is the reducer and lineage seam already used by error bars and grouped
summary bars. Grouping preserves the first source `Date`, raw rows, and source
indexes; quantile probabilities remain explicit authored analytical meaning.
The range area plus center line is ordinary mark layering. Box plots share the
private empirical-quantile kernel but correctly retain their coupled quartile,
fence, whisker, and outlier policy. Regression distribution math, Difference
crossings, resolved layout, binning, and view composition are unrelated.

Focused tests cover 122 ordered monthly groups, D3 interpolation parity,
quantile order, all 1,708 source rows exactly once, aggregate identity shared
between marks, stable timestamp keys, empty and nonfinite groups, exact types,
and authored-source closure. Browser conformance passes at 96.9% diagnostic
geometry with clean visual and type gates. TanStack uses 50 authored lines and
38.34 KiB gzip versus Plot's 47 lines and 92.64 KiB.

## Completed phase-2 slice: ridgeline profiles

Case 62 now keeps grouped `binX` and `normalize({ basis: 'max' })` in the chart
definition. The resulting bins retain raw episode lineage, normalized rows
retain their immediate bins, and `ridgelineY` consumes semantic rating centers,
season categories, and `[0, 1]` heights. Numeric surrogate baselines, fixed
data-space offsets, a manual y domain, rounded tick lookup, and a fixed left
margin are gone. Ordinary `ruleY`, point-scale ticks, color, and the D3 curve
bridge remain visible definition concerns.

The reusable first-principles seam is mapped category spacing. One private
helper finds the smallest positive distance across a complete resolved scale
domain. Band marks use it for inferred bandwidth; `ridgelineY` and
`ridgelineX` use it for profile displacement in category-step units; the next
mirrored violin case can reuse it. The ridge mark does not own binning,
normalization, density estimation, axes, or category selection, and it needs no
composite or resolved-child layout dependency.

Focused tests cover numeric and temporal profile positions, numeric and string
categories, point and band scales, empty domain slots, both orientations,
overlap, gaps, curves, paint order, source identity, safe shared states, keyed
motion, exports, and both Case 62 revisions. Case tests prove 72 bins, nested
normalize-to-bin-to-episode identity, semantic season ticks, stable keys, and
320/640/960px resolved offsets. Exact packed runtime, declarations, production
isolation, documentation, and framework adapter gates pass. The isolated
fixture is 17.35 KiB gzip, a 715-byte increment below its 0.75 KiB cap. Browser
conformance passes at 94.1% diagnostic geometry with clean visual and type
gates. TanStack uses 103 authored lines and 36.23 KiB gzip versus Plot's 117
lines and 92.77 KiB.

## Completed phase-2 slice: violin profiles

Case 63 now keeps grouped `binY`, `normalize({ basis: 'max' })`, and grouped
`median` reduction in the chart definition. The prepared rows retain their
immediate bins and raw penguin observations. `violinY` consumes semantic
species, body-mass bin centers, and normalized widths; ordinary `tickY` and
`dot` marks consume the median summaries. Numeric centers, fabricated `x1` and
`x2` endpoints, a numeric x domain, rounded label lookup, and both TanStack
dependencies on the Plot reference helpers are gone.

The shared first-principles seam stops at resolved category spacing. Band,
ridgeline, violin, and category-relative ticks use the complete point or band
domain plus a bounded singleton fallback. The new tick `span` option expresses
summary length in those same units. Ridge and violin path assembly stays local
because their topology and interaction coordinates differ; combining their
segment loops would require mode flags or callbacks and make the ownership
boundary harder to read. The violin mark does not estimate density, choose
boundaries, normalize, calculate medians, or depend on composite layout.

Focused tests cover both orientations, numeric and temporal positions, point
and band categories, empty domain slots, singleton fitting, exact D3 area
topology, gaps, states, keyed motion, exports, and both Case 63 revisions. Case
tests prove 48 normalized bins, exact grouped maxima and medians, complete
normalize-to-bin-to-observation lineage, semantic species ticks, stable keys,
and symmetric violin and median geometry at 320/640/960px. Packed runtime,
declarations, production isolation, React Native, seven framework adapters,
and documentation pass. The isolated fixture adds roughly 0.72 KiB gzip below
its 0.75 KiB cap. Browser conformance passes at 97.9% diagnostic geometry with
clean visual and type gates; TanStack uses 122 authored lines and 37.79 KiB
gzip versus Plot's 155 lines and 93.46 KiB.

## Completed phase-2 slice: mosaic intervals

Case 64 now keeps its grouped response counts visible in the definition, then
passes the 25 unique question/response rows through `mosaicY`. The transform
owns the two related allocation stages: question totals determine normalized x
widths, and response counts determine normalized y intervals within each
question. `select` derives one existing row per question for labels; ordinary
`rect` and `text` marks own all rendering. The TanStack source no longer imports
the local reference layout or D3 cumulative utilities.

The reusable seam is an overflow-safe proportional-interval allocator shared
with polar pie. Mosaic applies it to outer marginals and conditional inner
groups; pie applies it to ordered angular weights. Waffle does not share this
kernel because rounded unit boundaries, one-to-many fragments, and resolved
pixel packing are its defining contracts. The public mosaic API stays eager and
data-space only, with transposed `mosaicY` and `mosaicX` functions rather than a
custom mark or a general stack dependency.

Focused tests cover both orientations, explicit and first-seen order, sparse
pairs, zero and invalid values, duplicate rejection, Date and accessor keys,
overflow-safe geometry, types, exports, nested lineage, exact survey totals,
stable keys, and 320/640/960px ordinary marks. Package, declaration, production
isolation, React Native, adapter, documentation, and TypeScript gates pass. The
isolated transform is 1.95 KiB gzip below its 2.1 KiB cap. Browser conformance
passes at 96.7% diagnostic geometry with clean visual and type gates; TanStack
uses 103 authored lines and 34.35 KiB gzip versus Plot's 146 lines and 83.62
KiB.

## Completed phase-0 slice: population pyramid

Case 71 needs no new transform or mark. The definition filters to known sex
categories, uses `groupBy` to count each species/sex pair with raw-observation
lineage, and supplies one signed x accessor to a single `barX` mark. The normal
diverging stack places male counts left of zero and female counts right of zero;
the scale keeps its symmetric domain and absolute tick formatting.

This is the same reusable seam already proven by the diverging Likert case:
aggregation policy belongs in `groupBy`, sign or anchor policy belongs in the
quantitative channel or stack options, and bars own the interval geometry. The
former wide `PenguinSpeciesCount` DTO, manual `Map`, second negation pass, and
duplicate male/female bar definitions are unnecessary. Sex selection, colors,
the symmetric comparison domain, and display labels remain case semantics.

Focused tests cover both revisions, exact six-group counts, source identity,
signed endpoints, series order, complete lineage, stable responsive keys, the
shared zero baseline at 320/640/960px, types, and the authored-source boundary.
Browser conformance passes at 99.1% diagnostic geometry with clean visual and
type gates; TanStack uses 72 authored lines and 33.99 KiB gzip versus Recharts'
102 lines and 151.05 KiB.

## Completed phase-0 slice: snapped axis pointer

Case 80 now composes its interaction in the normal chart definition. Grouped x
focus owns nearest-date snapping and one point per industry; `focusGuideX` owns
the full-height dashed rule; the native tooltip owns ordered rows, swatches,
formatting, collision-aware placement, and leave/cancel cleanup; `colorLegend`
owns the semantic series key. The explicit infinite focus distance is retained
as the case's continuous-snap policy.

This reuses two already-proven seams rather than introducing an `axisPointer`
type. Case 35 supplies the grouped-focus and tooltip composition. Case 117
supplies the renderer-neutral focus guide and stable retarget lifecycle. The
selected industries, UTC window and formatting, colors, rule style, tooltip
order, and interaction reach remain authored policy. Case 87 composes the same
focus lifecycle inside one view-grid host; a continuous value cursor remains a
separate problem for case 88.

Focused tests cover exact datum types and identity, hidden guide candidates,
one stable full-height rule across dates and 320/640/960px widths, semantic
legend order, native grouped tooltip rows and swatches, clear behavior, and the
absence of React state, a second SVG, `onRender`, or manual tooltip placement.
The standard browser matrix passes both revisions, light and dark themes, all
three widths, pointer leave, touch cancellation, edge containment, visual and
strict type gates at 98.9% diagnostic geometry. TanStack uses 397 authored
lines and 39.33 KiB gzip versus ECharts' 446 lines and 173.77 KiB.

## Completed phase-4 slice: interactive categorical legend

Case 81 now uses one grouped `lineY` mark over the raw industry rows. A
controlled signal carries the application's visible-series snapshot into
`interactiveColorLegend`; the legend proposes complete replacements in color-
domain order. Scale resolution still sees every row, so hidden series keep
their colors and position domains while their geometry and focus points are
omitted from the final scene.

The reusable boundary is smaller than a general selection system. The signal
is only a typed value and callback. The legend owns categorical toggle policy,
shared categorical item resolution and wrapping, additive top/bottom layout,
stable native browser buttons, pressed state, focus preservation, event
isolation, teardown, and a static scene fallback. The React shell retains the
snapshot and persistence policy. A separate `z` channel continues to mean that
grouping and color are independent, so the interactive legend does not infer a
selection relationship there.

Focused tests cover raw identity and types, full color and position domains,
all/one/zero visible series, domain-ordered change reasons, static fallback,
bottom-axis coexistence, SVG and Canvas hosts, stable focus through controlled
updates, teardown, exports, and root/universal isolation. The standard browser
matrix passes both revisions, light and dark themes, 320/640/960px layouts,
click, Enter, Space, 44-pixel targets, and 98.6% geometry similarity. TanStack
uses 242 authored lines and 93.76 KiB versus Recharts' 357 lines and 155.21
KiB. The signal is 0.09 KiB gzip; the interactive legend adds 2.07 KiB over the
ordinary DOM host under a 2.5 KiB incremental cap.

## Completed phase-4 slice: controlled keyed selection

Case 82 now places point activation and selected geometry in the normal chart
definition. `keyedSelection` maps the host's pointer or keyboard activation to
a stable application key through the same `controlledSignal` boundary proven
by Case 81. `whenSelected` authors the orange overlay as an ordinary full-data
dot mark, then filters its final scene after domains resolve. The overlay
therefore preserves the complete positional domains but contributes no second
focus or activation point.

The deeper shared primitive is point-owned post-domain scene filtering, not a
chart-family transform. The interactive legend filters by categorical color;
selection filters by semantic key. Both act after domains and can keep or
remove interaction points. The Waffle work established that one logical point
may own several scene fragments, so the shared filter keeps every fragment for
a matching point. Hexbin contributes the same stable output-datum and key
requirement, but none of its binning or resolved layout belongs in selection.
Focus-state transition policy also remains separate from persistent selected
state.

That reuse exposed a lower-level identity requirement. Exact point keys and
structural scene descendants must not share a prefix lookup: authored keys such
as `a:dot` and `a:shaft` can otherwise collide with generated line and arrow
fragments. Generated string keys are now length-delimited, semantic ordering is
separate from identity encoding, and one shared scene-point lookup serves
selection, focus, state, composition, and scene adoption. Singular decorative
fragments may carry `pointOwner` without becoming interaction points. Box
whiskers and medians, line dots, labels, and composed child geometry reuse that
contract. Multi-point bands and fills deliberately do not; they need a future
point-set form only if a concrete filtering case demands it.

The React shell still owns the selected snapshot, semantic HTML table, live
status, clear button, persistence, and case-specific representative rows and
labels. Those are product UI and data-model choices, not chart marks. Focused
controller and case tests cover typed select/clear reasons, pointer and
keyboard activation, nullish-key exclusion, decorative SVG output, unchanged
domains and point counts, multi-fragment Waffle matching, and stable selection
through row reordering. The roadmap intentionally remains `app-composed`: the
Charts-owned portion is declarative, while the linked table workflow warrants
its custom application composition.

## Completed phase-4 slice: controlled horizontal brush

Case 83 now places its visible time range and complete pointer, touch,
cancellation, snapping, and keyboard lifecycle in the overview definition with
the optional `brushX` behavior. The behavior consumes a controlled semantic
range, resolves against the final x scale and plot bounds, paints a
renderer-neutral fallback, and mounts the same contained DOM control over SVG
or Canvas. The TanStack case no longer imports D3 Brush or Selection, creates a
second SVG, copies scene coordinates, installs effects, or prepares a separate
selected-row array.

The detail definition uses `keyedSelection` for its selected observation. Two
ordinary chart hosts remain warranted instead of `viewGrid`: detail and
overview use different rows, x domains, y domains, axes, margins, heights, and
behaviors. Their React layout and shared accepted window are application
composition, not missing view-composition machinery.

The reusable first-principles seam is a one-dimensional interaction axis, not
the D3 controller. It maps values through a resolved scale, clamps pixels,
inverts continuous number or Date scales, snaps ordered candidates, normalizes
semantic ranges independently of reversed pixel direction, and provides stable
indices and steps for accessible handles. D3 Brush remains a private optional
DOM lifecycle implementation. Zoom and scale-bound handles can reuse the axis
kernel without inheriting brush selection policy or DOM structure.

The application still owns the accepted four-month window, the rule that
expands a click or drag midpoint into that window, the detail/overview layout,
the native range input, status text, and persistence across revisions. Those
are linked-view and product policies rather than brush mechanics. Static SVG
and React Native keep the visual fallback; native interaction requires an
application control.

Focused scale, behavior, renderer, type, export, and case tests cover explicit
and continuous values, reversed mappings, candidate validation, static and DOM
output, keyboard commits, controlled updates, unique control identity,
renderer replacement, and teardown. The quick browser matrix passes every
pointer, touch, cancellation, semantic-control, update, geometry, and strict
type scenario across both implementations at 99.9% diagnostic geometry.

Case 89 is the second proof of the same boundary. Its definition supplies the
12 observed UTC dates to `brushX`, so the interaction axis maps candidate
positions and nearest-snaps without copying or inverting the authored scale.
The behavior owns forward and reverse drags, live paint, semantic handle
indices, Arrow/Home/End input, pointer and touch cancellation, controlled
commit, resize synchronization, and teardown. The 591-line React controller,
second SVG, D3 imports, copied scale, manual ARIA decoration, and case-owned
gesture listeners are gone.

Monthly cohort selection, the accepted range snapshot, and the live AAPL
summary remain application work. Focused Case 83, Case 89, interaction-axis,
and brush tests pass, including controlled rejection, touch recovery, reversed
scales, focus retention, and shortcut metadata. Case 89's quick paired browser
matrix passes every drag, keyboard, cancellation, update, visual, and type
scenario at 98.7% diagnostic geometry. TanStack uses 558 authored lines and
51.39 KiB gzip versus ECharts' 796 lines and 187.44 KiB.

## Completed phase-0 slice: pinned nested-chart tooltip

Case 84 now uses one keyed dot mark with an inline
`{ focus: "primary", pinned: true }` state. The definition owns sticky
activation, pin-only visibility, structured accessibility content, ordered
portal placement, collision handling, Escape, dismissal, focus return, and
state restoration. The React adapter body receives the pinned point and mounts
one ordinary nested bar chart. The case no longer filters a selected-row mark,
positions an `aside`, shrinks the main plot into a narrow panel, or installs
selection, Escape, measurement, and focus-restoration effects.

The audit exposed two shared lifecycle gaps. Same-point pointer pinning updated
the tooltip without repainting inline mark states, and clearing focus entirely
could leave a no-transition state painted because SVG and Canvas did not retain
state-paint ownership. Forced same-point updates now repaint focus and tooltip
together, and both surfaces restore the base scene after null focus. A
definition-owned `visibility: "pinned"` policy suppresses the transient shell
and adapter body without framework DOM mutation.

The application still owns the five representative penguins, the four-row
same-species cohort policy, child-chart definition, close-button presentation,
and child accessibility text. Those are domain and framework composition, not
tooltip geometry. Focused definition, host, adapter, SVG, and Canvas tests
cover stable semantic keys, pointer pin/unpin, pin-only mounting, accessible
dialog semantics, nested-host cleanup, and base-paint restoration. The quick
browser matrix passes hover, click, keyboard and button dismissal,
second-click release, pinned revision updates, and one nested host across both
revisions and widths at 99.6% diagnostic geometry.

## Accepted phase-0 boundary: scrollable resource lanes

Case 85 already expresses every chart-space concern in the normal definition.
One ordinary `rect` mark owns task intervals, resolved UTC and band scales own
projection, the color scale owns status paint, and native focus and tooltip
own task inspection. Unique task `id` fields use the shared inferred-identity
contract from Case 82 and F-131; a focused regression proves that changing an
interval endpoint does not change its point key.

The remaining custom work is host composition. The application chooses a wide
content surface, places it in a browser-owned horizontal scroll viewport,
keeps lane labels and the status legend fixed, preserves scroll on updates,
reveals a focused offscreen task, and provides a persistent task summary and
complete schedule alternative. The fixed rail now projects label centers from
the chart's resolved y scale rather than constructing a second band scale. The
duplicated reveal calculation is one case-private DOM helper shared by the
TanStack and ECharts adapters.

No renderer-neutral layout, brush-axis, or scroll behavior follows from this
case. Resolved-layout children cannot create a DOM sibling outside the
scrolling SVG, and browser scrolling needs no inversion, snapping, or chart
gesture lifecycle. Highcharts exposes the comparable behavior as a host-level
[`scrollablePlotArea`](https://api.highcharts.com/highcharts/chart.scrollablePlotArea)
that keeps unaffected axes and legends fixed. That is evidence for an optional
adapter seam if another real consumer repeats the complete invariant, not for
a mark or transform now.

Scene-to-client conversion, viewport clipping, and geometry sampling in the
case driver are conformance tooling rather than application authoring. The
same minimum-one point-cloud bounds recur in cases 80 and 86–91; cases 80 and
86 now prove one shared harness helper, and the remaining cases can adopt it
during their audits. It must not be counted as a Charts definition gap.
Focused definition and roadmap tests plus the root typecheck pass. The quick
browser matrix passes native wheel scrolling, fixed rail and legend visibility,
keyboard focus reveal, persistent details, scroll-preserving revisions, visual
and strict type gates at 99.7% diagnostic geometry.

## Accepted phase-0 boundary: streaming window preservation

Case 86 now exposes one normal `streamingWindowDefinition`. The builder bounds
the feed rows to the semantic viewport before creating marks because the
visible window determines y-domain inference, keyboard candidates, and tooltip
rows. Passing complete history with `clip: true` would only clip paint; hidden
extremes and focus points would still enter the scene.

The line and styled observation dots deliberately remain separate layers. The
exact `decorative(mark)` compositor preserves a layer's channels, domains,
resolved layout, labels, motion, and painted scene while removing interaction
ownership. The line therefore contributes geometry and domains without adding
a second focus target; the dots own one point per date. Pointer-tooltip and
grouped-tooltip cases 34 and 35 use the same boundary. Focus-conditional or
stateful marks are rejected rather than silently losing behavior.

Complete history, deterministic arrival, locked/latest/all policy, controls,
and live announcements remain application-owned. `streamingViewportForMode`
and `streamingStatus` are small case-local policy helpers shared by the
TanStack and ECharts shells; they are not a chart transform or controller.
Inclusive source filtering also remains ordinary `Array.filter` because the
meaning of the window differs across temporal applications.

The repeated line-geometry driver calculation is tooling. A shared
`clientPointBounds` helper now covers local or scene coordinates, client
offsets, scaling, degenerate samples, and paint for cases 80 and 86. Target
resolution stays local because it carries view and focus semantics.

## Completed phase-0 slice: entrance motion

Case 112 needs no new mark, transform, or motion grammar. Its ordinary `barY`
and `lineY` marks own geometry and stable datum keys. The chart-level tween,
per-datum entrance stagger, featured-row exception, and independent line timing
are already visible in `motionEntranceDefinition`.

Duration, easing, stagger controls, replay, host sizing, renderer remounting,
and conformance observation remain application shell. They change how the demo
is operated, not what the chart definition means. A public replay or settling
API is not justified by this case.

The repeated conformance plumbing did justify a smaller tooling seam. Cases
112–117 now share one renderer-state reader, and cases 112–116 share one
animation-frame settle helper. The helper knows only the renderer's diagnostic
state attribute and timeout; it does not absorb chart policy or control logic.

Focused tests prove exact datum typing and identity, ordinary scene geometry,
the chart/mark/datum timing cascade, the definition's lack of DOM/custom-mark
work, and the shared completion/timeout contract. The full responsive light and
dark browser matrix passes visual and type gates with 93.5% final-frame geometry
similarity. Target-specific replay timing remains in renderer tests because the
paired Observable Plot reference is static.

## Completed phase-0 slice: keyed motion updates

Case 113 needs no update-layout or spring primitive. Its two ordinary marks
have explicit IDs and stable datum keys; chart, mark, and per-datum transition
policy remains in `motionUpdatesDefinition`. Reordering, insertion, removal,
and interruption therefore exercise the normal keyed motion renderer.

Stage selection, automatic advance, controls, and renderer hosting remain the
application shell. They select source rows and operate the demo rather than
define chart geometry. The case shares only the benchmark motion-state reader
and settle loop with neighboring examples; a broader demo-controller utility
would hide rather than clarify ownership.

Focused tests cover raw identity and stable keys across every stage, real
enter/update/exit contexts, tween and spring policy, partial overrides, and the
source boundary. The standard browser matrix passes visual and type gates with
94.7% final-frame geometry. TanStack uses 499 authored lines and 37.19 KiB gzip
versus Observable Plot's 80 lines and 92.07 KiB; the larger source includes the
explicit interactive demo shell.

## Completed phase-0 slice: spring line motion

Case 114 also uses the current definition API. Native `lineY` paths retain
stable series and datum identity across stages. The chart owns the base spring,
while the comparison series declares only its different mass and inherits
stiffness and damping through the normal motion cascade. No line-morph adapter
or case-owned geometry is needed.

Controls, stage timing, interruption, and replay remain application-owned.
Focused tests cover exact row identity, stable keys, spring/tween inheritance,
path retargeting with momentum continuity, and the absence of custom marks.
The standard browser matrix passes visual and type gates at 97.2% geometry.
TanStack uses 292 authored lines and 33.99 KiB gzip versus Observable Plot's 76
lines and 89.70 KiB.

## Completed phase-0 slice: definition-owned motion

Case 115 is the complete current-API proof rather than a request for another
primitive. `definitionMotionDefinition` owns the chart default, mark and datum
exceptions, mixed tween and spring transitions, and axis, tick, tick-label,
and axis-label overrides. The renderer is constructed once with no semantic
timing callback.

Stages, timers, interruption, replay, controls, and the renderer host remain
application shell. Focused tests cover exact types and row identity, stable
keys, the whole definition cascade, real spring interruption continuity, and
the source boundary. The standard browser matrix passes visual and type gates
at 95.3% final-frame geometry. TanStack uses 298 authored lines and 36.32 KiB
gzip versus Observable Plot's 79 lines and 92.06 KiB.

## Accepted phase-0 boundary: fixed-topology geometry morph

Case 116 warrants one inline custom mark. Bars, rose sectors, donut sectors,
and bubbles can each be expressed with built-in marks, but those marks emit
different element types or incompatible path skeletons. Replacing them would
produce enter/exit motion and discard the per-coordinate velocity that this
example is explicitly testing.

`geometryMorphDefinition` still owns stable source keys, paint, chart spring
defaults, entrance stagger, and the violet mass exception. The custom mark owns
only responsive sampling into one 48-point closed polygon per datum and the
corresponding interaction anchor. It emits `SceneArea.points`; shared renderers
serialize the path for SVG, Canvas, and native targets. Controls, modes,
interruption, replay, and renderer hosting remain application shell.

Focused tests prove exact types and raw identity, stable keys across all four
modes, finite in-bounds 48-point topology, one renderer path skeleton,
definition-local motion, interrupted path-token momentum, and the source
boundary. The standard browser matrix passes visual and type gates at 87.4%
final-frame geometry. TanStack uses 488 authored lines and 32.91 KiB gzip
versus Observable Plot's 52 lines and 85.30 KiB. A generic normalized-morph
adapter remains monitoring until another real case repeats the topology work.

## Completed phase-4 slice: focus guides

Case 117 now expresses its crosshair as `focusGuideX`. The exact optional mark
owns x/y rules, marker, measured axis labels, raw datum identity, and one stable
retarget structure. The shared focus lifecycle keeps candidate geometry out of
initial paint, enters at the first active position, preserves spring velocity
across rapid retargets, and structurally exits on clear. Candidate ownership is
explicit and collision-safe; it does not infer hierarchy from colon-delimited
keys. Primitive source rows match by value and source position.

Source line and dot states keep their own `focusSpring`; the guide keeps its
distinct `guideSpring`. State transitions are scoped by owning mark ID rather
than overriding every focus-layer element. The case retains only the renderer
host and live status outside the definition, mounted beside the renderer-owned
chart root. The second SVG, frame loop, scalar sampler, resize repaint,
visibility controller, and teardown code are gone.

Combined focus, motion, SVG, Canvas, native, facet, and case tests cover object
and primitive identity, prefix-colliding keys, stable selection slots, first
focus, interruption, clear, labels, source-state isolation, and live-status
ownership. The standard browser matrix passes at 98.0% geometry with clean
types and behavior. The exact focus-guide fixture is 18.07 KiB gzip, 1.09 KiB
over ordinary dots and below its 2 KiB increment cap; motion, spring, tooltip,
portal, and D3 geometry inputs remain excluded.

## Completed phase-4 slice: synchronized cursor composition

Case 87 needs no controlled cross-host focus primitive. Its ECharts reference
links two grids inside one ECharts instance, so one outer `viewGrid` is the
equivalent definition boundary. The child definitions share x semantics and
plot range while retaining independent y domains. Grouped x focus selects one
dot from each view, and each child `focusGuideX({ match: "x" })` retargets its
own rule and marker from that shared semantic date.

Each line is `decorative(lineY(...))`, leaving one interaction point per view
and date. The dot group is the view identity; without it, grouped focus would
deduplicate the observations into one group. The outer sticky tooltip owns
click, Enter/Space, pointer-leave, Escape, and update-restoration pin behavior.
Only the live current/previous value summary remains application UI.

This combines three established seams rather than adding a synchronized-cursor
wrapper: complete-scene composition from case 57, retargeted focus guides from
cases 80 and 117, and point-free decorative geometry from cases 34–35 and 86.
Focused tests cover 16 interaction points, two groups per date, aligned x
coordinates, independent y marker positions, stable overlapping Date identity,
keyboard pin/leave/update/Escape behavior, and the absence of a second SVG,
copied scales, React coordination, or manual overlays. The quick browser matrix
passes both renderers, revisions, sizes, themes, visual, behavior, and strict
type gates at 100.0% diagnostic geometry. TanStack uses 648 authored lines and
44.82 KiB gzip versus ECharts' 826 lines and 175.44 KiB.

## Completed phase-4 slice: controlled continuous cursor

Case 88 now places one `continuousCursor` behavior in the normal definition.
The exact interaction subpath resolves both final scale ranges and plot bounds,
inverts arbitrary numeric or temporal positions without datum snapping, and
owns transient pointer and touch previews, click or tap pinning, leave and
cancel cleanup, toggle and Escape clearing, host teardown, and a
renderer-neutral static fallback. Rules, the marker, and optional axis labels
are ordinary scene geometry rather than a case-owned SVG.

The behavior composes two existing first-principles seams. `controlledSignal`
keeps the accepted semantic position and persistence application-owned, while
the interaction-axis kernel shared with `brushX` owns scale mapping, inversion,
clamping, value cloning, and reversed ranges. Continuous cursor and datum-bound
focus guides share only the renderer-neutral guide-node painter; cursor does
not import focus candidates, focus motion, tooltips, brush policy, or D3. The
paired semantic sliders and live status remain application UI over the same
controlled position.

Focused tests cover static and hosted paint, numeric and temporal values,
reversed axes, pointer and touch previews, pinning, controlled acceptance and
rejection, leave, cancellation, Escape, teardown, type compatibility, and the
absence of copied scales, manual overlays, React state, and custom pointer
listeners in the case. The isolated DOM-host fixture has a 5 KiB incremental
gzip cap; it adds 3.63 KiB and rejects focus-guide, brush, tooltip, legend,
selection, and D3 inputs.

## Completed phase-4 slice: controlled horizontal zoom

Case 90 now places one `zoomX` behavior in the normal definition. The exact
interaction subpath consumes a controlled semantic number or Date window,
resolves against the final x scale and plot bounds, and owns pointer-anchored
wheel zoom, drag and horizontal-wheel pan, pointer and touch input, wheel
normalization, keyboard zoom and pan, clamping, cancellation, focus-gated wheel
capture, and host teardown. D3 Zoom and Selection remain private to the
optional DOM control.

The reusable boundary is the same controlled signal and interaction-axis
infrastructure proven by brush and continuous cursor, not a public D3
transform. Brush and zoom additionally share only semantic range ordering,
cloning, and equality; they retain separate gesture policy and DOM structure.
The controlled semantic window is the source of truth across responsive
rebuilds. The behavior maps through the resolved scale and keeps its private
gesture state synchronized with accepted or externally replaced windows. SVG
and Canvas mount the same contained control; static and native renderers use
the accepted configured domain without importing the controller.

The application still owns the accepted window, visible-row filtering, the
resulting y-domain policy, status text, visible Reset control, and persistence
across revisions. The 592-line React controller, second SVG, copied scale,
manual transform-to-window conversion, D3 imports, and case-owned wheel,
pointer, touch, and keyboard lifecycle are gone.

Focused behavior and case tests cover numeric and temporal windows, limits,
scale validation, wheel delta modes, focus-gated capture, pointer and touch
pan, keyboard zoom, pan and reset, controlled updates, responsive replacement,
teardown, and authored-source closure. The exact optional bundle fixture owns
the D3 zoom controller while root, universal, ordinary DOM, brush, cursor,
legend, and selection consumers reject its retained inputs. It adds 19.95 KiB
gzip over the ordinary DOM host under its 20 KiB cap.

The quick paired browser matrix passes unfocused page scrolling, focus-gated
pixel/line/page wheel zoom, horizontal-wheel pan, pointer drag, touch activation
and pan, keyboard, Reset, revision preservation, visual, and strict type
scenarios at 98.6% diagnostic geometry. TanStack uses 512 authored lines and
51.59 kB gzip versus ECharts' 727 lines and 172.82 kB.

## Completed phase-4 slice: scale-bound handle

Case 91 now places one controlled `handleX` behavior in the normal definition.
The exact interaction subpath paints the candidate track, playhead rule, and
handle against the final scales. Its DOM control owns nearest-candidate
snapping, pointer and touch capture, preview, commit and cancellation,
Arrow/Home/End input, a named horizontal slider, focus paint, resize remapping,
and teardown. Static SVG and React Native retain the accepted visual fallback.

The shared first-principles seam is the candidate-backed interaction axis
proved by `brushX`. It maps and orders explicit semantic values, clamps pointer
positions, finds the nearest candidate, and exposes stable indices for
keyboard movement. The handle reuses only value cloning from the range kernel;
it does not import brush selection policy, cursor guides, zoom policy, a
continuous scale inverse, or D3. This keeps the single-value behavior useful
for playback and endpoint editing without turning it into a generic gesture
controller.

The application retains the accepted frame, playback clock, play/pause button,
visible status, announcements, and revision persistence. The case no longer
imports its overlay, copies scene geometry, maps pointer coordinates, captures
pointers, creates a second SVG, or installs a gesture lifecycle.

Case 92 is the second proof of the same primitive. Its handle uses the
Engineering lane as a semantic y cross, omits the playhead rule, and snaps the
release end to an application-supplied list of valid dates. Charts owns direct
manipulation and slider semantics. The application retains the native date
input, minimum-end constraint, validation, accepted edit transaction, status,
and exact event descriptions. Its overlay import, manual scale-to-DOM mapping,
range input, and pointer lifecycle are gone.

Focused behavior and both case suites cover candidate validation, semantic
cross values, static paint, pointer and touch input, cancellation, keyboard
commits, controlled acceptance and rejection, responsive replacement,
teardown, exact types, playback timing, date validation, and authored-source
closure. The exact DOM-host fixture adds 3,740 bytes (3.65 KiB) gzip under a 5
KiB cap and rejects cursor, brush, zoom, focus-guide, tooltip, legend,
selection, D3, and unrelated inputs. The packed runtime, declaration,
type-inference, and exact-subpath isolation gates pass.

Case 91's paired quick matrix passes behavior, visual, and strict type gates at
320 and 640 px across both revisions with 99.0% diagnostic geometry. TanStack
uses 539 authored lines and 39.58 kB gzip versus the reference's 856 lines and
167.93 kB. The combined run also passes every Case 92 behavior, visual, and
type gate with 99.9% geometry. Both cases and the shared capability are
verified in the roadmap.

## Completed phase-2 slice: per-tick label presentation

Case 118 now owns month-label typography and edge alignment in `x.axis`.
`fontSize`, `fontWeight`, `opacity`, `anchor`, `dx`, and `dy` accept constants
or per-candidate accessors. Each accessor receives the semantic value, stable
pre-thinning index, resolved center position, and bandwidth. Resolved output
feeds collision thinning, automatic margins, facet compatibility, SVG,
Canvas, native output, and ordinary tick-label motion; anchor changes snap.

The first month uses `anchor: "start"` and `dx: -bandwidth / 2`, so its text
origin equals the painted first cell edge without measuring or mutating DOM.
The example's outer factory already receives current conformance dimensions,
so it returns a fully inferred static definition for each mount and update.
The shell retains only width-derived host sizing and tooltip presentation; its
axis CSS, label query, and `setAttribute` calls are gone.

Focused tests cover exact day and tick-context types, raw identity, 364 cells,
first-edge alignment at 320/640/960px, defaults, rotation, typography,
thinning, automatic margins, facets, motion, and native scene output. The
standard browser matrix passes at 98.8% geometry with clean behavior and
types. The fixture is 16.67 KiB gzip, 0.09 KiB over an ordinary line plus
static SVG and below its 0.75 KiB cap, with no added retained library module.

## Completed phase-0 slice: projection gallery

Case 110 needs no projection-gallery primitive. `facetChart` owns the two-by-two
responsive regions, and each child uses two ordinary `geoShape` layers with a
shared `{ type, fit: "sphere", inset: 8 }` descriptor. The complete projection
domain is repeated in each child deliberately because child color scales are
independent. Projection choice, order, atlas geometry, palette, and paint remain
case-owned configuration.

The migration exposed one shared facet contract bug: runtime points retained
child geo data while the public mark and motion types claimed they were the rows
used for grouping. `facet`, `facetChart`, and `FacetOptions` now derive output
and motion data from the child specification, keep grouping and child generics
separate, and expose every real group as a nonempty tuple. A heterogeneous
group-to-child regression protects type inference, raw object identity, motion,
and offset points. The catalog definition-shape audit now recognizes
`facetChart` as a complete static definition factory.

Focused facet, geo, case, type, and source tests pass. Browser conformance
reports 99.8% geometry with clean visual and type gates. TanStack uses 102
authored lines and 257.54 KiB gzip versus Observable Plot's 160 lines and
306.54 KiB. Median mount is 14.00 ms versus 5.70 ms and median update is 13.30
ms versus 5.80 ms; the atlas-heavy nested compilation is accepted evidence,
not hidden as a performance win. Odd chart sizes use equal half-pixel cells
instead of restoring the former floor/ceil pane helper.

## Migration acceptance

A case can move to `verified` only when all applicable conditions hold:

1. **Source boundary:** the definition consumes semantic source rows. No
   Charts-owned coordinates, intervals, topology, copied scales, scene nodes,
   or controller lifecycle remain in the case-owned source closure.
2. **Definition boundary:** built-in marks, eager transforms, configured
   scales, guides, states, or controlled behaviors express the visualization.
   Legitimate metric meaning, forms, tables, persistence, data arrival, and
   DOM scrolling remain visibly application-owned.
3. **Types and identity:** public imports typecheck without casts or
   suppressions; original data, stable keys, and reducer lineage survive
   focus, selection, callbacks, updates, and motion.
4. **Behavior:** initial and revised data pass the relevant responsive,
   theme, geometry, containment, accessibility, and interaction scenarios.
   Gestures additionally cover pointer, keyboard, touch, cancellation,
   clamping, cleanup, and controlled round trips.
5. **Packaging:** every new public capability has an exact source and
   published export, packed-consumer coverage, and documentation. Optional
   capabilities have an isolated retained-input allowlist and bundle budget;
   no optional algorithm enters a locked consumer.
6. **Evidence:** focused tests and conformance pass, the authored-source
   closure is reviewed, and the matching `API-FRICTION.md` finding records the
   final verification before it becomes resolved.

For `accepted-boundary`, the same review must prove that Charts already owns
all reusable visualization geometry and that only the stated application or
bespoke geometry responsibility remains.

## Gates

Run the narrow unit and type tests during implementation. Before marking a
public primitive or migration verified, run the applicable complete gates:

```sh
pnpm format:check
pnpm typecheck
pnpm test
pnpm docs:sync
pnpm docs:check
pnpm package:check
pnpm bundle:check
pnpm catalog:check
pnpm catalog:build
pnpm catalog:loading:check
pnpm conformance:quick -- --case=<comma-separated-case-ids>
pnpm conformance -- --case=<comma-separated-case-ids>
pnpm validate
pnpm benchmark:check
```

`docs:sync` is required only for public documentation changes; never edit the
generated package docs directly. Browser-backed conformance is focused during
feature work and remains scheduled monitoring rather than a normal pull
request blocker. `benchmark:check` remains separate from `validate` and is
required when a change advances a tracked Charts comparison input.

Only update a locked bundle baseline after reviewing the shared-path change.
A new optional primitive should normally add a budgeted fixture without
changing any locked entry.

## Tracker invariants

The focused roadmap test enforces:

- all 109 roadmap and audit IDs equal the live catalog directories exactly,
  including `111-basic-sankey` and `111-sankey-flow`;
- every verified or accepted case has evidence under its own case directory;
- disposition totals remain 58 / 34 / 14 / 2 / 1;
- phase totals remain 60 / 2 / 26 / 11 / 10, with closure covering all 109;
- phases, capabilities, dependencies, statuses, and source paths are valid;
- the capability graph is acyclic;
- application and inline-custom boundaries are limited to cases 85, 86, and
  116; and
- every primitive case has at least one Charts-owned work record, while every
  accepted boundary records the retained external owner.

Do not infer ownership from source length, filenames, D3 imports, or the
catalog `support` field. Those remain candidate signals, not disposition
evidence.
