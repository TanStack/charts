# Chart catalog conformance

This corpus compares representative standard-data-visualization recipes from
official chart-library catalogs with TanStack Charts. Observable Plot is the
default reference; cases that cover distinct Recharts or Apache ECharts
behavior select that renderer explicitly without creating a second harness.

Each case owns:

- one typed local data fixture and intent;
- one isolated reference implementation;
- one isolated TanStack implementation;
- official source provenance;
- semantic geometry expectations;
- optional renderer-independent interaction scenarios;
- an agent creation task and maintenance task.

The reference may use its built-in transforms. TanStack receives the same raw
rows and injects the granular D3 primitive when transformation is needed.
Precomputing both sides would hide the bundle and authoring tradeoff being
measured.

Cases omit `referenceRenderer` for the default `observable-plot` pairing and
use `referenceRenderer: "recharts"` or `"echarts"` for another reference.
Implementations are named `plot.ts`, `recharts.ts`, or `echarts.ts` alongside
`tanstack.ts`; the runner and gallery use the selected pair without a second
harness.

## Commands

```sh
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

# Validate publishable case metadata and route uniqueness
pnpm catalog:check

# Build the static catalog, deep routes, embeds, and catalog.json
pnpm catalog:build
```

Reports are written to
`.benchmark-output/conformance/results/plot-catalog.{json,md}`. A 640px
light-mode side-by-side screenshot for each paired case is retained under
`.benchmark-output/conformance/screenshots`.

The historical `plot-catalog` report filename is retained for tooling
compatibility even when a run includes Recharts references.

## Published catalog and documentation embeds

The catalog is one application driven by the same `case.json` files used by
conformance:

| Route           | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `/`             | Searchable case catalog; charts load only after selection         |
| `/all/`         | Full side-by-side comparison gallery                              |
| `/charts/:id/`  | One reference/TanStack comparison with source and embed code      |
| `/embed/:id/`   | Chrome-free, responsive TanStack chart for an iframe              |
| `/catalog.json` | Versioned metadata and page/embed paths for documentation tooling |

The build writes physical `index.html` files for every deep route, so direct
links work on a static host without rewrite rules. `404.html` retains
client-side route recovery. Set `CATALOG_BASE_PATH` when publishing below a
subdirectory and `CATALOG_ORIGIN` to emit absolute canonical URLs and a
sitemap.

An embed accepts `theme=system|light|dark`, `height=120..1200`, and an optional
numeric `revision`. Width always follows the iframe container:

```html
<iframe
  src="https://catalog.example/embed/01-line-gaps/?theme=system&height=360"
  title="Line chart with gaps"
  loading="lazy"
  style="width: 100%; height: 360px; border: 0"
></iframe>
```

Embeds have no catalog chrome and are `noindex`. They post
`tanstack-charts:embed:ready`, `:resize`, or `:error` messages containing the
case ID and height. A documentation host that listens for them must validate
`event.origin`.

Adding or changing a case updates every catalog surface automatically.
`catalog:check` uses the same strict metadata parser as the browser and rejects
invalid schemas, duplicate IDs or orders, and case IDs that drift from their
directory names.

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
revision update.

Interaction cases additionally declare renderer-independent semantic
scenarios. Each implementation exposes a benchmark-only driver that maps a
named anchor to viewport coordinates and reports serializable state. The
runner fresh-mounts every scenario, uses real Playwright pointer, click,
keyboard, drag, and wheel input, then checks the same state assertions for the
reference and TanStack implementation across sizes, themes, and revisions.
Scenarios may update the existing handle to prove state preservation. Any
uncaught browser error fails the active step. Assertions distinguish semantic
state from rendered evidence where a false positive is otherwise possible.
Generated SVG selectors and renderer-local datum indexes are not part of the
cross-renderer case contract.

The screenshot is the final visual review artifact. Paint equality and
bounding-box similarity still cannot prove a line path, color interpolation,
or tooltip is correct.

Bundle cases are built independently. Never re-export case implementations
through one measured barrel; that retains unrelated marks and defeats the
comparison.

## Current scope

The executable corpus contains 79 paired cases: 61 sourced from Observable
Plot, nine from Recharts, and nine from Apache ECharts. It spans the common
cartesian vocabulary plus the high-value catalog beyond it:

- lines, areas, bars, intervals, heatmaps, histograms, facets, and framed
  plots;
- error bars, boxplots, empirical distributions, beeswarms, regression,
  moving windows, Bollinger bands, contours, density contours, and hexbins;
- normalized and wiggle stacks, Likert charts, waterfalls, difference fills,
  rankings, indexed lines, marginal distributions, ridgelines, violins,
  Marimekko layouts, and waffles;
- pointer, grouped, and Voronoi-nearest tooltips;
- trees, Delaunay links, force networks, vector fields, and GeoJSON maps.

Shared facet guides, guide suppression, Plot-style tooltip mapping, exact
difference crossings, and responsive fixed-pixel spatial preparation are
covered by initial and updated visual checks. A case is not considered covered
merely because it renders.

The Recharts tranche adds mixed composition, population pyramids,
adjacent-plus-stacked bars, a 1,000-point scatter pressure test, treemaps,
radar, an accessible interactive legend, chart/table selection, and a pinned
tooltip containing a real nested chart.

The ECharts tranche adds a snapped grouped axis pointer, native horizontal
resource scrolling, streaming-window preservation, synchronized multi-view
cursors, a free two-dimensional cursor, continuous brush selection, wheel
zoom and pan, timeline scrubbing, and editable event ranges. Focus-plus-context
uses Plot as its reference. Together with the original tooltip cases, 16 cases
carry executable interaction scenarios.

All interaction behavior and the full 79-case standard visual matrix pass
across both renderers, initial/revised data, 320/640/960 px, and light/dark
themes. The latest full run measures TanStack at 0.20× the selected-reference
gzip, 0.66× mount time, 0.65× update time, and 97.8% mean diagnostic geometry
similarity. The transitive authored-source ratio is 1.06×. Strict case sources
have zero diagnostics, unsafe assertions, or suppressions. In the eight paired
invalid-program probes, Observable Plot and Recharts each reject 1/8 while
TanStack Charts rejects 8/8.

## Expansion rule

Keep adding Plot cases while they can be expressed as one of:

1. a recipe over existing marks;
2. granular D3 preparation supplied by the consumer;
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
