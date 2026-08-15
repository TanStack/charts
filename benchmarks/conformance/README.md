# Chart catalog conformance

This corpus compares representative standard-data-visualization recipes from
official chart-library catalogs with TanStack Charts. Observable Plot is the
default reference; cases that cover distinct Recharts or Apache ECharts
behavior select that renderer explicitly without creating a second harness.

Each case owns:

- one typed raw data fixture and intent;
- one self-contained public `example.tsx` with the chart definition;
- one isolated reference implementation;
- one thin TanStack conformance adapter that imports the public example;
- official source provenance;
- semantic geometry expectations;
- optional renderer-independent interaction scenarios;
- an agent creation task and maintenance task.

The reference may use its built-in transforms. TanStack receives the same raw
rows and uses TanStack's data transforms or a granular D3 primitive when
transformation is needed.
Precomputing both sides would hide the bundle and authoring tradeoff being
measured.

`data.ts` may load, parse, or deterministically generate observations. Bins,
stacks, ranks, cumulative endpoints, summaries, density coordinates, and
layout positions belong in the renderer source or a case-local transform
module. The gallery follows local imports and displays those modules with the
renderer entry. The conformance report counts the complete transitive authored
source for each implementation and reports the source-line ratio per case.

Cases omit `referenceRenderer` for the default `observable-plot` pairing and
use `referenceRenderer: "recharts"` or `"echarts"` for another reference.
Implementations are named `plot.ts`, `recharts.ts`, or `echarts.ts` alongside
`tanstack.ts`; the runner and gallery use the selected pair without a second
harness.

## Commands

```sh
# Install the Playwright version's pinned headless browser
pnpm browser:install

# Fast bundle, timing, visual, and type audit
pnpm conformance:quick

# Standard 320/640/960, light/dark matrix
pnpm conformance

# Isolated bundle and type audit only
pnpm conformance:size

# Narrow the corpus
pnpm conformance:quick -- --case=line-gaps,histogram

# Interactive side-by-side gallery
pnpm dev:conformance

# Validate case metadata, source entries, ordering, and index drift
pnpm catalog:index:check

# Validate every public example and its case-local source closure
pnpm catalog:examples:check

# Render the checked-in source-derived catalog previews
pnpm catalog:previews

# Validate preview source and asset drift
pnpm catalog:previews:check

# Build the standalone authoring app
pnpm --filter @charts-poc/conformance-example build
```

Reports are written to
`.benchmark-output/conformance/results/plot-catalog.{json,md}`. A 640px
light-mode side-by-side screenshot for each paired case is retained under
`.benchmark-output/conformance/screenshots`.

The historical `plot-catalog` report filename is retained for unfiltered runs
and tooling compatibility even when a run includes Recharts references.
`--case` diagnostics use a deterministic
`plot-catalog--cases-<selection>.{json,md}` filename so they cannot overwrite
the complete catalog evidence. Long selections use a bounded digest; the JSON
always records the resolved case filter.

The [interaction UX audit](./INTERACTION-UX-AUDIT.md) preserves the before-state
review of cases 80–92 and records the implementation follow-through for
discoverability, rendered feedback, keyboard and touch operation, cancellation,
accessibility, and edge behavior.

The [custom authoring audit](./CUSTOM-AUTHORING-AUDIT.md) preserves the reviewed
before-state classification of work outside the declarative chart definition.
The [definition coverage audit](./DEFINITION-COVERAGE-AUDIT.md) then reviews
every flagged case and identifies current-API migrations, missing reusable
primitives, optional algorithm adapters, and justified custom boundaries.
The [definition coverage plan](./DEFINITION-COVERAGE-PLAN.md) tracks the
capability dependencies, migration status, acceptance criteria, and gates for
all 109 dispositions. The
[definition coverage overview](./DEFINITION-COVERAGE-OVERVIEW.md) catalogs the
current boundary and case-local evidence for every case.

## Source catalog index

`catalog-index.json` is the checked-in metadata contract for consumers that load
source directly from the Charts repository. It contains every parsed
`case.json` field plus the public `example.tsx` entry path. The index does
not embed compiled modules, source closures, previews, datasets, or assets.
Every public entry has a default React export and may import only files from its
own case directory. Conformance code imports the definition from that entry;
the adapter, driver, tests, and comparison renderer are not published to the
docs sandbox.

Every case also has a checked-in source-derived preview at
`benchmarks/conformance/previews/<caseId>.svg`. The generator mounts the actual
TanStack case at 288 by 192 pixels with its source data, marks, transforms, and
light/dark catalog palette. Semantic catalog colors use their paired dark
tokens. Portable SVGs bind the ShadCN background, foreground, muted surface,
and muted-foreground tokens inside the asset so retained labels and separators
follow the selected site theme. Fixed authored paints retain their hue, gain the minimum graphical
contrast required by the dark catalog surface, and receive a small dark-theme
tint when they already pass. Preview mode removes axes, grids, margins, and
legends by default so the data marks fill the card. A case keeps a guide,
margin, legend, or direct label only when that feature is part of the case's
purpose. These SVGs are generated views of the canonical implementation, not a
parallel chart implementation or a renderable npm module.

```sh
# Regenerate after adding or changing a case
pnpm catalog:index

# Validate metadata, entry files, ordering, and checked-in index drift
pnpm catalog:index:check

# Regenerate previews after a visual source change
pnpm catalog:previews

# Validate preview coverage, integrity, dimensions, and source drift
pnpm catalog:previews:check
```

Consumers resolve the Charts revision independently, then fetch the index and
its source entries from that same revision.

## Catalog consumers

The Vite application remains the local authoring and conformance surface at
`http://localhost:5194/`. TanStack.com owns the public catalog routes and chrome.
It reads `catalog-index.json`, each self-contained example source closure, and the checked-in preview SVGs from
one pinned Charts revision, then runs full examples in the site notebook
runtime. The site does not maintain parallel preview implementations or consume
a generated catalog branch or published renderable-catalog package.

Adding or changing a case requires regenerating the checked-in index and
previews. The index check uses the same strict metadata parser as the browser
and rejects invalid schemas, duplicate IDs or orders, missing source entries,
and IDs that drift from their directory names. The preview check rejects
missing, stale, incorrectly sized, or integrity-mismatched assets.

## What is and is not equivalent

Both implementations must satisfy the same data and semantic contract. They do
not need pixel-identical axes or styling: guide defaults are part of each
library’s product. Paired cases use the same explicit semantic domains so
automatic domain policy does not masquerade as renderer accuracy. The
automated visual gate checks:

- expected minimum data-bearing geometry counts are met;
- optional maximum geometry counts reject duplicated or over-segmented marks;
- case-specific categorical order and guide multiplicity assertions pass;
- original SVG label boxes stay inside the chart and any clipping ancestors,
  with a narrow explicit rule for offscreen scroll content;
- both charts have accessible names without duplicate nested chart roots;
- the distinct computed paints used by corresponding data marks match, with
  one RGB channel unit of tolerance for equivalent interpolation rounding;
- frame-relative normalized geometry remains comparable where the emitted
  primitive counts match.

Geometry similarity is diagnostic by default. A deterministic case may declare
`minimumGeometrySimilarity` from `0` to `1`; that floor must pass independently
for every viewport, theme, and initial/revised render. Use it only when the two
renderers emit directly comparable boxes. Geometry expectations may similarly
declare `maxCount` when excess primitives are a semantic failure.

Every visual assertion runs once on initial data and again after a same-shape
revision update. When a renderer exposes `driver.settle`, the static visual
inspection waits for it; temporal behavior remains the interaction scenario's
responsibility.

Interaction cases additionally declare renderer-independent semantic
scenarios. Each implementation exposes a benchmark-only driver that maps a
named anchor to viewport coordinates and reports serializable state. The
runner fresh-mounts every scenario, uses real Playwright pointer, click,
keyboard, drag, wheel, CDP touch, cancellation, and bounded wait input, then
checks the same state assertions for the reference and TanStack implementation
across sizes, themes, and revisions. Scenarios may update the existing handle
to prove state preservation, inspect rendered text, attributes, focus, scroll,
dimensions, and containment, and retain named screenshots at meaningful
checkpoints. Any uncaught browser error fails the active step. Generated SVG
selectors and renderer-local datum indexes are not part of the cross-renderer
case contract.

The screenshot is the final visual review artifact. Paint equality and
bounding-box similarity still cannot prove a line path, color interpolation,
or tooltip is correct.

Bundle cases are built independently. Never re-export case implementations
through one measured barrel; that retains unrelated marks and defeats the
comparison.

## Current scope

The executable corpus contains 112 paired cases: 77 sourced from Observable
Plot, 24 from Recharts, and 11 from Apache ECharts. It spans the common
cartesian vocabulary plus the high-value catalog beyond it:

- lines, areas, bars, intervals, heatmaps, histograms, facets, and framed
  plots;
- error bars, boxplots, empirical distributions, beeswarms, regression,
  moving windows, Bollinger bands, contours, density contours, and hexbins;
- normalized and wiggle stacks, Likert charts, waterfalls, difference fills,
  rankings, indexed lines, marginal distributions, ridgelines, violins,
  Marimekko layouts, funnels, and waffles;
- pointer, grouped, and Voronoi-nearest tooltips;
- pie, labeled pie, basic/centered/rounded/nested donuts, partial and needle
  gauges, single/comparative radar, numeric polar line/scatter, rose, radial
  bars, and static and drillable sunburst layouts;
- trees, Delaunay links, force networks, vector fields, and GeoJSON maps.
- regional and world choropleths, proportional symbols, orthographic globe
  and graticule layers, projected routes, 177 real country boundaries, 51 US
  state/DC boundaries, and a four-projection atlas gallery.
- staggered entrances, tween and physical-spring updates, definition-local
  timing, cross-chart geometry morphing, and animated focus/crosshair state.

Shared facet guides, guide suppression, Plot-style tooltip mapping, exact
difference crossings, and responsive fixed-pixel spatial preparation are
covered by initial and updated visual checks. A case is not considered covered
merely because it renders.

The Recharts tranche adds mixed composition, population pyramids,
adjacent-plus-stacked bars, a 1,000-point scatter pressure test, treemaps,
pie and donut variants, partial and needle gauges, single and comparative
radar, radial bars, rose, sunburst, an accessible interactive legend,
chart/table selection, and a pinned tooltip containing a real nested chart.

The ECharts tranche adds numeric polar line/scatter, a snapped grouped axis
pointer, native horizontal resource scrolling, streaming-window preservation,
synchronized multi-view cursors, a free two-dimensional cursor, continuous
brush selection, wheel zoom and pan, timeline scrubbing, and editable event
ranges. Focus-plus-context uses Plot as its reference. Together with the
original tooltip cases, 19 cases carry executable interaction scenarios.

All declared interaction scenarios and the prior 79-case full-corpus visual
matrix pass across both renderers, initial/revised data, 320/640/960 px, and
light/dark themes. The nine added polar cases pass their focused standard
matrix with 100.0% mean frame-relative geometry similarity; all four added
geographic cases pass the same matrix at 99.9% each. Those results prove the
declared contracts, not production interaction quality. The numeric polar
line/scatter additions pass their focused standard matrix at 100.0%; the
country and state atlas cases pass at 99.9%, and the four-pane projection
gallery passes at 99.8%, for 99.9% across the five-case expansion. The
interaction UX audit preserves the original gaps and their implementation
follow-through.
The prior full-corpus baseline measures 0.21× the
selected-reference gzip, 0.57× mount time, 0.66× update time, and 97.8% mean
diagnostic geometry similarity. The transitive authored-source ratio is 1.07×.
Strict case sources have zero diagnostics, unsafe assertions, or suppressions.
In the eight paired invalid-program probes, Observable Plot and Recharts each
reject 1/8 while TanStack Charts rejects 8/8.

## Expansion rule

Keep adding Plot cases while they can be expressed as one of:

1. a recipe over existing marks;
2. a TanStack data transform or granular D3 preparation supplied by the
   consumer;
3. a tree-shakeable optional mark with an isolated entry point.

Every optional addition must receive its own bundle measurement. The locked
core, ordinary line/SVG, DOM host, React adapter, and existing consumer
baselines must remain byte-identical unless a universal cost is explicitly
reviewed.

The current stop boundary is functionality that necessarily changes shared
rendering or host code for every consumer:

- raster and image scene primitives;
- built-in cursor, selection, brush, zoom, scrubber, or editor state in the
  default DOM host;
- a universal chart-type or transform registry.

The interaction tranche proves these behaviors as application-owned state,
ordinary chart updates, D3 scale inversion, DOM overlays, and benchmark-only
semantic drivers. `focusDisabled` is isolated at
`@tanstack/charts/focus/disabled`; it adds no byte to an ordinary chart.
Reusable controllers remain optional-entry-point work, not justification for
a universal host tax.

The broad useful Plot catalog is now saturated at this boundary, though a new
zero-tax recipe can still be added when it proves a distinct contract. The same
protocol is now consuming the official
[Recharts examples](https://recharts.github.io/en-US/examples/), because
[shadcn Charts uses Recharts](https://ui.shadcn.com/docs/components/radix/chart).
Only genuinely new use cases should be added; overlapping line, bar, area,
tooltip, and composition examples remain covered by the Plot corpus.

The next pressure set is linked XY brushing and lasso, pinch/touch arbitration,
keyboard alternatives for continuous gestures, multi-pane financial views,
nested Gantt dependencies, and high-volume cursor/viewport performance. Add
them first as recipes. Promote only repeated, measured ownership boundaries to
isolated public entry points.

The upstream source of truth is the official
[Plot fixture directory](https://github.com/observablehq/plot/tree/main/test/plots)
and [Plot documentation](https://observablehq.com/plot/).
