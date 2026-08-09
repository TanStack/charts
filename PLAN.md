# TanStack Charts Plan

> Living architecture and product plan. Keep decisions, discoveries, and open questions here so this remains the durable source of truth across conversations.

Observed difficulty from using the API is tracked separately in
[`API-FRICTION.md`](./API-FRICTION.md). Production migrations, examples, and
agent evaluations must update that log when they expose a repeatable problem.

Last updated: 2026-08-06

## Working thesis

TanStack Charts should become a tiny, fast, framework-agnostic TypeScript
visualization grammar deeply inspired by Observable Plot. Observable Plot is
the primary semantic and ergonomic reference. TanStack owns the grammar,
compiler, scene, lifecycle, integration contracts, and compact primitives that
make common authoring ergonomic. D3 is a first-class interoperability target
and a source of mature optional algorithms, not a mandatory backend. The
lineage is recorded in [`ACKNOWLEDGEMENTS.md`](./ACKNOWLEDGEMENTS.md).

Preserve Plot’s composable marks, channels, scales, transforms, facets, and
extension ceiling. Do not replace that grammar with `<LineChart>`,
`series: [{type: "line"}]`, or any other normalized chart-type model.

TanStack Charts should combine that grammar with the application integration
concerns that Plot intentionally leaves to its host:

- Container-responsive rendering
- Mount, update, and cleanup lifecycle
- React and Octane integration
- Automatic light and dark themes
- SSR and hydration
- Application-facing interaction state
- Accessibility conventions
- Testing
- Optional export and motion
- Predictable, task-oriented documentation for humans and AI

The code is the protocol. AI should generate and maintain ordinary TypeScript and JSX or TSRX rather than a JSON chart language, a proprietary DSL, or an agent-specific runtime.

## Product charter

These are governing constraints, not optional aspirations.

### Arbitrary data in, channels out

- Every mark consumes the user’s original arrays, objects, tuples, or iterables.
- Channels accept typed field references, accessor functions, constants, and
  derived values.
- Different marks in one chart may use different data and different datum
  types.
- The engine never requires users to reshape data into a library-owned series,
  dataset, or dataframe model.
- Original datum identity survives materialization, interaction, selection,
  reconciliation, and callbacks.
- Stable keys prefer an explicit channel, then a unique datum `id`, then a
  mark-specific semantic channel. Index identity is the final fallback.

### One grammar from common to custom

- The public model is marks, channels, supplied scales, prepared transform
  output, facets, and guides.
- Common conveniences such as `lineY`, `barX`, and sparkline recipes are thin
  constructors over the same primitives.
- The 90% path should require little configuration and produce a finished
  chart, without lowering the ceiling for the remaining 10%.
- A common chart can become a custom layered visualization incrementally. It
  should never require migration to a second API.
- Built-in marks and capabilities use the same public extension contracts
  available to application and ecosystem code.

### Predictable callback shape

- Public callbacks accept at most two arguments.
- Primary data or purpose comes first. Additional state comes second in a
  named context or options object.
- A callback without a distinct primary payload receives one context object.
- Standard comparators, exact upstream protocols, paired geometry, and
  consumer-called service methods are classified exceptions rather than
  accidental precedents.
- The public callback inventory is a test contract. A new callback must follow
  this shape or document why an existing external protocol requires otherwise.

### D3-compatible and composable primitives

This is the destination ownership contract. The checkpoint below records which
boundaries are implemented and which remain transitional.

- Public definitions accept native D3 scales, curve factories, interpolators,
  easing functions, layouts, forces, and transform output directly whenever
  their shape is sufficient.
- Direct D3 use and compact TanStack primitives are peers. A definition may mix
  both, and choosing a TanStack helper must not close the corresponding D3
  extension path.
- A bar consumes the exact bandwidth, alignment, padding, rounding, and
  reversal of its supplied D3 band scale. It does not infer hidden sub-bands or
  add an implicit inset. Side-by-side groups inject a second D3 band scale;
  `z` remains series identity rather than a positional algorithm.
- TanStack adapters exist only when they add grammar semantics: channel
  materialization, mark composition, responsive range ownership, scene
  metadata, or framework-neutral rendering.
- Compact, row-based, or independently importable TanStack implementations are
  valid when they provide a clearer application-facing contract. Their
  semantics, supported subset, determinism, lineage, and edge cases must be
  explicit and tested.
- Prefer a mature granular D3 implementation when it already matches the
  required contract. Prefer a smaller local primitive when D3's package or
  mutation model would make the common path materially less ergonomic or less
  isolated.
- Never describe a local subset as exact D3 behavior. Compatibility means that
  authors can compose equivalent D3 inputs or output without changing the chart
  grammar; it does not require identical implementation.
- Never make the `d3` umbrella package a library dependency. Optional D3-backed
  capabilities use granular packages and exact subpaths.
- Documentation and skills absorb explicit domain, scale, and transform
  construction. AI does not need runtime inference merely to save a few lines.

### Near-zero unused cost

- The scene protocol and explicit-scale compiler have no framework, DOM,
  animation, export, geo, raster, or palette-catalog requirement.
- Algorithms enter through exact capability paths. A categorical chart must
  not inherit continuous-scale, interpolation, temporal, spatial, shape, or
  motion code merely because another feature uses it.
- Every concrete mark, transform, layout, chart-owned guide, interaction,
  renderer, and optional profile is statically importable and independently
  removable. Direct D3 families remain independently importable from their
  granular upstream packages.
- No global registry, side-effect registration, or namespace escape may defeat
  tree shaking.
- Convenience entry points may aggregate exports for ergonomics, but must not
  force their implementations into consumer bundles.
- Capability discovery is driven by the imported and instantiated marks, not a
  central runtime catalog.
- Runtime work should be proportional to materialized channels and emitted
  scene nodes. Dynamic updates reuse stable keyed work where doing so is
  cheaper than replacement.

“Small” will be enforced with per-feature bundle fixtures and CI budgets, not
described only by the total package size.

### Beautiful by default

- A chart with data and channels but no visual configuration should look
  intentional in both light and dark environments.
- Defaults include a restrained palette, inherited typography, balanced
  spacing, legible axes, subtle grids, useful number and time formatting,
  visible focus, and polished tooltip chrome.
- Defaults respond to the measured container: tick density, label treatment,
  facet flow, margins, and optional details may adapt without viewport
  assumptions.
- Theme tokens are overridable through stable CSS variables and typed theme
  input. Applications are never forced into a TanStack visual identity.
- Optional motion enhances state changes but is not required for visual quality
  or correctness.
- A visual reference suite across chart types, sizes, themes, and data edge
  cases is a release gate.

### Framework-agnostic engine, thin adapters

- Definitions, channel materialization, scale resolution, layout, scene
  generation, reconciliation, and static rendering are plain TypeScript.
- The calculation boundary does not import a framework or require a live DOM.
- A framework-neutral DOM host owns measurement, observers, scheduling, events,
  and cleanup.
- React and Octane adapters only bind that host to their lifecycle and expose
  idiomatic refs, values, and callbacks. They contain no chart semantics.
- React and Octane consume the same definitions and produce equivalent scenes,
  SSR output, responsive behavior, themes, and interaction values.
- Vanilla TypeScript usage is first-class rather than an internal adapter
  detail.

### Extension through inversion of control

- A custom mark declares channels and compiles resolved values into stable
  scene nodes.
- Custom scales, guides, layouts, interactions, and renderers implement focused
  protocols and are passed explicitly. Data transforms remain pure preparation
  functions whose output flows through ordinary channels.
- Renderers consume the scene; the scene kernel does not know about SVG DOM,
  Canvas, React, or Octane.
- Interactions consume stable scene metadata; marks do not import a central
  tooltip or selection system.
- Extensions are locally composed and tree-shakeable. Installing an extension
  never mutates global library state.
- Low-level scene-node access remains available when the mark grammar is not
  enough.

## Pre-release harmony audit — 2026-08-06

The unreleased definition, composition, interaction, motion, native, and
optional-layout work has been reviewed together against the charter above.
The resulting boundaries are:

- Complete charts compose through `composeViews`; `fill`, `grid`, `layer`, and
  `inset` own placement policy, while scale links remain separate. `viewGrid`
  is concise syntax over the same engine. Child host controls fail explicitly
  because one outer definition owns interaction lifecycle.
- Resolved mark layout stays narrower than view composition. Dot placement can
  extend through `createDotLayout`, whose callback receives final bounds,
  measured positions, and radii without gaining scene or lifecycle ownership.
- Semantic preparation remains usable outside a mark. `boxRows` and the two
  regression-row transforms expose typed, source-linked rows; their convenience
  marks reuse those results and add only presentation identity and composition.
- Common algorithm shorthands do not close interoperability. Treemap accepts a
  D3-compatible tiler, Sankey accepts a D3-compatible aligner, and static force
  layout accepts named D3-compatible force factories over private clones.
  Charts still owns validation, immutability, lineage, and responsive scene
  composition.
- Controlled behaviors propose values while the application owns acceptance.
  Rejected pointer, touch, keyboard, pin, and clear proposals repaint the
  accepted snapshot. Continuous cursors use resolved scale inversion by
  default while retaining an explicit override.
- Static SVG, DOM, Canvas, motion SVG, and React Native consume the same scene
  composition and accessibility contracts. Motion interruption removes stale
  exits and presentation state; composite motion retains complete path timing.
- Exact capability paths remain the cost boundary. CI runs both locked bundle
  profiles and comparison provenance, and native guidance prefers exact mark
  and scene imports over the wider universal convenience barrel.
- Repository documentation names unreleased `main` separately from published
  `0.6.5`. Release recovery derives a missing tag from the historical release
  merge rather than current main. Recovery requires an explicit workflow
  dispatch; ordinary pushes with later changesets stay inert because creating
  the tag starts external release automation.

Future work must extend one of these boundaries or record concrete friction in
`API-FRICTION.md`; it should not add a parallel chart-type API, hidden
preparation layer, renderer-specific composition path, or global capability
registry.

## Proof of concept status

### D3 interoperability checkpoint — 2026-07-27

The ground-up engine is now the product proof, not only a proposed direction.
The current package topology is:

- `@tanstack/charts`: grammar, scene kernel, static SVG, vanilla DOM host, and
  strict supplied-scale compiler; optional algorithms are supplied by exact
  TanStack entries or direct named `d3-*` modules
- `@tanstack/react-charts`: lifecycle-only React adapter with full SVG SSR and
  hydration adoption
- `@tanstack/octane-charts`: lifecycle-only Octane adapter with equivalent SSR
  output
- `examples/sandbox`: React workbench for dynamic options, preparation,
  responsive sizing, injected D3 curves, and keyed motion
- `@plot-poc/*`: preserved Observable Plot host research, fixtures, and
  benchmarks

The product profile currently includes:

- Value-compatible arbitrary-data channels, heterogeneous mark data, inferred
  callback datum unions, and built-in mark output types linked to configured
  D3 scales and axis formatters
- `lineY`, `areaY`, `barX`, `barY`, `dot`, `rect`, `cell`, `ruleX`, `ruleY`,
  `text`, responsive facets, guide-free sparklines, and public custom marks
- Raw D3 positional and color scales with TanStack-owned responsive ranges
- D3 ordinal color defaults, D3 continuous color, and opt-in D3 radial mapping
- Straight SVG geometry plus opt-in D3 curve factories through `d3Curve`
- Direct D3 grouping, binning, reduction, and stacking output or
  application-prepared interval rows consumed through ordinary channels
- Responsive axes, grids, labels, optional color legends, and bounded
  automatic margins measured from the actual formatted guide content
- Stable dynamic definitions, shallow input invalidation, separately memoized
  preparation, required inferred host input, and abort lifecycle
- Keyed DOM reconciliation with interruptible geometry and path animation
- Container measurement, fixed or proportional height, resize coalescing,
  zero-to-visible recovery, nearest and grouped pointer/keyboard focus,
  activation callbacks, locale-safe and optionally sticky tooltip output,
  optional spatial indexing, reduced-motion support, inherited browser-font
  measurement, and coalesced relayout after web fonts load
- Automatic light/dark inheritance with CSS-variable and typed theme overrides
- Complete static SVG, React/Octane SSR, React hydration adoption, and optional
  SVG/raster export. SSR and static output use a deterministic text estimator;
  advanced hosts may inject another measurer.

Algorithms compose through values and focused utilities rather than a central
chart-type switch. Raw D3 scales and colors work directly; D3 curves use the
small `d3Curve` grammar bridge. Compact TanStack row transforms and isolated
layout marks provide ergonomic alternatives without closing those D3 paths.
Every materialized positional dimension requires a supplied scale; `null`
explicitly represents an unused dimension. The ordinary runtime, nested
facets, React, and Octane all use this one compiler.

Current verification:

- Strict repository and packed-consumer type contracts pass.
- The standard core, adapter, documentation, and benchmark-protocol test
  matrices pass. Use current command output rather than embedding a test count
  that drifts as the proof expands.
- The Octane server and client matrices pass.
- `bundle:check` passes every profile-specific ceiling.
- The React demo has been browser-validated for responsive behavior, light and
  dark themes, keyed ranking updates, grouped tooltips, zoom clipping, unique
  gradient and clip IDs, and interrupted animation without blank marks.
- The Stats canary has been browser-compared with Plot for two-dimensional
  line focus, axis-prioritized stacked and bar focus, compact and normalized
  tooltip values, click-to-pin behavior, and exact grouped and stacked
  snapshot rectangle geometry in both orientations. Automatic guide bounds
  contain long horizontal labels, rotated vertical labels, titles, and
  endpoints across the history, grouped, stacked, and area surfaces; the
  timeline aligns from the resolved scene margin.
- The dynamic sandbox retains all eight ranking bars during ordinary and burst
  animation updates, with no zero-sized bars or guide overflow.

Type-safety checkpoint:

- Mark sources infer field channels and original callback data.
- Dynamic definitions introduce only `Input`; prepared data, heterogeneous mark
  unions, adapter input, and callbacks infer.
- Built-in positional outputs, including rectangle endpoints and cell
  positions, constrain configured D3 scales and axis formatters. Facets and
  custom marks remain broad only where their positional semantics are not
  declared; the advanced custom-mark factory can split interaction-point and
  scale-value types explicitly.
- Public core, React, Octane, examples, and the Stats migration require no cast
  or adapter generic.
- `ChartPoint.xValue` and `yValue` infer from positional channels through core,
  focus, spatial lookup, React, and Octane. Conditional definitions produce
  honest coordinate unions that consumers narrow normally.
- Memoized adapter surfaces contain private generic-erasure assertions. These
  are tracked in `API-FRICTION.md` and must never appear in consumer guidance.

Directional bundle checkpoint — 2026-07-27:

This table records the post-strict-migration checkpoint retained with this
architecture decision. Exact current measurements and budgets live in
[`bundle-and-performance.md`](./packages/charts-core/docs/bundle-and-performance.md)
and the checked-in bundle fixtures; do not use this historical table as a
current budget.

| Consumer                                    |  Minified |     Gzip |
| ------------------------------------------- | --------: | -------: |
| Legacy `@plot-poc` host core                |   6.97 kB |  2.85 kB |
| D3-scale `lineY` scene                      |  30.73 kB | 12.22 kB |
| D3-scale `lineY` plus static SVG            |  33.71 kB | 13.32 kB |
| D3-scale UTC `lineY` plus static SVG        |  48.18 kB | 17.87 kB |
| D3-scale histogram plus static SVG          |  36.69 kB | 14.46 kB |
| D3-scale facets plus static SVG             |  39.29 kB | 15.17 kB |
| D3-scale arrows plus static SVG             |  33.89 kB | 13.39 kB |
| D3-scale `areaX` plus static SVG            |  39.98 kB | 15.31 kB |
| Frame plus static SVG                       |  13.33 kB |  5.22 kB |
| D3-scale hexagons plus static SVG           |  33.52 kB | 13.26 kB |
| D3-scale links plus static SVG              |  33.47 kB | 13.25 kB |
| D3-scale ticks plus static SVG              |  34.70 kB | 13.64 kB |
| D3-scale vectors plus static SVG            |  34.17 kB | 13.49 kB |
| Representative marks                        |  41.79 kB | 15.52 kB |
| Vanilla DOM host                            |  25.08 kB |  9.65 kB |
| Direct D3 quadtree plus DOM host            |  50.71 kB | 19.67 kB |
| React adapter, React external               |  26.96 kB | 10.25 kB |
| React `lineY`, React external               |  48.01 kB | 18.57 kB |
| Vanilla Stats parity surface                |  83.43 kB | 29.67 kB |
| React Stats parity surface                  |  85.36 kB | 30.28 kB |
| Custom-scale `lineY`                        |  11.95 kB |  4.70 kB |
| D3 linear-scale `lineY`                     |  30.66 kB | 12.18 kB |
| D3 curved `lineY`                           |  37.67 kB | 14.37 kB |
| D3 time plus linear-scale `lineY`           |  45.13 kB | 16.71 kB |
| Minimal Observable Plot line                | 261.54 kB | 89.26 kB |
| Dynamic TanStack Charts sandbox application | 274.08 kB | 87.71 kB |

Automatic guide layout adds about 1.1 kB gzip to a scene compiler. Exact DOM
font measurement and its host lifecycle bring the total default-host increase
to about 2.0 kB gzip. These are measured default-quality costs; the rebased
ceilings remain tight and pass.

Directional rendering checkpoint — 2026-07-27:

| Product render case                           | Median |    p95 |
| --------------------------------------------- | -----: | -----: |
| D3-scale line plus SVG, 78 points, 320px      | 0.17ms | 0.28ms |
| D3-scale line plus SVG, 78 points, 1024px     | 0.15ms | 0.18ms |
| D3-scale line scene, 10,000 points, 1024px    | 1.38ms | 2.22ms |
| D3-scale line plus SVG, 10,000 points, 1024px | 2.99ms | 5.10ms |
| D3-scale keyed host update, 78 points, 1024px | 1.34ms | 4.69ms |

The repository now has automated browser visual, interaction, update,
large-data, and lifecycle evidence through the conformance and stress suites.
Remaining production gaps are tracked by the open and monitoring entries in
`API-FRICTION.md`, public release policy and budgets, and porting the remaining
Plot-backed GIF/WebM frame generator after the TanStack.com default-renderer
cutover.

`pnpm package:check` now builds real package artifacts, packs all three public
packages, installs their tarballs into a disposable offline fixture, and gates
every ESM subpath, strict declaration inference, required dynamic input,
React/Octane runtime loading, and minimal production bundles. Every TanStack
resolution must come from the fixture's packed `dist`; already-installed
third-party dependencies are linked only to keep the check deterministic. This
is a packed exports, declarations, and runtime gate, not a registry
installability claim.

`pnpm bundle:check` byte-locks ordinary scene, SVG, DOM, React, custom-scale,
and representative consumers to reviewed minified and gzip baselines. Optional
UTC, histogram, facet, arrow, `areaX`, frame, hexagon, link, tick, vector,
spatial, and Stats surfaces have isolated ceilings. A baseline change is
explicit even when size decreases, so recovered bytes cannot become silent
future headroom.
Transform and spatial profiles isolate the actual imported capability. Some
exercise compact TanStack utilities; others exercise direct granular D3
imports or D3-backed exact subpaths.

### Historical D3-native product direction — 2026-07-26

This checkpoint records the stricter D3-only direction considered in July. It
was superseded on 2026-08-06 by the D3-compatible, composable primitive contract
above. Its measurements remain useful evidence; its implementation mandate does
not govern current API decisions.

The intended common definition is explicit without becoming chart-type based:

```ts
import { extent, max } from 'd3-array'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { defineChart, lineY } from '@tanstack/charts'
import { d3Curve } from '@tanstack/charts/d3/shape'

const [firstDate, lastDate] = extent(rows, (row) => row.date)
const dates: [Date, Date] =
  firstDate && lastDate
    ? [firstDate, lastDate]
    : [new Date(0), new Date(86_400_000)]
const downloads = max(rows, (row) => row.downloads) ?? 0

const chart = defineChart({
  marks: [
    lineY(rows, {
      x: 'date',
      y: 'downloads',
      z: 'package',
      curve: d3Curve(curveMonotoneX),
    }),
  ],
  x: { scale: scaleUtc().domain(dates).nice() },
  y: { scale: scaleLinear().domain([0, downloads]).nice() },
})
```

TanStack copies each positional scale and supplies its responsive range. It
does not mutate the caller’s scale. The D3 scale owns domain, mapping,
clamping, interpolation, nice behavior, ticks, and tick formatting. Dynamic
definitions reconstruct scales when their semantic data changes; resize only
changes the copied range.

The core grammar requires a configured positional scale for every materialized
x or y channel. A definition uses `null` only when a dimension is intentionally
unused. There is no automatic positional mapping in the scene, runtime, facet,
React, or Octane path. If an automatic profile is ever valuable, it must be a
separate opt-in capability.

Categorical color is the deliberate exception: a D3 ordinal scale over the
active theme palette costs about 0.62 kB gzip and makes grouped charts beautiful
by default. Authors may replace it with any configured D3 color scale.
Continuous color always requires an explicit strategy. Radius values are
screen-space pixels by default; data-driven bubble area requires an explicit
`scaleRadial` or compatible callable. This prevents an ordinary `dot` mark from
silently importing the continuous D3 scale stack.

`d3Curve` is a thin, optional grammar bridge that configures D3’s line and area
generators from one native D3 curve factory. Straight SVG polylines and polygons
do not import `d3-shape`; selecting a curve adds the D3 capability.

The ownership boundary proposed at that checkpoint was:

| TanStack owns                                | D3 owns                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| Marks, channels, facets, and composition     | Scale algorithms and mappings                           |
| Typed channel materialization                | Extent, grouping, reduction, binning, and stacking      |
| Responsive ranges, margins, and guide layout | Curves, paths, areas, arcs, and layout geometry         |
| Scene graph and stable interaction metadata  | Number/time formatting, color, and interpolation        |
| SVG/Canvas serialization and SSR             | Easing, timers, spatial indexes, and nearest structures |
| Keyed host reconciliation and lifecycle      | Geo, hierarchy, force, contour, polygon, and Delaunay   |
| React and Octane adapters                    | Brush, drag, and zoom mechanics when selected           |
| Theme, accessibility, documentation, skills  | Battle-tested mathematical and data semantics           |

Do not use `d3-axis`, `d3-selection`, or `d3-transition` in the renderer-neutral
core. Their live-DOM ownership conflicts with static rendering, SSR, Canvas,
React, Octane, and TanStack’s keyed scene lifecycle. Use the underlying D3
scales, ticks, formats, interpolators, easings, timers, and interaction
algorithms instead.

#### Granularity findings

D3’s named root imports already tree-shake to the reachable source graph.
Private `src/*` imports are blocked by package export maps, lack supported type
declarations, and do not materially shrink a linear scale. Deep imports and
package-manager patches are not acceptable product architecture.

Measured isolated scale floors:

| D3 scale capability |     Gzip |
| ------------------- | -------: |
| Ordinal             |  0.62 kB |
| Band                |  1.05 kB |
| Point               |  1.11 kB |
| Linear              |  7.84 kB |
| Log                 |  8.07 kB |
| UTC                 |  9.87 kB |
| Common scale family | 14.02 kB |

Continuous scales are expensive because their published semantics include
generic interpolation, D3 color parsing, number formatting, inversion,
clamping, polymaps, ticks, and nice domains. This is useful behavior, not barrel
overhead. A direct D3 linear-scale line scene is 11.09 kB gzip, adding a D3
monotone curve makes it 13.29 kB, and a D3 UTC plus linear scene is 15.62 kB.
All remain dramatically smaller than the 89.26 kB minimal Observable Plot line
while retaining D3’s behavior.

The public proof now accepts raw configured D3 scales directly:

```ts
defineChart({
  marks: [lineY(values)],
  x: { scale: scaleLinear().domain([0, values.length - 1]) },
  y: { scale: scaleLinear().domain([0, 100]) },
})
```

No TanStack scale wrapper is required. The compiler and public definition types
reject missing positional scales. Static definitions, dynamic definitions,
nested facets, React, Octane, the sandbox, shared fixtures, and the TanStack
Stats canary all use the same strict path.

#### Migration sequence

1. **Complete:** strict scale resolution runs through the vanilla runtime,
   React, Octane, dynamic definitions, and nested facets.
2. **Complete:** Stats, shared fixtures, benchmarks, and the sandbox use raw D3
   scales; automatic positional inference is unreachable from the compiler.
3. **Complete:** legacy inferred scale, radius, continuous-color, curve,
   transform, and spatial convenience exports are deleted. Raw positional,
   color, and radius scales are the only ordinary scale path.
4. **Complete for the current grammar:** curved line and area topology delegates
   to `d3-shape`; applications call D3 grouping, binning, reduction, and
   stacking directly and feed their output into ordinary channels. Straight
   SVG paths remain renderer serialization and carry no shape dependency.
5. **In progress:** ordinary nearest selection uses `d3-array`; dense spatial
   indexing is supplied through `ChartSpatialIndexFactory` using direct
   `d3-quadtree`, Delaunay, or another application choice. Attribute
   interpolation and easing still need a separately importable motion driver
   so ordinary DOM rendering does not inherit their cost.
6. **Pending:** add polar, polygon, contour, hierarchy, force,
   Delaunay/Voronoi, geo, brush, drag, and zoom only as explicit D3-backed
   capability profiles.
7. **Pending:** delete the parallel D3 experiment after the product package has
   absorbed its differential coverage.

The documentation and future TanStack Intent skills should teach the explicit
D3 construction patterns. Runtime conveniences must earn their bundle and
semantic cost; saving an AI a few tokens is not sufficient justification.

### Historical granular D3 backend experiment — 2026-07-26

The conclusions in this historical section record what the fork measured. Its
recommendation to make D3 mandatory is superseded by the current compatibility
contract above.

`@tanstack/charts-d3` is a private, same-API fork used to test D3 as the
mathematical kernel. It preserves TanStack-owned marks, scene graph,
reconciliation, animation, interaction, SVG, DOM host, and framework boundary.
It replaces scale mapping, ticks, formatting, color interpolation, curves,
grouping, binning, reducers, and diverging stacking with direct named imports
from `d3-array`, `d3-format`, `d3-scale`, and `d3-shape`. It never imports the
`d3` umbrella, D3 selection, D3 transition, or a D3 DOM layer.

The fork proves that D3 can sit behind the existing grammar without changing
application definitions. The copied contract suite passes, and a differential
Stats suite preserves point and mark geometry across line, stacked, share,
stream, zoomed, grouped-bar, and stacked-bar modes. D3 curve path strings differ
from the native implementation but produce equivalent geometry. The experiment
adds 12 files and 47 passing tests; the combined standard workspace suite is 33
files and 121 tests.

The identical-consumer bundle comparison is not a wash:

| Consumer                    | Native gzip |  D3 gzip |  D3 delta |
| --------------------------- | ----------: | -------: | --------: |
| `lineY` scene               |     4.35 kB | 16.97 kB | +12.62 kB |
| `lineY` plus static SVG     |     5.46 kB | 18.07 kB | +12.61 kB |
| UTC `lineY` plus static SVG |     7.32 kB | 18.16 kB | +10.84 kB |
| Histogram plus static SVG   |     6.86 kB | 20.05 kB | +13.19 kB |
| Representative marks        |     7.36 kB | 20.01 kB | +12.65 kB |
| Vanilla DOM host            |     8.28 kB | 20.84 kB | +12.56 kB |
| Stats parity surface        |    15.32 kB | 27.79 kB | +12.47 kB |

Isolated granular floors explain the result:

| Imported D3 capability                       |     Gzip |
| -------------------------------------------- | -------: |
| `d3-array` numeric extent and ticks          |  0.61 kB |
| One `d3-scale` linear scale                  |  7.84 kB |
| Required positional and color scale families | 14.02 kB |
| `d3-shape` line and curve factories          |  2.05 kB |
| Group/bin/reducers plus diverging stack      |  2.40 kB |

`d3-scale` is the dominant cost because even a linear scale retains continuous
interpolation and formatting infrastructure. A complete D3 scale family alone
is the same gzip size as the entire native Stats surface. Fine-grained package
imports work, but package granularity is not equivalent to algorithm
granularity.

The JSDOM benchmark shows no reason to choose between the backends on speed.
The 78-point D3 scene and keyed update were slightly faster in this run; the
10,000-point cases were effectively equal at the median and had a somewhat
higher D3 p95. All remain well below Plot construction time. These local
sub-millisecond differences are less important than the repeatable bundle
delta.

Historical decision at that checkpoint, now superseded:

- Do not make `d3-scale` or a general D3 rendering backend mandatory.
- Keep the small native cartesian kernel and harden it with differential tests
  against D3, standards-based edge cases, and visual references.
- Use `d3-array` for automatic numeric extent, nice domains, and ticks. Use
  `d3-time` for local and UTC calendar ticks. They replace sensitive algorithms
  at small, isolated costs and tree-shake out of the explicit-scale compiler.
- Add focused D3 adapters or recipes only when they expose a real public
  capability. Merely hiding D3 under the same API does not create a more
  D3-native authoring experience.
- Preserve D3 terminology and interoperability in documentation and skills so
  AI can use its strong D3 knowledge without forcing every browser bundle to
  ship D3.
- Keep the experiment and its benchmarks until the native scale, curve, and
  transform coverage has production visual regression tests. It remains a
  useful oracle, not a shipping package.

#### Historical selective D3 follow-up

Replacing the whole mathematical kernel obscures a few narrower trades that are
much closer to neutral. Isolated native and D3 kernels, plus hybrid consumer
builds that keep the TanStack scene and renderer, measure:

| Capability                 | Native gzip | D3 gzip | Consumer delta | Direction                                           |
| -------------------------- | ----------: | ------: | -------------: | --------------------------------------------------- |
| Extent, nice, linear ticks |     0.46 kB | 0.61 kB |       ~0.15 kB | Adopted in automatic numeric scales                 |
| Easing presets             |     0.13 kB | 0.14 kB |       ~0.01 kB | Size wash; functions already compose                |
| Calendar ticks             |     0.88 kB | 2.03 kB |       +1.11 kB | Adopted in local/UTC temporal scales                |
| Common curves              |     0.61 kB | 2.05 kB |       +1.51 kB | Keep native common curves; adapt advanced D3 curves |
| Group, bin, stack          |     1.38 kB | 2.40 kB |       +1.37 kB | Reasonable optional transform profile               |
| Spatial lookup             |     0.37 kB | 1.92 kB |       +1.70 kB | Keep grid default; quadtree optional                |
| Compact number formatting  |     0.21 kB | 2.14 kB |       +1.93 kB | Keep native formatter                               |
| General interpolation      |           — | 3.82 kB |              — | Too broad for mandatory motion                      |

The consumer deltas are measured directly where a meaningful chart fixture
exists: native versus D3 time ticks in the same UTC line, native versus D3
monotone curves in the same SVG line, native versus D3 binning in the same
histogram, and native grid versus D3 quadtree in the same DOM host.

At that checkpoint, this changed the recommendation from “no D3” to a more
precise boundary. The product direction above has since superseded the
recommendation while preserving these measurements:

- `d3-array` now owns automatic extent, nice-domain, and linear-tick behavior.
  The complete ordinary line scene grew by 0.33 kB gzip.
- `d3-time` now owns local and UTC calendar ticks. It removes the most
  calendar- and DST-sensitive native code; the UTC SVG fixture grew by 1.30 kB
  gzip while numeric and categorical charts pay no temporal-code cost.
- `d3-ease` is effectively size-neutral, but the existing custom-easing
  function seam already lets applications use it directly. A library
  dependency adds little unless TanStack exposes a larger named easing catalog.
- D3 binning and stacking are reasonable behind an explicit advanced-transform
  entry. They should not become dependencies of charts that do not transform
  data in the browser.
- D3 curves and quadtrees should remain adapters for capabilities beyond the
  small native set. Delaunay is too expensive for nearest-point lookup alone.
- D3 formatting, interpolation, scales, axes, selection, and transitions do
  not approach a mandatory-core trade.

#### Historical required-scale protocol spike

This table records the transitional protocol spike before the strict compiler
and current bundle matrix above. Its measurements are retained for the design
history, not as current package sizes.

Scale inference and scale implementation are separable. The scene compiler now
has a strict explicit-scale path, accepts configured D3 scales directly, and
retains a public resolver protocol for non-D3 extensions:

- The chart owns margins, the responsive pixel range, and the requested tick
  count.
- The supplied scale owns domain, mapping, ticks, labels, and bandwidth.
- A D3-like callable scale is copied and receives the responsive range. Band
  output is normalized to band centers for marks and axes.
- A custom resolver may receive materialized channel values and zero-baseline
  intent, but the D3-first common path configures domains explicitly.
- `createChartScene` rejects a missing x or y scale rather than silently
  falling back.

Measured line-scene profiles:

| Scale ownership                       |     Gzip |
| ------------------------------------- | -------: |
| Explicit tiny application scale       |  3.51 kB |
| Transitional automatic TanStack scale |  5.03 kB |
| Explicit configured D3 linear scales  | 11.01 kB |
| Explicit D3 monotone + linear scales  | 13.21 kB |
| Explicit configured D3 UTC + linear   | 15.53 kB |

The protocol can shed the automatic layer completely. Full D3 linear scales add
5.98 kB over the transitional automatic path because they intentionally retain
far more behavior. Therefore:

- Make explicit D3 scale ownership the destination for the grammar.
- Preserve the current automatic path only during the Stats and adapter
  migration, then remove it from the product kernel.
- Put common explicit scale construction in recipes and skills rather than a
  second mathematical implementation.
- Treat “responsive range belongs to the chart” as part of the scale protocol.
  Requiring callers to recompute D3 ranges on every resize would leak host
  lifecycle concerns into definitions.

D3 becomes substantially more attractive when it supplies an entire optional
capability that TanStack does not yet own:

| Optional capability  | D3 gzip floor | Likely use                                |
| -------------------- | ------------: | ----------------------------------------- |
| Polygon operations   |       0.62 kB | Hulls, lasso containment, polygon metrics |
| Pie and arc geometry |       2.74 kB | Polar profile                             |
| Contours and density |       3.22 kB | Advanced distributions                    |
| Hierarchy layouts    |       4.57 kB | Tree, cluster, pack, treemap              |
| Force layouts        |       5.56 kB | Network profile                           |
| Delaunay/Voronoi     |       7.14 kB | Voronoi interaction and triangulation     |
| Geographic geometry  |       9.21 kB | Geo profile                               |

These should expose focused TanStack mark or layout adapters while preserving
the underlying D3 concepts and types. They are better engineering trades than
rewriting mature computational geometry, and their cost remains absent until a
consumer imports the profile.

### Historical Observable-host proof

The baseline and dynamic-renderer vertical slices below record the earlier
Observable Plot host experiment. They remain useful comparison evidence but no
longer describe the native product package topology.

#### Implemented boundaries

- `@plot-poc/host-core`
  - Framework-neutral controller
  - Container measurement
  - Resize scheduling and coalescing
  - Zero-size recovery
  - Render replacement and deterministic cleanup
  - Stateful per-host renderer updates
  - Reduced-motion preference tracking
  - Theme resolution
  - Renderer value bridging
  - Fixed, aspect-ratio, and fill sizing contracts
- `@plot-poc/observable`
  - Direct Observable Plot definitions
  - Stable definition objects with arbitrary typed input
  - Shallow input memoization with definition-level overrides
  - Separately memoized `prepare` work
  - Optional previous-to-next Plot reconciliation
  - Host-owned dimensions and `document`
  - Plot `value` and `input` event bridging
  - Theme-aware Plot style defaults
- `@plot-poc/react-host`
  - Generic React chart host
  - `@plot-poc/react-host/observable` definition adapter
  - Strict Mode-safe cleanup
  - SSR-safe host output
- `@plot-poc/octane-host`
  - Native `.tsrx` chart host
  - `@plot-poc/octane-host/observable` definition adapter
  - Client lifecycle
  - SSR-safe host output
- Shared proof fixtures
  - NPM-style package download trend
  - Responsive faceted latency histogram
- React and Octane Vite applications using the same data, definitions, and renderer instances
- An interactive React sandbox covering dynamic options, preparation caching,
  resize, themes, keyed animation, and interrupted updates

The proof currently targets Observable Plot `0.6.17`, React `19.2.3`, and the published Octane `0.1.13`. The adjacent local Octane checkout was `0.1.8`; the published version is the relevant consumer target.

#### Validated behavior

- All three applications build in production mode.
- Core, Plot, React, Octane client, and Octane SSR tests pass.
- React and Octane render the same shared Plot definitions.
- Browser validation passed at 1280 and 320 pixel viewports.
- No horizontal document overflow occurred at the tested widths.
- The distribution switches from horizontal `fx` facets to vertical `fy` facets in a narrow container.
- Automatic light and dark switching updates resolved Plot colors in both frameworks.
- Plot pointer interaction updates application state in both frameworks.
- React Strict Mode and Octane client cleanup are exercised.
- React and Octane render a labeled, stable SSR host without running the client renderer.
- Fixed sizing reserves the requested Plot drawing height while allowing an external Plot legend or caption to expand the host.
- Unrelated parent renders do not redraw stateful Plot definitions.
- Visual-only input changes redraw without repeating cached preparation.
- Dynamic data changes invalidate preparation.
- Keyed bar transitions can be interrupted and restarted from live SVG geometry.
- Theme and resize updates replace Plot output without triggering semantic-data motion.
- The dynamic sandbox was browser-validated at 1280 and 390 pixel viewports with
  no horizontal overflow.

#### Historical bundle measurements

Measured by `pnpm bundle` with esbuild minification and Node gzip. These are local directional measurements, not release claims.

| Bundle                                  |  Minified |      Gzip |
| --------------------------------------- | --------: | --------: |
| Legacy Plot POC host core               |   6.97 kB |   2.85 kB |
| Native `lineY` scene                    |   7.46 kB |   3.06 kB |
| Native `lineY` plus static SVG          |   9.75 kB |   3.93 kB |
| Native DOM host                         |   9.59 kB |   3.90 kB |
| React native adapter, React external    |  10.50 kB |   4.24 kB |
| React native `lineY`, React external    |  12.26 kB |   4.93 kB |
| Plot renderer integration               | 236.69 kB |  83.34 kB |
| Stateful Plot renderer                  | 263.81 kB |  90.14 kB |
| React host                              |  16.04 kB |   6.13 kB |
| React + Plot adapter                    | 252.94 kB |  88.87 kB |
| Plot minimal line                       | 261.54 kB |  89.26 kB |
| Plot representative marks               | 269.81 kB |  92.21 kB |
| Escaped Plot namespace                  | 384.57 kB | 131.27 kB |
| React proof application                 | 467.34 kB | 151.70 kB |
| Octane proof application                | 375.17 kB | 124.62 kB |
| Dynamic sandbox app                     | 476.16 kB | 154.01 kB |
| React native-grammar proof application  | 201.16 kB |  63.64 kB |
| Octane native-grammar proof application | 108.20 kB |  35.92 kB |

The measurements reinforce the proposed architecture:

- The framework-neutral production host can remain around 3 kB gzip.
- The mark/channel `lineY` scene with scale and guide inference is 3.06 kB
  gzip. Adding complete static SVG output brings it to 3.93 kB gzip, below the
  provisional 5 kB minimal-chart gate.
- The vanilla DOM host is 3.90 kB gzip. The React adapter is 4.24 kB gzip with
  React external, about 0.34 kB above the equivalent vanilla host. A complete
  React `lineY` consumer is 4.93 kB gzip with React external.
- The Plot integration itself reaches Plot’s roughly 83 kB gzip floor.
- The stateful definition path with a minimal line is about 0.9 kB gzip above
  the equivalent minimal-line bundle.
- Keeping legacy and stateful creation behind one overloaded renderer helper
  adds about 0.6 kB gzip to the bare Plot integration versus the earlier
  baseline. A separate entry point should still be measured before finalizing
  topology.
- A representative mark set adds only about 9.4 kB gzip over the renderer integration.
- Escaping the full Plot namespace adds roughly 48.5 kB gzip over the renderer integration.
- Named Plot imports and whole-chart lazy boundaries remain the correct authored default.

The complete proof applications include both charts, Plot, their framework runtime, shared data, and demo application code. Their totals are not package overhead measurements.

#### Historical rendering measurements

Measured by `pnpm performance` using JSDOM, 5 warmups, and 30 recorded
constructions or updates. Use these as a repeatable local regression baseline,
not browser performance claims.

| Render case                                        |  Median |      p95 |
| -------------------------------------------------- | ------: | -------: |
| Observable trend · 78 points · 320px               | 3.08 ms |  7.95 ms |
| Observable trend · 78 points · 1024px              | 3.52 ms | 11.75 ms |
| Observable faceted histogram · 288 points · 320px  | 1.24 ms |  7.86 ms |
| Observable faceted histogram · 288 points · 1024px | 1.24 ms |  1.82 ms |
| Native line plus SVG · 78 points · 320px           | 0.13 ms |  0.21 ms |
| Native line plus SVG · 78 points · 1024px          | 0.12 ms |  0.23 ms |
| Native line scene · 10,000 points · 1024px         | 2.00 ms |  3.95 ms |
| Native line plus SVG · 10,000 points · 1024px      | 3.18 ms |  4.86 ms |
| Observable stateful trend update · 78 points       | 3.20 ms |  4.77 ms |

#### Design findings

- A stable definition whose `plot` function receives input, prepared data,
  dimensions, document, signal, theme, and reduced-motion state is sufficient
  for both common and advanced Plot charts.
- Framework adapters can remain thin because lifecycle, sizing, themes, and value bridging belong in the shared controller.
- Callback changes and structurally equal sizing or initial-size objects must not trigger chart replacement. This is enforced in core to make inline framework props safe.
- Plot may return a `<figure>` when legends or captions are present. Native figure margins must be reset, and host height cannot be assumed to equal Plot’s SVG height.
- Fixed `height` should describe the Plot drawing area. The host reserves that minimum but may grow around external Plot chrome.
- An Octane build alone is insufficient validation. Separate client and forced-server compiler tests catch hook-slot and runtime-target mistakes.
- Plot’s `input` event is enough for a small, framework-neutral pointer-value bridge.
- A reusable renderer must create per-mounted-chart state. Shared module-level
  renderer closures cannot safely own previous output or active animation.
- Plain-object shallow equality makes inline declarative input practical without
  hiding the immutable-input contract.
- Preparation needs its own equality boundary so visual changes do not repeat
  data-only transforms.
- A stateful update still constructs a complete next Plot. Its measured cost is
  therefore comparable to direct construction; the benefit is cached
  preparation, lifecycle continuity, and reconciliation rather than an
  incremental Plot engine.
- A generic transition seam should provide resolved previous and next Plot
  elements and contexts. Mark-specific correspondence remains definition or
  optional-motion-package work.

#### Remaining work identified by the host proof

- Real server-render-to-hydrate adoption tests in React and Octane
- Zero-to-visible and rapid-resize browser tests
- A chart-level dynamic import example and chunk analysis
- Production-browser render and interaction benchmarks
- Accessibility audit beyond Plot’s semantic output and labeled hosts
- Export extension prototype

## Historical engine strategy evaluation

This section records the evidence and alternatives considered before the
historical D3-native checkpoint. Its native-inference assumptions and
provisional budgets are superseded by the current compatibility contract.

The current proof validates the host, adapter, definition, memoization, theme,
responsive, and transition boundaries. It does not yet settle the production
visualization engine.

### Evidence

- Published Observable Plot exposes one supported ESM entry and no
  feature-specific subpaths.
- Importing Plot’s internal `plot.js` directly instead of its public root saves
  effectively nothing in the measured minimal builds.
- An experimental per-package D3 facade reduced the exact TanStack renderer
  entry from 85.34 kB to 79.52 kB gzip. This demonstrates removable coupling,
  but not enough savings on its own to justify a permanent fork.
- Plot’s central renderer statically references axes, facets, legends, pointer
  and tip behavior, projections, and its scale registry. Meaningful additional
  reduction requires changing the engine architecture rather than changing
  consumer import syntax.
- Plot is a manageable implementation size with a strong unit and snapshot
  corpus. It is mature but not frozen: upstream main continues to receive
  incremental marks, scales, interactions, fixes, and type work even though the
  latest published release remains `0.6.17`.
- Current TanStack.com usage is concentrated in `lineY`, `areaY`, `barX`,
  `barY`, `rect`, `rectY`, `dot`, `ruleX`, `ruleY`, `tip`, pointer transforms,
  and cumulative mapping. This is strong evidence that a small cartesian
  profile can cover the first-party migration without reproducing Plot’s full
  surface.

### Native mark/channel spike

The first React Charts revival spike proved a small shared scene boundary but
used a normalized `series.type` model. That model has now been replaced by the
first Plot-style native grammar slice. The temporary package names remain
implementation scaffolding:

- [`packages/charts-core`](./packages/charts-core)
  - Dependency-free TypeScript mark protocol and scene calculation
  - `defineChart`, `lineY`, `createMark`, `createChartScene`, static SVG, and a
    vanilla responsive DOM host
  - No React, Octane, D3, global registry, or live DOM in scene calculation
- [`packages/react-charts`](./packages/react-charts)
  - Lifecycle-only React adapter over the vanilla host
  - Complete SVG SSR through the shared static renderer
- [`packages/octane-charts`](./packages/octane-charts)
  - Lifecycle-only native TSRX adapter over the same host
  - Equivalent complete SVG SSR

The implemented vertical slice includes:

- Arbitrary objects, tuples through accessors, iterables, and raw numeric arrays
- Typed field-name and accessor channels
- One flat dataset split into multiple lines through `z`
- Explicit stable datum keys with an index fallback
- Mark-local data and heterogeneous datum types across marks
- Public custom-mark inversion of control through `createMark`
- Linear, local-time, and UTC scale inference
- Responsive tick density, margins, labels, grids, and compact typography
- Renderer-neutral keyed groups, rules, polylines, dots, rectangles, and labels
- A shared escaped static SVG renderer
- Original-datum preservation, nearest-point lookup, and a focus-ring bridge
- A responsive vanilla host shared by React and Octane
- CSS-variable palettes and automatic light/dark inheritance

Validated measurements:

| Native grammar slice          |  Minified |     Gzip |
| ----------------------------- | --------: | -------: |
| `lineY` scene                 |   7.46 kB |  3.06 kB |
| `lineY` plus static SVG       |   9.75 kB |  3.93 kB |
| Vanilla DOM host              |   9.59 kB |  3.90 kB |
| React adapter, React external |  10.50 kB |  4.24 kB |
| React `lineY`, React external |  12.26 kB |  4.93 kB |
| React proof application       | 201.16 kB | 63.64 kB |
| Octane proof application      | 108.20 kB | 35.92 kB |

All 33 workspace tests pass across the standard, Octane server, and Octane
client suites. TypeScript passes, both native applications build, and formatting
is clean.

React was browser-validated at 1280 and 390 pixel widths in light and dark
themes with no document overflow. The single grouped `lineY` mark produced
three lines, raw `number[]` rendered without a data model, and live pointer
focus survived the application state render caused by its datum callback.
Octane rendered the same definitions and passed the same live pointer bridge at
1280 pixels without overflow or browser diagnostics.

### What the native spike proves

- A pure scene is a viable cross-framework adapter protocol.
- Full server rendering is simpler when scene calculation has no DOM
  dependency.
- Arbitrary source data and typed accessors do not require a dataframe or
  runtime schema.
- Responsive axes and useful pointer behavior do not require D3 or a large
  interaction dependency.
- Framework adapters can be very small.
- A built-in mark can use the same public protocol as a custom mark.
- Static SVG, vanilla DOM, React, and Octane can consume one scene and renderer.
- Plot-style grouping removes the repeated per-series data filtering required
  by the first React Charts spike.
- Chart options do not need memoization for correctness. Equality and caching
  remain performance controls owned by the host.

### What must change before it becomes the native engine

The spike validates the grammar boundary, not the standard cartesian profile.

- Measure and isolate the bare scene kernel independently from scales, guides,
  marks, SVG, and the DOM host.
- Time ticks still approximate months and years with fixed millisecond
  intervals. Locale and time-zone formatting are configurable, but production
  temporal scales need calendar-correct tick placement.
- Nearest-point lookup is linear. Keep it for small scenes, but allow an
  optional spatial index without affecting the base bundle.
- Consolidate the new vanilla host with the lifecycle, theme observation,
  scheduling, and cancellation behavior already proven in the preserved
  `@plot-poc/host-core` package.
- Axis and scale modeling must grow from one x and one y scale to named scales
  and axes without encouraging misleading dual-axis defaults.
- Keyboard navigation, legends, areas, bars, transforms, facets, custom scale
  injection, and keyed scene reconciliation remain unimplemented.
- The native definition still needs the stable dynamic-input and independently
  memoized preparation contract proven by the Observable adapter.

### React Charts lessons to retain

Preserve the useful jobs of the archived React Charts project:

- Responsive Cartesian charts
- Arbitrary source data and accessors
- Multiple series and named axes
- Strong pointer interaction
- Direct ownership of ordinary application charts

Do not preserve:

- React types in the data or engine model
- D3 objects in public types
- Render-time datum mutation
- Required user memoization for correctness
- One large runtime containing every series, interaction, curve, and animation
  feature
- Historical API compatibility when it conflicts with a smaller, clearer
  grammar

### Strategies under consideration

| Strategy                | Advantage                                             | Primary cost                                                        |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Upstream modularization | One ecosystem and documentation source                | Requires upstream agreement and must preserve all existing behavior |
| API-compatible fork     | Fastest path to measured build profiles               | Recurring rebase work in the most coupled engine files              |
| TanStack-native engine  | Clean architecture for modularity, updates, and types | New engine semantics, documentation, and long-term ownership        |

An experimental fork is a valid research tool even if it is never shipped. A
ground-up engine must earn its existence through substantial bundle savings,
better dynamic behavior, and simpler authored code. Novelty alone is not a
reason to own a visualization engine.

## Historical proposed Plot-inspired native engine subset

This was the smallest proposed feature set for evaluating a ground-up engine.
It is retained as design history; automatic inference and TanStack-owned
mathematical primitives in this section are not current guidance.

### Strengths to preserve from Plot

- Ordinary arrays and objects as data
- Field names, constants, and accessor functions as channel values
- Layered, composable marks instead of fixed chart types
- Automatic scale-domain and axis inference with explicit overrides
- Pure, composable transforms local to a visualization
- Concise object options
- Faceting and small multiples
- Custom marks and render escape hatches
- Detached output with injected `document` support
- SVG that can be inspected, styled, serialized, and tested

For the supported subset, source compatibility with familiar Plot names and
channel semantics is desirable. A native engine should not claim full
Observable Plot compatibility. Unsupported behavior should fail clearly, and a
maintained compatibility matrix should distinguish identical, adapted, and
unsupported behavior.

### Kernel

The kernel should own only:

- Typed mark, channel, scale, transform, and scene-node protocols
- Channel materialization and datum identity
- Capability collection from the marks in a definition
- Scale inference and explicit scale resolution
- Dimension, margin, and facet layout coordination
- A deterministic intermediate scene graph with stable keys
- Diagnostics, cancellation, and cleanup contracts

The kernel must not import concrete marks, optional scale families, pointer
logic, geographic projections, SVG or Canvas renderers, raster code, export
codecs, or animation dependencies.

```text
definition
  -> materialized channels
  -> required scales and capabilities
  -> layout
  -> stable scene graph
  -> injected renderer
       -> SVG DOM, static SVG, Canvas, or custom output
```

The scene graph is a deliberate improvement over DOM-based reconciliation. It
should make dynamic updates, animation, accessibility inspection, and renderer
testing possible without scraping generated SVG geometry.

### Standard cartesian profile

This profile should cover the overwhelming majority of application and
TanStack.com charts.

#### Marks

- `line`
- `area`
- `bar`
- `rect` or `cell`
- `dot`
- `rule`
- `text`

Orientation conveniences such as `lineY`, `areaY`, `barX`, `barY`, `ruleX`,
and `ruleY` may remain thin constructors over these primitives. Box plots,
lollipops, ranges, candlesticks, thresholds, and similar charts should normally
be compositions or recipes rather than new runtime marks.

#### Channels

- `x`, `x1`, `x2`
- `y`, `y1`, `y2`
- `z` or series identity
- `fill`, `stroke`
- `fillOpacity`, `strokeOpacity`, `opacity`
- `r`
- `text`
- `title`
- `href`
- Explicit datum `key`
- Mark-level ARIA label and description

#### Scales

- Linear, power or square-root, logarithmic, and symmetric-log quantitative
  scales
- Band, point, and ordinal scales
- Local-time and UTC temporal scales
- Ordinal, sequential, diverging, threshold, and quantile color scales
- Radius and opacity scales
- Named scale identifiers and explicit channel-to-scale binding
- Explicit or inferred domains
- `nice`, clamp, reverse, unknown, interval, and range control

Color-scheme catalogs must be isolated from the scale kernel so using an
explicit palette does not retain every built-in scheme.

#### Axes, grids, and legends

- Automatic positional axes
- Explicit named secondary axes without automatic dual-axis defaults
- Explicit axis suppression and placement
- Grid lines
- Tick count, values, formatting, rotation, and density control
- Axis and scale labels
- Categorical swatch legends
- Continuous color ramps
- Layout hooks for legends outside the SVG drawing region

#### Transforms

- Filter, sort, reverse, and map
- Group and reduce
- Bin
- Stack with common offsets and ordering
- Window, cumulative sum, and rolling calculations
- Normalize

Transforms remain chart-local derivations. General data cleaning, profiling,
joining, and exploration stay in application code and skills.

#### Facets

- Row and column facets
- Shared and independent positional domains
- Facet labels
- Empty-facet policy
- Responsive single-column fallback as an authored definition decision

### First optional profiles

#### Interaction

- Nearest-datum pointer in two dimensions or constrained to x or y
- Tooltip or tip content with additional channels
- Hovered or focused datum value
- Keyboard focus for interactive marks
- Controlled selection bridge

Brush, zoom, and cross-chart coordination should follow only after the pointer
and controlled-selection contracts are proven.

#### Polar

- Arc mark
- Angle and radius channels
- Pie, donut, radial bar, and gauge compositions

Plot does not need to define the ceiling here. A small polar profile covers a
common dashboard expectation without putting polar geometry in the cartesian
kernel.

#### Advanced distributions

- Density
- Contour
- Raster
- Hexbin

These may share a separate numeric or raster capability and must not affect the
standard profile.

#### Geographic

- Geographic projection protocol
- GeoJSON mark
- Sphere and graticule helpers
- Geographic path and clipping

Projection catalogs and topology utilities must be separate dependencies.

#### Layout and graph

- Link
- Tree and cluster layouts
- Collision or repel initializers
- Delaunay and Voronoi helpers

These should be added only for real consumers; dependency-graph and network
visualizations may remain custom SVG or application recipes initially.

#### Motion and export

Motion, SVG export policy, raster export, and video rendering remain host
capabilities operating on the stable scene graph. They are not dependencies of
the visualization kernel.

### Required chart coverage

A native engine prototype is not credible until it implements these definitions
without bespoke renderer code:

1. Sparkline
2. Single and multi-series time trend
3. Cumulative and stacked area
4. Vertical and horizontal grouped, stacked, and ranked bars
5. Scatter and bubble comparison
6. Histogram
7. Box or interval plot composed from primitives
8. Heatmap or cohort matrix
9. Faceted distribution
10. Thresholds, reference rules, ranges, and text annotations
11. Interactive pointer and custom tooltip
12. A custom mark
13. Pie or donut through the optional polar profile

It must also reproduce the generic behavior of TanStack.com’s
`TimeSeriesChart`, `SkillSparkline`, and the reusable visualization portion of
NPM Stats.

### Explicit initial exclusions

- Runtime AI or chart recommendation
- Dataframes, query execution, transport, or caching
- Three-dimensional rendering
- WebGL
- Canvas as a default renderer
- Sankey, chord, force simulation, and specialized network layouts
- Every Observable Plot mark and historical edge case
- Full package-level drop-in compatibility with `@observablehq/plot`

### Packaging constraints

- Concrete marks and optional capabilities must be statically importable.
- No global feature registry or module side-effect registration.
- Marks must declare the scale and layout capabilities they require.
- The common profile may provide convenient inference, while lower-level entry
  points permit explicit composition.
- No D3 umbrella import.
- A chart that does not use geo, raster, polar, interaction, motion, or export
  must not retain those implementations.
- React and Octane remain adapters over the same framework-neutral engine.

### Provisional native-engine decision gates

The native path proceeds beyond a prototype only if:

- The bare scene kernel remains below 2 kB gzip.
- A minimal SVG line chart with a linear scale remains below 5 kB gzip.
- A production time-series chart with temporal scales and axes is no more than
  12 kB gzip.
- A representative interactive dashboard chart is no more than 25 kB gzip.
- The complete standard cartesian profile remains below 35 kB gzip.
- Each framework adapter adds no more than 1.5 kB gzip over equivalent vanilla
  TypeScript usage, with its framework runtime external.
- The common interactive profile remains at least 50% smaller than the
  equivalent Observable Plot integration.
- Geo, raster, polar, motion, and export remain absent from those bundles.
- The three TanStack.com migration fixtures retain visual and interaction
  behavior with equal or simpler application code.
- Dynamic updates use stable keys and do not require DOM geometry scraping.
- React, Octane, SSR, static rendering, themes, and accessibility use the same
  host contracts already validated by the POC.
- An AI can author and modify the supported subset without inventing APIs.
- Adding an optional profile does not require modifying the kernel.
- Common render and keyed-update benchmarks have explicit regression budgets
  across small, medium, and large data fixtures.
- The visual reference suite passes at compact, ordinary, and wide container
  sizes in both light and dark themes.

If these gates fail, TanStack Charts should retain Observable Plot and apply the
host, documentation, lazy-loading, and upstream-modularization work already
validated by the current proof.

## Product principles

### Preserve Plot’s strengths

- Keep marks, channels, supplied scales, prepared transform output, and facets
  as the conceptual model.
- Preserve escape hatches including custom marks, accessors, direct D3
  algorithms, and direct rendering.
- Do not replace the grammar with a catalog of fixed chart components.
- Use Observable Plot as the conceptual grammar reference while documenting the
  implemented TanStack compatibility subset explicitly.

### Keep intelligence out of the runtime

Data exploration and visualization advice belong in documentation and skills, not the browser bundle.

The runtime should not profile datasets, clean data, infer schemas, recommend chart types, interpret natural language, query data sources, or run an agent session. Those jobs can be performed by an AI harness using the package’s documentation and, later, bundled skills generated with TanStack Intent.

### Optimize for generated and maintained code

- Small, stable concepts with strong TypeScript types
- Ordinary arrays and objects as data
- Explicit chart definitions that are easy to inspect
- Complete, working examples instead of disconnected snippets
- Consistent React and Octane APIs
- Useful errors at the host boundary
- No hidden global registries or magic discovery
- No unsupported deep imports or bundler tricks

### Production defaults with an open ceiling

Simple charts should be short to author and good by default. Advanced charts
must retain an open ceiling through layered composition, custom marks,
direct D3 algorithms, and low-level rendering. The preserved Observable proof
remains a research oracle, not the product runtime.

Every common capability follows progressive disclosure:

1. With no configuration, produce a polished, responsive, accessible result
   from the channels the author has already declared.
2. Accept declarative channel mapping and focused options for the common
   variations.
3. Expose a typed structured model for custom composition.
4. Allow complete inversion of control over rendering, state, and lifecycle.

The first layer is the product, not a demo shortcut. Automatic behavior should
cover the expected 90% case and remain deterministic, inspectable, and easy to
override. Advanced control must not be required to repair weak defaults.

### Optional weight

Applications should pay only for the host, framework adapter, visualization
features, and optional capabilities they use. Export, animation, rasterization,
and other heavy features must not leak into the default entry points.

## Primary audiences and use cases

### AI-authored application charts

An AI should be able to:

1. Identify the analytical goal and data shape.
2. Find the relevant TanStack Charts playbook.
3. Follow pointers to exact API documentation and, where behavior is compatible,
   the relevant Observable Plot concepts.
4. Produce normal, typed application code.
5. Validate responsiveness, themes, accessibility, and empty states.
6. Modify the chart later without reverse-engineering an opaque schema.

### TanStack.com

TanStack.com is the first production migration target. Generic Plot hosting, responsiveness, theming, export plumbing, and interaction bridging should move into the library. NPM Stats-specific data semantics, product controls, URL state, and bespoke animation should remain in the application.

### TanStack Starters

[TanStack Starters](https://github.com/TanStack/starters) should be a first-party proving ground and distribution channel.

Charts should be an optional starter capability rather than mandatory base weight. A starter integration should demonstrate:

- A responsive analytics surface
- Automatic light and dark themes
- Loading, empty, error, and partial-data states
- SSR and hydration
- Accessible labeling and summaries
- A small trend chart or sparkline
- A categorical comparison
- At least one visualization that shows the grammar’s higher ceiling, such as a
  distribution, faceted comparison, cohort heatmap, or layered statistical
  chart
- An agent-readable example that is easy to locate and modify

The acceptance test is:

> Can an agent starting from a TanStack Starter add a responsive,
> dark-mode-aware chart, then evolve it into a custom layered visualization
> without replacing the component system?

### Positioning alongside shadcn

[shadcn Charts](https://ui.shadcn.com/docs/components/radix/chart) provides attractive, copy-owned dashboard components built on Recharts. Users should remain free to choose it.

TanStack Charts should be positioned as the more expressive path when an
application needs transforms, layered marks, facets, distributions, statistical
graphics, geo, or custom compositions.

The useful shared principle is to preserve access to the underlying visualization library rather than obscuring it. TanStack Charts can offer shadcn-friendly CSS tokens and recipes without becoming a shadcn clone.

## Scope

### Runtime responsibilities

- A framework-neutral chart host contract
- Typed marks, channel materialization, strict supplied-scale scene generation,
  and renderer-neutral output
- Container measurement and resize scheduling
- Create, replace, and destroy lifecycle
- Theme resolution and tokens
- SSR document injection and hydration behavior
- Interaction value and event bridging
- Accessibility shell and conventions
- Extension points for optional capabilities
- Development diagnostics

### Optional runtime capabilities

- SVG export
- Raster export
- Animation and transitions
- Application-level selection helpers
- Testing utilities
- Static or server-rendered chart output

These must live behind explicit entry points or dynamic imports.

### Documentation and skill responsibilities

- Selecting an appropriate visualization
- Understanding required data shapes
- Reshaping data for a chosen visualization
- Handling missing, incomplete, or irregular data
- Applying TanStack marks and direct D3 transforms to common goals
- Building custom layered charts
- Performance and bundle guidance
- Validation checklists
- React and Octane implementation guidance
- Migration from existing Plot code

### Explicit non-goals

- A proprietary chart specification language
- A JSON visualization DSL
- A casually divergent clone that inherits Plot’s API surface without its
  behavior or tests
- Runtime data profiling or cleaning
- Runtime chart recommendation
- Natural-language chart generation in the library
- Data querying, caching, or transport
- An agent runtime, MCP server, or exploration session
- A forced application design system
- NPM Stats-specific transforms or product state

## Current POC architecture

The native engine now owns the product package names. The Observable integration
is retained only as `@plot-poc/*` research so behavior and bundle measurements
remain reproducible.

```text
@tanstack/charts
  Framework-independent grammar, supplied-scale scene calculation, static SVG,
  and DOM host. Built-in marks and chart-owned capabilities have explicit
  subpaths.

@tanstack/react-charts
  Thin React lifecycle adapter over the vanilla host.

@tanstack/octane-charts
  Thin native Octane lifecycle adapter over the same host.

@tanstack/charts/export
  Standalone SVG serialization and opt-in browser raster export.

@tanstack/charts/d3/shape
  Optional bridge from a directly imported D3 curve factory to line and area
  topology.

@tanstack/charts/legend
@tanstack/charts/focus
@tanstack/charts/svg/resources
  Explicit feature boundaries that disappear when unused.

d3-array / d3-scale / d3-shape / d3-quadtree / other granular D3 modules
  Consumer-owned algorithms imported directly when the chart needs them.

@plot-poc/*
  Preserved Observable Plot host experiment.
```

The source directories still carry spike-era names such as `charts-core`; the
package names and dependency boundaries are authoritative.

## Chart definition model

A reusable chart is a stable definition object. Application state lives in one
typed `input`; host state and memoized preparation are supplied through context.

### Current native grammar shape

The exact names remain provisional, but the structural contract does not:
marks own arbitrary data, channels describe encodings, and a chart is a layered
composition. There is no chart-wide datum type and no normalized series model.

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

export const downloadsChart = defineChart({
  marks: [
    lineY(downloads, {
      x: 'date',
      y: 'downloads',
      z: 'package',
      key: 'id',
    }),
  ],
  x: { scale: scaleUtc().domain(dateDomain) },
  y: {
    scale: scaleLinear().domain(downloadDomain).nice(),
    label: 'Weekly downloads',
  },
})
```

Field-name channels remain available for concise ordinary cases. Accessor
functions preserve inference when data is nested, computed, tuple-shaped, or
heterogeneous across marks. Constants must have an unambiguous typed form when
a string could otherwise mean either a field or a literal value.

The vanilla host is the primary execution contract:

```ts
const host = mountChart(element, {
  definition: downloadsChart,
  height: 320,
  ariaLabel: 'Package downloads',
})

host.update({
  definition: nextDownloadsChart,
  height: 320,
  ariaLabel: 'Package downloads',
})
host.destroy()
```

React and Octane wrap this contract without reinterpreting the definition:

```tsx
<Chart definition={downloadsChart} height={320} ariaLabel="Package downloads" />
```

### Dynamic definition layer

Dynamic definitions are implemented. They separate semantic application input,
optional preparation, and size-aware chart construction:

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts'

export const downloadsChart = defineChart<DownloadsInput>()({
  prepare: (input) => input.data,
  prepareEqual: (previous, next) => previous.data === next.data,
  chart: ({ input, prepared, width, theme }) => ({
    marks: [
      lineY(prepared, {
        x: 'date',
        y: 'downloads',
        z: 'package',
        key: 'id',
        curve: input.curve,
      }),
    ],
    x: {
      scale: scaleUtc().domain(dateDomain(prepared)),
      ticks: width < 480 ? 4 : 8,
    },
    y: {
      scale: scaleLinear().domain(downloadDomain(prepared)).nice(),
    },
    color: { range: theme.palette },
  }),
})
```

### Historical Observable proof API

```ts
import { lineY, ruleY } from '@observablehq/plot'
import { definePlot } from '@plot-poc/observable'

interface DownloadsInput {
  data: readonly Download[]
  curve: 'linear' | 'step'
}

export const downloadsChart = definePlot<
  DownloadsInput,
  Download,
  readonly Download[]
>({
  prepare: (input) => input.data,
  prepareEqual: (previous, next) => previous.data === next.data,
  plot: ({ input, prepared, width, theme }) => ({
    x: { ticks: width < 480 ? 4 : 8 },
    color: {
      range: theme.categorical,
    },
    marks: [
      ruleY([0]),
      lineY(prepared, {
        x: 'date',
        y: 'downloads',
        curve: input.curve,
        stroke: 'package',
      }),
    ],
  }),
})
```

That historical definition was consumed directly by both proof adapters:

```tsx
<Plot
  definition={downloadsChart}
  input={{ data, curve }}
  sizing={{ height: 320 }}
  ariaLabel="Package downloads"
/>
```

Its low-level renderer API remains useful as comparison evidence:

```ts
const renderer = createPlotRenderer(downloadsChart)
```

### Dynamic input and memoization

- The definition object is stable capability code and should normally be
  declared at module scope.
- `input` contains every dynamic application value that can affect chart output.
- Plain-object input uses shallow `Object.is` comparison by default.
- Definitions may supply `inputEqual` when their semantic invalidation differs.
- In-place mutation is not detected unless the application supplies an explicit
  revision through its input or a custom comparator.
- `prepare` is optional and synchronous.
- `prepareEqual` allows expensive data work to be cached independently from
  visual options.
- Chart options and marks are regenerated for every accepted render. The keyed
  scene reconciler preserves DOM identity and animates compatible geometry.

The native definition context includes:

- `input`
- `prepared`
- `width` and `height`
- Resolved theme tokens
- An abort signal for preparation

### Stateful renderer instances

`createChartRuntime()` owns one mounted chart’s definition, prepared value, and
abort lifecycle. `mountChart()` adds scene state, measurement, listeners,
reconciliation, animation cancellation, and cleanup. Framework adapters own no
chart semantics.

This is the minimum lifecycle needed for smooth dynamic output without storing
per-chart state in a shared module closure.

The original function-only definition form remains available as the baseline
during this comparison phase.

## React and Octane

React and Octane are first-class from the first release.

### Shared contract

- The same framework-neutral chart definitions
- Equivalent properties and controlled-state behavior
- Equivalent sizing, theming, interactions, and lifecycle semantics
- The same documentation examples wherever framework behavior does not differ
- One release train and one compatibility matrix

### React

- Idiomatic React components and hooks
- Safe Strict Mode behavior
- Stable cleanup and replacement
- SSR and hydration support

### Octane

- Native `.tsrx` implementation
- No React compatibility shim
- Native delegated event semantics
- Support for Octane’s compiled TypeScript-first model
- SSR and hydration parity

### Differential testing

Given the same chart definition and size, React and Octane tests should compare:

- Rendered structure and semantics
- Resize behavior
- Theme output
- Interaction values and events
- Cleanup behavior
- SSR and hydration
- Error behavior

## Responsive design

Responsiveness is container-first, not viewport-first.

### Host behavior

- Observe the actual chart container with `ResizeObserver`.
- Pass measured width and height into the chart definition.
- Coalesce repeated resize notifications.
- Avoid resize feedback loops.
- Recover when a container begins at zero size or is hidden and later becomes visible.
- Clean up observers and rendered plots deterministically.
- Avoid rendering unusable intermediate dimensions.
- Support an SSR `initialSize` to prevent hydration instability.
- Preserve behavior inside grids, resizable panels, dialogs, tabs, sidebars, embeds, and nested layouts.

### Sizing modes

The host should support a small explicit set:

- Fixed height with measured width
- Aspect ratio with optional minimum and maximum height
- Fill an explicitly sized container
- Explicit width and height
- SSR initial width and height

### Definition behavior

The definition receives the actual dimensions and may adapt:

- Tick density and formatting
- Guide layout
- Legend placement
- Bar orientation
- Facet layout
- Dot and label size
- Annotation detail
- Tooltips or interaction affordances

### Automatic guide layout

The default layout invariant is: every axis tick label and title remains inside
the chart surface, and the plot consumes every remaining pixel. This must hold
for rotated labels, first and last tick overhang, inherited fonts, dynamic
formatters, and clipped ancestors. `overflow: visible` is not a layout
strategy.

Automatic margins are a bounded guide-layout solve:

1. Start with the smallest outer inset plus any numeric side overrides.
2. Resolve copied D3 scale ranges, ticks, and formatted guide content against
   the provisional plot rectangle.
3. Measure guide text and union its anchored, rotated bounds.
4. Assign the minimum margin required on each automatic side.
5. Repeat the guide-only solve until stable, with a small fixed iteration cap;
   then resolve scales and render marks once.

The core uses a deterministic text estimator for SSR and static output. The DOM
host injects cached painted browser-font bounds. Each
`document.fonts.loadingdone` batch invalidates that cache and schedules a
correction through the same animation frame as resize work. React and Octane
use the same host behavior. Resizing or changing the domain, formatter,
rotation, title, or font starts a fresh solve so margins can shrink as well as
grow.

`margin` remains progressive disclosure:

- omitted sides are automatic;
- a numeric side is a hard override;
- `margin: 0` locks all sides to zero;
- advanced renderers may inject text measurement;
- the resolved plot bounds and margins remain available to aligned external
  UI such as the Stats timeline scrubber.

Margin containment and tick collision are separate concerns. When every label
cannot fit while preserving the minimum plot rectangle, the automatic guide
policy may thin categorical ticks or continuous tick candidates without
changing the scale domain. Explicit tick values and collision policy provide
the inversion-of-control path. Wrapping, truncation, and automatic rotation
must be explicit capabilities rather than hidden data changes.

### Required resize tests

- 240, 320, 480, 768, and 1200 pixel widths
- Zero-size container becoming visible
- Rapid resizing
- Nested container theme and size changes
- Unmount while resize work is queued
- SSR followed by a different client measurement

## Native light and dark themes

The default is `theme="auto"`.

Charts should inherit their container’s foreground and `color-scheme`, use a transparent background, and adapt without application code.

### Automatic behavior

It must work with:

- Native `color-scheme`
- System preference
- `.dark`
- `[data-theme]`
- Nested themed regions
- Embeds
- Runtime theme changes without an application remount
- SSR without a theme flash or hydration mismatch

### Token model

Prefer CSS variables and `currentColor` for chart chrome:

- Background
- Foreground
- Muted foreground
- Grid
- Axis
- Tooltip background and foreground
- Focus
- Selection
- Positive
- Negative
- Warning
- Neutral
- Categorical palette
- Sequential and diverging palettes

The native scene and DOM host consume the same resolved tokens. CSS handles
axes, labels, grids, focus, and tooltip chrome; configured D3 color scales and
typed theme input own data-color overrides.

### Configuration

- `theme="auto"` by default
- Forced `light` or `dark`
- Custom theme object
- Stable CSS variables and class hooks
- Per-chart or nested overrides

### Export behavior

Exports must materialize resolved CSS variables rather than depending on the source page:

- Transparent or opaque background
- Forced light or dark export
- Custom export theme
- JPEG always receives an opaque background

### Accessibility

- Forced-colors and high-contrast behavior
- Visible focus
- Do not rely on color alone for critical distinctions
- Palettes should maintain useful contrast in both modes

## Interaction model

TanStack Charts exposes a small application-facing bridge rather than a large
interaction system. Broader selection, brushing, zooming, and cross-chart
coordination remain optional capabilities or application recipes.

### Initial bridge

- Preserve original datum identity in every interactive point.
- Resolve nearest 2D, nearest-axis, or grouped-axis focus explicitly.
- Expose typed focus, focus-group, selection, and render callbacks.
- Support pointer, keyboard, click-to-pin, and application-controlled state.
- Normalize event cleanup and allow a supplied spatial index for dense data.

This should allow a chart to update Router search state, Store state, filters, detail panels, or other application UI.

### Tooltips

Tooltips follow the same progressive-disclosure rule:

- The imported `tooltip` token derives structured content from scene point
  metadata.
- `{ use: tooltip, format(point) {} }` and `formatGroup(points)` own custom text
  without changing the mark data.
- Tooltips are pinnable by default; `sticky: false` disables click-to-pin
  behavior.
- `onFocusChange` and `onFocusGroupChange` provide complete external-state
  control for rich application UI.

The tooltip extension owns framework-neutral labeled rows, ordering,
suppression, and color swatches derived from explicit semantic channels. Rich
framework bodies remain adapter-owned optional entries; the core protocol does
not accept framework nodes or arbitrary HTML.

The default DOM presentation owns adaptive placement, light and dark styling,
keyboard and pointer behavior, pinning, text selection, and accessible live
announcements. Static SVG callouts are a separate mark-level capability rather
than a side effect of the interactive HTML tooltip.

### Advanced interactions

Selection, brushing, and zooming should be evaluated as optional application-level primitives. They must not delay a useful first release or create a competing chart grammar.

### Animation

On an accepted update, the native stateful renderer:

1. Reuses cached preparation when `prepareEqual` permits it.
2. Builds the next renderer-neutral scene as the declarative target.
3. Stops the active transition while preserving live SVG geometry.
4. Reconciles stable keyed nodes before paint.
5. Interpolates compatible numeric geometry and paths with reduced-motion and
   interruption handling.

The focused reconciler contract now interrupts a transition at painted
geometry, starts the next transition from that exact value, preserves node
identity, and proves a canceled frame cannot overwrite the final target.

The sandbox’s keyed bar example copies current rectangle geometry into the next
Plot and animates toward its target geometry. A rapid update samples the
in-progress Plot, so motion continues from what the user can currently see.

The seam is generic; bar correspondence remains demo code. This matches the
useful boundary found in NPM Stats without baking its DOM-specific bar and axis
logic into core.

Requirements for a production motion capability:

- No animation dependency in the base renderer.
- Immediate replacement by default.
- Reduced-motion disables semantic motion.
- Resize, theme, and incompatible layout changes do not animate by default.
- Transition cleanup is deterministic and interruption-safe.
- A future `@tanstack/charts-motion` may provide reusable keyed SVG helpers.
- Definitions retain a low-level custom reconciliation path for bespoke charts.

## Accessibility

Use Plot’s built-in `ariaLabel`, `ariaDescription`, mark-level ARIA, titles, and descriptions rather than replacing them.

The host and documentation should establish:

- Required chart title or accessible label
- Optional longer description
- Mark-level labels for important values
- Keyboard-accessible application controls
- A textual summary or data-table companion when the analytical content requires it
- Visible focus for interactive charts
- Reduced-motion behavior
- High-contrast and forced-colors validation
- Guidance for color-independent encodings

Accessibility helpers should guide authors without producing misleading automated prose about the data.

## Loading, empty, error, and partial data

These are application states, but every production chart must account for them.

The core should provide stable host layout and accessible state hooks without owning data fetching. Recipes should demonstrate:

- Loading without layout shift
- Empty data
- Failed data
- Partial or truncated data
- Incomplete current time periods
- Stale data
- Mixed missing and zero values

TanStack Query or Start loaders should remain responsible for fetching and caching.

## Bundle-size strategy

Observable Plot creates a real minimum client cost. TanStack Charts must not add an uncontrolled second layer.

Research snapshot: `@observablehq/plot@0.6.17`.

### Plot packaging findings

- Plot exposes a single supported ESM entry and its UMD build.
- It does not expose supported feature subpaths.
- Its package declares the main source entry as side-effectful because it patches `Mark.prototype.plot`.
- Deep importing internal source files is unsupported and must not be used.
- Static named imports allow modern bundlers to remove meaningful unused code.
- Passing around, re-exporting, or dynamically indexing the full Plot namespace can retain far more of the package.
- Dynamically importing `@observablehq/plot` directly may retain all exports.

### Directional local measurements

Measured with a local esbuild production bundle and gzip. Exact results vary by bundler and minifier.

| Scenario                              | Approximate gzip |
| ------------------------------------- | ---------------: |
| `plot` only                           |          83.6 kB |
| `plot` + `lineY`                      |          90.6 kB |
| Line + tip + pointer                  |          90.6 kB |
| Common dashboard marks and transforms |          97.2 kB |
| `auto`                                |          97.3 kB |
| Geo                                   |          84.7 kB |
| Density + contour                     |          97.8 kB |
| Escaped full Plot namespace           |         133.5 kB |
| Full prebuilt UMD                     |          68.8 kB |

These measurements are a baseline for further prototypes, not published size claims.

### Package rules

- Mark JavaScript as `sideEffects: false`; explicitly list any required CSS side effects.
- Use subpath exports for optional capabilities.
- Do not import optional capabilities from root barrels.
- Use type-only imports where applicable.
- Keep Plot as a peer dependency so the application owns one version.
- Do not re-export the entire Plot namespace.
- Generate examples with named Plot imports.
- Keep data utilities free of accidental Plot or D3 imports.

### Lazy-loading rule

Lazy-load the entire chart module. Inside that module, statically import the exact Plot symbols it uses.

Do not make the chart definition eager and dynamically import the Plot namespace from inside it.

### Static rendering

For non-interactive charts, server-rendered or build-time SVG may eliminate the Plot runtime from the client path. This should be explored as an explicit rendering mode, especially for content, documentation, email-adjacent assets, and below-the-fold charts.

### Bundle guidance in every recipe

Each recipe should answer:

- Does this chart need client interaction?
- Can it be static SVG?
- Is it above the fold?
- Which exact Plot symbols does it import?
- Are rare capabilities behind a chart-level dynamic import?
- Are export and raster dependencies excluded from the normal path?
- Has the production bundle been measured?

### Bundle CI matrix

Track and gate at least:

- Core only
- React host
- Octane host
- Minimal Plot line chart
- Common dashboard chart
- `auto`
- Density or contour
- Geo
- SVG export
- Raster export
- Motion

### Deferred post-15 KiB options — 2026-07-30

The compact-scale React line consumer is currently 14,227 gzip bytes. Its
native tooltip adds 3,381 bytes and portal transport adds another 806 bytes.
The following read-only bundle experiments are options for later work, not
commitments for the current tooltip release:

- Move the remaining tooltip host lifecycle behind the tooltip extension:
  approximately 480 bytes from charts without tooltips.
- Replace the retained `d3-array/least` nearest-point call with an equivalent
  local loop: approximately 108 bytes with no intended behavior change.
- Make compact scales native chart-scale tokens and move general callable D3
  positional and color-scale adaptation behind exact opt-in entries:
  approximately 1,300 bytes from both base and tooltip consumers.
- Move animation and specialized focus modes behind exact tokens:
  approximately 692 and 351 bytes respectively.
- Split a lean text tooltip from structured rows, items, swatches, and rich
  framework bodies. A virtual lean-tooltip consumer measured 14,689 gzip bytes;
  preserve the current structured behavior through an exact optional entry if
  this is pursued.
- Keep precise DOM text measurement in the default path unless visual evidence
  justifies making it optional. Its measured 709-byte saving does not currently
  outweigh label-layout risk.
- Consider a separate fixed-size `StaticChart` entry only for consumers that do
  not need updates, resizing, focus, or tooltips. The counterfactual measured
  7,942 gzip bytes and is not a replacement for the normal chart.

A combined virtual build measured 11,128 gzip bytes for the base, 14,493 with
the current tooltip, and 15,303 with portal transport. These figures establish
an opportunity envelope; every future boundary must retain its own behavioral,
type, packed-consumer, and retained-module gates. Do not simplify tick quality,
nicening, inversion, or clamping merely to chase the remaining bytes.

If the product requires going below Plot’s supported floor, the correct paths
are an upstream contribution, a deliberately maintained compatible fork, or a
native engine that passes the decision gates above. Unsupported deep imports,
consumer bundler patches, and accidental forks are not acceptable.

## Export

Export is valuable but optional.

### Initial targets

- SVG
- PNG
- JPEG

### Later targets

- Animated formats only if justified by real applications
- Video export only outside the default runtime

### Requirements

- Explicit entry points or dynamic imports
- Correct dimensions and pixel ratio
- Embedded or materialized theme styles
- Transparent and opaque background policy
- Font and image handling
- Cancellation for expensive work
- React and Octane parity

NPM Stats’ existing GIF and WebM behavior should inform the extension interface, but it should not define the minimum library.

## SSR and static rendering

The renderer must support an injected `document`. The current Observable
adapter normalizes Plot’s document option; a native engine must make this a
kernel contract.

Requirements:

- Explicit `document` injection
- Deterministic output where Plot permits it
- An initial size policy
- No browser globals during server render
- Hydration behavior defined for changed client dimensions
- Static SVG rendering API
- React and Octane parity
- Tests in a DOM implementation supported by the project

## Testing

### Chart catalog conformance

The versioned corpus in
[`benchmarks/conformance`](./benchmarks/conformance) applies official chart
catalogs to TanStack Charts without treating a reference renderer's output as
a proprietary fixture. Each case supplies one typed local dataset and intent,
isolated reference and TanStack implementations, official provenance, semantic
geometry expectations, and separate AI creation and maintenance tasks. The
reference may use built-in transforms; TanStack receives the same rows and uses
public TanStack or granular D3 primitives as appropriate.

The corpus began with 12 cartesian Plot cases and now has 79 paired cases: 61
Observable Plot references, nine Recharts references, and nine Apache ECharts
references. The Plot portion covers:

- temporal, ranked, indexed, cumulative, connected, and multi-series lines;
- areas, range bands, normalized and wiggle stacks, Bollinger bands, and exact
  positive/negative difference fills;
- sorted, grouped, stacked, diverging, waterfall, interval, candlestick,
  lollipop, dumbbell, waffle, and bump charts;
- scatter, regression, marginal distributions, error bars, boxplots, empirical
  CDFs, beeswarms, histograms, binned heatmaps, density contours, filled
  contours, hexbins, ridgelines, and violins;
- shared-guide facets, calendar heatmaps, parallel coordinates, pointer and
  grouped/Voronoi tooltips, Marimekko layouts, and framed guide-free plots;
- hierarchy trees, Delaunay adjacency, force networks, vector fields, and
  GeoJSON maps.

The Recharts tranche covers mixed-mark composition, population pyramids,
adjacent-plus-stacked bars, a 1,000-point scatter pressure test, treemaps,
radar, an accessible interactive legend, chart/table selection, and a pinned
tooltip containing a real nested chart. The ECharts tranche covers snapped and
free cursors, synchronized multi-grid focus, native scrolling, streaming,
continuous brushing, wheel zoom/pan, timeline scrubbing, and editable ranges.
The generic runner selects `observable-plot`, `recharts`, or `echarts` per case
and keeps one protocol, gallery, source audit, and report.

Every case is evaluated across five dimensions:

1. Capability coverage and explicit gap/defer classification.
2. Semantic and visual accuracy from equivalent input and intent.
3. Isolated bundle cost plus mount, update, and SVG-output measurements.
4. Strict consumer type safety, unsafe-escape auditing, and negative type
   probes.
5. AI authoring and maintenance performance.

The automated visual gate checks required geometry counts, corresponding
data-mark paints, frame-relative geometry, categorical guide order, guide
multiplicity, original label-box containment, unique accessible chart roots,
compact/ordinary/wide containers, and light/dark themes. The same assertions
run before and after a data revision. Interaction scenarios use real browser
input, may update the existing chart handle, fail on uncaught page errors, and
assert rendered evidence when case-owned semantic state could hide a renderer
failure. Paired cases use explicit shared semantic domains. Pixel-identical
axes and styling are not required; retained side-by-side screenshots remain
the review artifact. Bundle cases must keep their measured entry points
isolated so unrelated marks cannot defeat tree shaking.

```sh
pnpm conformance:quick
pnpm conformance
pnpm conformance:size
pnpm dev:conformance
```

Reports are written to
`.benchmark-output/conformance/results/plot-catalog.{json,md}`. The blind,
paired agent protocol is defined in
[`benchmarks/conformance/AI-EVALUATION.md`](./benchmarks/conformance/AI-EVALUATION.md);
agents receive the data, intent, scaffold, and pinned documentation, never the
human implementations or hidden acceptance checks.

#### Source-backed catalog surface

Status: implemented.

The conformance corpus also powers the public catalog on TanStack.com. The
checked-in `catalog-index.json` carries case metadata and immutable source entry
paths. TanStack.com reads that index and the authored case files from one pinned
Charts revision, then runs detail pages and embeds in its notebook runtime.
Landing and catalog grids use lightweight previews owned by the site.

The existing `case.json` glob remains the only authored case index. The local
browser, conformance runner, source index, and documentation tooling must not
maintain parallel case implementations. There is no generated module bundle,
preview artifact, publication branch, or renderable catalog package.

Maintenance gates:

1. A case ID must match its directory and IDs/orders must be unique.
2. All metadata must pass the same strict parser before indexing.
3. New renderer types and interaction metadata must be preserved by the shared
   parser before their cases can enter the catalog.
4. The checked-in source index must match the authored cases and source entries.
5. Authored case metadata and source stay the source of truth.

The maintenance command is `pnpm catalog:index:check`; the local authoring app
build is `pnpm --filter @charts-poc/conformance-example build`.

The executable smoke harness covers sorted bars and fixed-boundary histograms
for both renderers. It creates immutable external workspaces, keeps canonical
scaffold hashes outside those workspaces, rebuilds against a hidden alternate
dataset, preserves per-run evidence, and records strict type/build/browser,
bundle, token, and tool-call results. Preparation and scoring are local; an
external model run remains an explicit, sandboxed action and is not implied by
the runtime corpus.

The full 79-case standard matrix passes at 320/640/960 px in light and dark
themes with initial/revised data: 25 native, 54 composed, zero gaps, and zero
deferred. All 16 interaction cases pass both renderers, starting revisions,
in-place update scenarios, and uncaught-error checks. The latest report
measures TanStack's geometric-mean gzip ratio at 0.21× the selected references,
mount at 0.57×, update at 0.66×, transitive authored source at 1.07×, and mean
diagnostic geometry similarity at 97.8%. Strict case sources produce zero
diagnostics, unsafe assertions, or suppressions. Across the eight
invalid-program probes, Observable Plot and Recharts each reject 1/8 while
TanStack Charts rejects 8/8. Current metrics must still come from the generated
report, and every new case must pass the same gates before it counts. Focused
`--case` runs use filter-qualified artifacts rather than overwriting the
complete report, and unknown case IDs fail before bundle or browser work.

Catalog expansion follows a bundle boundary:

1. Add recipe-only cases freely.
2. Reuse a public TanStack primitive or granular D3 algorithm when it fits; add
   a compact public primitive only when the cross-case contract is explicit and
   independently removable.
3. Add optional marks only through isolated public entry points with their own
   bundle budgets.
4. Keep the exact locked core, ordinary line/SVG, DOM, React, and existing
   consumer baselines unchanged.
5. Stop and review any capability that adds code to every chart.

This policy has kept link, tick, arrow, vector, frame, hexagon, horizontal
area, and gesture composition isolated. Image/raster scene primitives and
interaction state inside the base DOM host remain deliberate stop points
because they require shared renderer or runtime work. The cursor, brush, zoom,
scrubber, and range-editor proofs use application state, ordinary updates, and
D3 scale inversion. `focusDisabled` lives only at
`@tanstack/charts/focus/disabled`; an attempted root export changed an ordinary
line bundle by one gzip byte and was rejected. Plot `auto` remains omitted;
explicit generated marks and scales are preferable for AI-authored code.

The broad useful Plot catalog is saturated at the zero-universal-tax boundary,
while distinct recipes remain welcome. Recharts and ECharts are now active
reference sources. The next pressure set is linked XY brushing and lasso,
pinch/touch arbitration, keyboard alternatives for continuous gestures,
multi-pane financial views, nested Gantt dependencies, and high-volume
cursor/viewport performance. Add them first as recipes; promote only repeated,
measured ownership boundaries to isolated public entry points.

#### Behavior-first interaction and composition catalog

Status: first tranche implemented; second tranche partially implemented.

Expansion is organized by behavior and composition rather than branded chart
type. The catalog is an acceptance suite, not a commitment to put every recipe
in the default runtime.

Official reference sources are prioritized by the distinct design pressure
they add:

| Source                                                                                                                                                                                           | Primary contribution                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Vega-Lite](https://vega.github.io/vega-lite/examples/)                                                                                                                                          | Declarative point and interval selections, legend and input binding, linked brushing, pan/zoom, and multi-view resolution                           |
| [Apache ECharts](https://echarts.apache.org/examples/en/index.html)                                                                                                                              | Axis pointers, linked brush and data zoom, multi-grid dashboards, timelines, custom series, and unusually broad product visualization coverage      |
| [Highcharts and Highstock](https://www.highcharts.com/demo)                                                                                                                                      | Polished crosshairs, navigator, scrollbar, range selector, scrollable plot areas, annotations, drilldown, touch behavior, and accessibility         |
| [Plotly.js](https://plotly.com/javascript/)                                                                                                                                                      | Persistent box/lasso selections, viewport revision semantics, scientific plots, subplots, mode bars, editable annotations, and event payloads       |
| [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/) and [uPlot](https://github.com/leeoniya/uPlot)                                                               | Fast time-series cursors, logical ranges, kinetic scrolling, synchronized charts, external tooltip UI, streaming, and small plugin protocols        |
| [AntV G2](https://g2.antv.vision/en/examples)                                                                                                                                                    | Grammar-oriented interaction declarations, state styling, nested view composition, facets, and repeat layouts                                       |
| [D3](https://observablehq.com/collection/@d3/gallery)                                                                                                                                            | Bespoke interaction and design recipes, including zoomable hierarchies, brushable matrices, transitions, maps, and novel layouts                    |
| [visx](https://airbnb.io/visx/gallery)                                                                                                                                                           | Low-level brush, zoom, annotation, tooltip, and composition patterns with explicit inversion of control                                             |
| [Nivo](https://nivo.rocks/)                                                                                                                                                                      | Custom layers, custom cells and symbols, gradients, patterns, motion, rich tooltips, and polished hierarchy recipes                                 |
| [Chart.js](https://www.chartjs.org/docs/latest/samples/information.html), [ApexCharts](https://apexcharts.com/javascript-chart-demos/), and [AG Charts](https://www.ag-grid.com/charts/gallery/) | Mainstream plugin lifecycle, decimation, interaction toolbars, navigators, financial dashboards, custom actions, and design defaults                |
| [vis-timeline](https://visjs.github.io/vis-timeline/examples/timeline/) and [Highcharts Gantt](https://www.highcharts.com/demo/gantt)                                                            | Event and range timelines, resource lanes, nested groups, dependencies, editable items, and fixed-axis scrolling                                    |
| [SciChart](https://www.scichart.com/examples/javascript-chart/)                                                                                                                                  | High-rate streaming, huge-data navigation, overview controls, and gesture stress cases; use as a performance reference rather than a core API model |

Commercial references contribute behavioral requirements and visual review
only. Do not copy their implementation code or proprietary fixtures.

The interaction corpus should cover these distinct families:

1. **Cursor and focus:** free and snapped crosshairs, nearest point, nearest
   axis, grouped/unified hover, axis value labels, touch tracking, pinning,
   pointer handles, and keyboard traversal.
2. **Selection:** single and multi-point selection, additive/subtractive
   selection, x/y/xy intervals, multiple persistent intervals, lasso,
   interactive legends, selection styling, and clear/reset behavior.
3. **Viewport:** drag pan, wheel and pinch zoom, box zoom, axis-only zoom,
   zoom-to-fit, constraints, overscroll, semantic domain panning, native
   overflow scrolling, range presets, navigator/overview charts, and lazy
   loading on visible-range changes.
4. **Coordination:** synchronized cursor, viewport, selection, and series
   visibility; linked brushing; focus-plus-context; chart-plus-table
   selection; and loop-safe two-way control across independent chart hosts.
5. **Temporal applications:** candlestick plus volume, multiple resizable
   panes, irregular session gaps, logical bar ranges, real-time streaming
   windows, event timelines, Gantt/resource lanes, playback/scrubbing, and
   editable ranges or milestones.
6. **Rich composition:** insets, marginal charts, nested flex/grid views,
   shared and independent guides, small multiples, sparklines in tables,
   chart-in-tooltip, overview-plus-detail, and mixed coordinate systems.
7. **Custom design:** gradients, patterns, masks and clips, rounded or
   variable geometry, icons and symbols, direct labels and callouts,
   annotations, custom drawing tools, hover-emphasis layers, rich legends,
   and reusable custom marks.

“Timeline” is not one feature. The corpus keeps temporal axes, event/range
lanes, Gantt dependencies, animated state sequences, playback controls, and
streaming windows as separate cases with separate ownership.

##### Optional interaction architecture

The base marks, scales, scene preparation, and SVG renderer remain static and
declarative. Interaction is an optional controller over explicit semantic
state, never hidden renderer mutation.

The current cases deliberately stop at application-owned composition. If
repeated recipes justify reusable public controllers, they must prove these
layers independently:

1. A framework-neutral interaction kernel containing serializable state,
   commands, subscriptions, transactions, revision policies, and source IDs.
   It contains no DOM and no D3.
2. A scale/scene bridge for coordinate conversion, visible domains, typed hit
   testing, stable datum and mark identity, and channel values.
3. Individually importable drivers for pointer inspection, drag pan, wheel
   zoom, pinch zoom, box selection, lasso, and keyboard input. When an
   established algorithm is needed, inject its granular D3 package such as
   `d3-brush`, `d3-zoom`, `d3-delaunay`, or `d3-quadtree`.
4. Overlay marks for crosshairs, focus markers, selection regions, handles,
   playheads, and annotations, rendered through the existing scene protocol.
5. External UI companions for tooltips, toolbars, range buttons, annotation
   editors, and accessible live regions. React and Octane only adapt the same
   semantic controller and models.
6. A tiny linker that can synchronize focus, selection, viewport, or series
   visibility across independent hosts using transaction/source tokens to
   prevent feedback loops.

Focus, selection geometry, resolved selected datum keys, viewport domains, and
annotation edits are separate state. Declarative updates need an explicit
revision policy for preserving or resetting each category. A viewport also
distinguishes temporal values from logical row/bar indexes; the latter is
required for financial gaps and fixed-width scrolling.

A navigator is composition: a second chart plus an interval controller and
optional scrollbar. A timeline player is controlled application state plus
ordinary chart updates. Neither becomes a special renderer subsystem.

Gesture arbitration is part of the contract. Every driver must define pointer
capture, cancellation, modifier keys, wheel versus page scrolling, touch
action, pinch behavior, reduced motion, and cleanup. Defaults must preserve
normal page scrolling until the consumer explicitly enables an intercepting
gesture.

##### Nested and embedded charts

Charts inside tooltips are a worthwhile first-class recipe, but not a recursive
core mark:

- The parent exposes typed focused datum/group state and an anchor rectangle.
- An optional DOM tooltip companion owns a portal or mount slot.
- The application mounts a second ordinary chart in that slot with inherited
  theme and locale.
- Parent and child hosts retain independent lifecycle, sizing, focus, and
  interaction state.
- Tests cover event containment, resize loops, portal cleanup, keyboard flow,
  pinning, and touch dismissal.

For repeated embedded visuals, prefer facets, small multiples, or table
sparklines. Mounting a full chart host per datum is a deliberate stress case,
not the default composition primitive. Arbitrary HTML, framework nodes, SVG
`foreignObject`, and recursive chart definitions remain outside the core scene
protocol.

##### Expansion tranches

The first tranche is implemented as zero-universal-tax recipes:

1. Free and snapped cursors.
2. Grouped axis hover with an external swatch tooltip.
3. Keyboard-operable interactive legend filtering.
4. Synchronized cursors across independent quantitative domains.
5. Controlled chart-and-table selection.
6. Focus-plus-context with explicit domains.
7. A pinned tooltip containing a real nested chart.
8. Native horizontal resource-lane scrolling.
9. Streaming data with a locked viewport and in-place revision checks.
10. Overlay-based brush, scrubber, playhead, and editable range handles.

The second tranche is partially implemented:

1. Continuous X brush selection: implemented.
2. Wheel zoom, horizontal pan, reset, and constraints: implemented.
3. Timeline playback scrubbing: implemented.
4. Editable event range: implemented.
5. Linked XY brushing, additive/subtractive regions, and lasso: pending.
6. Pinch, box zoom, range presets, visible-range loading, and keyboard
   alternatives for continuous gestures: pending.

The third tranche pressures composition and performance:

1. Multi-pane financial chart with synchronized crosshair, viewport, and
   logical-range navigation.
2. Gantt/resource timeline with nested groups and dependencies.
3. General 100k/1m-row render, update, streaming, decimation, and lifecycle
   pressure is implemented; pan, zoom, and cursor-specific large-data pressure
   remains pending.
4. Zoomable hierarchy and map cases.
5. Custom drawing tools and annotation persistence.
6. Multi-host mount, update, resize, and lifecycle pressure is implemented;
   coordinated focus/selection propagation remains pending.

##### Cross-library stress checkpoint — 2026-07-28

[`benchmarks/comparison/stress`](./benchmarks/comparison/stress) and
`scripts/stress-chart-libraries.mjs` now compare TanStack Charts, Chart.js,
Apache ECharts, Recharts, and Observable Plot in production-minified Chromium
consumers.

- Raw line and scatter frontiers stay separate from product and encoded lanes.
- The encoded lane covers fixed density cells, a screen-aware extrema-
  preserving line envelope, a fixed-bin histogram, and top categories plus
  `Other`. Every transform accounts for all source rows and has a prepared-row
  ceiling.
- Measurements retain preparation, synchronous commit, first-frame proxy,
  two-frame settle proxy, update shape, trusted inactive-to-active tooltip
  response, trusted active-to-active cursor sweeps, sustained cadence and
  drain, output complexity, async renderer long tasks through settlement, and
  fresh-page retained JS heap/DOM lifecycle deltas.
- Update coverage includes a true no-op, same-key values, append, replacement,
  reorder, and resize. Append preserves the original source prefix. The runner
  verifies canonical digests, every update/stream input's source accounting,
  extrema, rendered data items/path vertices, numeric endpoint visibility,
  post-update dimensions, nonblank finite output, and visual change.
- The canonical quick five-library matrix passes all 55 cells with zero
  correctness failures. TanStack remains within the 16.7 ms synchronous and
  33.4 ms settled investigation thresholds for every sane workload. It is
  fastest to mount the Stats-shaped multi-series case and top-category
  rollup, and is close to the fastest in small multiples, density, and the
  line envelope; interactive scatter and density updates remain the clearest
  measured optimization targets.
- The canonical standard five-library matrix passes all 100 cells with zero
  correctness failures and zero retries. Its production-minified browser run
  covers raw frontiers, product cases, million-row bounded encodings, trusted
  interaction, 48-revision bursts, and lifecycle soak under the final
  infrastructure-only retry policy.
- Pull requests run the quick correctness matrix. Scheduled/manual CI runs the
  20-sample standard profile. Both run deterministic workload-invariant tests
  first. Cross-library timing rank remains informational and comparable only
  within one machine/browser run.
- Density preparation now emits only occupied cells from its fixed grid. The
  100,000-row fixture accounts for every source row in 1,909 shared marks
  instead of asking renderers to interpret 139 empty marks differently.
- A focused trusted cursor sweep changes rendered tooltip state at all 20
  quick-profile targets in all five libraries. TanStack records 0.5 ms
  active-to-active p95 separately from its 5.7 ms inactive activation p95.
- A controlled viewport workload now separates renderer domain-update cost
  from wheel, drag, brush, and application-state policy. All five libraries
  pass exact domain probes over the same 2,999-row envelope; TanStack updates a
  100,000-row source representation in 2.5 ms p95 in the focused quick run.
- A Stats-shaped 24-series, 520-point standard workload now gates authored
  series order, color ownership, explicit domains, and exact grouped tooltip
  values through reorder, append, visibility, sustained-update, and resize
  changes. In the canonical standard run TanStack mounts in 10.9 ms p95,
  updates in 6.3–7.2 ms p95, sustains 119.6 updates per second, activates the
  grouped tooltip in 1.2 ms p95, and
  traverses 100 exact active states in 0.8 ms p95.
- A rolling keyed-window workload advances immutable 1,000- and 5,000-point
  windows by five percent and separately measures awaited streams and
  synchronous latest-wins bursts. The integrated 15-cell standard run has
  zero correctness failures. TanStack reuses all 950 and 4,750 surviving SVG
  nodes, drains every 48-revision burst to one stable final digest, and retains
  252.6 kB at 5,000 points with zero DOM-node or listener delta.
- The raw 5,000-dot SVG window is an intentional crossover measurement:
  TanStack's same-shape update is 17.4 ms p95, the five-percent roll is
  16.2 ms p95, and the sustained stream reaches 19.2 ms p95. The 16-chart
  dashboard mount similarly reaches 18.1 ms p95 while its updates stay below
  9 ms. Those results direct applications toward bounded encodings,
  progressive mounting, or fewer simultaneous hosts rather than universal
  renderer weight for raw-node extremes.
- A focused full-profile TanStack run passes all 10 largest product and encoded
  cells with zero correctness failures. One-million-row density, envelope,
  and viewport sources update below 7 ms p95 after bounded preparation; the
  32-by-1,040 Stats history stays below 16 ms p95 across update shapes. The
  10,000-dot rolling window reuses all 9,500 surviving nodes but reaches
  31–35 ms p95, confirming the representation crossover instead of motivating
  universal SVG machinery.
- Filtered stress runs use filter-qualified artifact names and record their
  filters, so focused diagnostics cannot overwrite the canonical quick,
  standard, or full reports. Unknown library and workload IDs fail before
  bundle or browser work instead of silently narrowing the matrix.

Focused CPU profiles put 58–66% of TanStack's node-heavy update work in SVG
template parsing, keyed reconciliation, and DOM attribute synchronization,
with another 14–16% in SVG serialization. Two measured experiments kept the
bundle gate in control:

- A same-order keyed reconciliation fast path cost 106–123 bytes gzip and was
  neutral-to-slower across interactive scatter, density, and histogram updates.
  It was rejected and fully removed.
- Replacing the reconciler's short-lived attribute-name `Set` with repeated DOM
  `hasAttribute` calls saved one gzip byte but regressed same-shape updates by
  15–27% and resize by 15–26% across 100 measured samples per cell. It was
  rejected and fully removed.
- Hoisting the grid's three safely inherited stroke attributes to its existing
  group removed 30 repeated attributes and 610 SVG bytes from ordinary charts,
  and 399 attributes and 8,113 bytes from the histogram. Every affected locked
  bundle also shrank by 54 minified bytes and 0–5 gzip bytes. Focused scene,
  serialization, core, and type gates pass, so the change was retained.
- Broader dot/bar fill hoisting would save more output bytes but added 46 gzip
  bytes to the representative bundle and complicates exit-animation color
  semantics. It was rejected before implementation.
- Removing deterministic fixed-size layout reads and dormant post-render
  queries improved a 64-chart mount median by about 5%, resize by about 10%,
  and same-shape updates by about 2% for 8 bytes gzip. That change was retained
  and its exact locked baselines were reviewed.
- Replacing the reconciler's short-lived next-attribute `Set` with
  `Array.includes` improved 12-round medians by 0.1–0.7 ms across density,
  5,000-point scatter, dashboard, and histogram updates, but regressed scatter
  p95 from 16.2 to 16.7 ms and added one gzip byte to at least one locked
  consumer depending on compressor level. `indexOf` was larger. Both variants
  were rejected and removed.
- An allocation-free SVG serializer added 18–35 gzip bytes without a stable
  browser win; one-pass line grouping was end-to-end neutral and added one
  gzip byte to the curved-line consumer; avoiding `AbortController` creation
  for preparation-free definitions improved dashboard timing by only 1–2% and
  added a gzip byte to locked React-line and Stats consumers. All three were
  rejected and removed.

Further presentation hoisting is closed unless a narrower proof is both
bundle-negative and animation-safe. Measure each change in isolation against
interactive scatter, density, histogram, and small multiples; do not trade
universal bytes for a synthetic raw-data win, and do not replace inexpensive
JavaScript work with extra DOM boundary calls.

The next workload expansion should add repeated controller-level
brush/zoom/pan workloads and multi-chart propagation latency; trusted cursor
movement and isolated viewport rendering are now covered. Capture a
standard/full baseline on stable hardware. Do not merge raw and encoded cases
into one leaderboard.

##### Interaction conformance gates

Interactive cases extend the existing five-dimensional protocol. The current
runner stores deterministic pointer, keyboard, drag, wheel, leave, and update
steps and asserts:

- semantic state transitions and callback payloads in data space;
- preservation/reset behavior across in-place data revisions;
- visual overlays, clipping, axis labels, and selection containment;
- initial static bundle, opt-in interaction bundle, and lazy companion cost;
- responsive widths, light/dark themes, real mouse and keyboard input;
- uncaught browser errors, feedback loops, scroll hijacking, and stale
  tooltip/nested-chart hosts;
- strict inferred event, datum, selection, and viewport types without casts.

Before a reusable controller ships, extend the gate with touch/pinch, RTL,
size-update scenarios, pointer-move and gesture p50/p95 latency, missed frames,
allocations, listener counts, multi-chart propagation latency, cancellation,
and leak checks.

The locked core, ordinary line/SVG, default DOM, React, Octane, and existing
consumer baselines must remain unchanged. Each driver and companion gets its
own entry point, budget, tests, and removal path. A capability that cannot meet
that rule stops for review rather than entering the default host.

### Core tests

- Observer scheduling and cleanup
- Zero-to-visible sizing
- Resize-loop avoidance
- Renderer replacement
- Theme resolution
- Event bridging
- Abort and unmount behavior
- Development diagnostics

### Adapter tests

- React Strict Mode
- Octane native lifecycle
- React and Octane differential behavior
- SSR and hydration
- Runtime theme switching
- Nested themes
- Controlled interactions

### Visual tests

- Responsive width matrix
- Light and dark
- High contrast and forced colors
- Empty and partial data
- Long labels
- Dense data
- Tooltip edges and clipping
- Facets
- Exports

### Documentation tests

- Typecheck every complete example
- Reject public examples that require `as any`, double assertions, suppression
  comments, private imports, or adapter generics
- Render every complete example
- Test both React and Octane variants where relevant
- Check referenced engine APIs against the installed version and compatibility
  matrix
- Measure documented bundle profiles
- Reject examples that retain unused engine capabilities without a stated
  reason

### Agent evaluation

Run the same versioned corpus against the raw package documentation and the
generated skill. The initial matrix is:

| Task                     | Required evidence                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Static categorical chart | Numeric, string, and boolean fields; rejects an invalid boolean numeric channel and corrects it without a cast |
| Dynamic ranking          | `defineChart<Input>()`; required React and Octane input; inferred callback datum; stable keys and animation    |
| Heterogeneous layers     | Different mark datum types remain an inferred union and are narrowed by a discriminant                         |
| D3 distribution or stack | Named granular D3 imports, explicit empty-safe domains, typed transform output, compatible supplied scales     |
| Custom mark              | Public `createMark<Datum, X, Y>()`, deterministic scene keys, original datum in points, no private import      |
| Custom interaction       | Typed focus and SVG renderer inversion of control; exact datum/x/y values; rejects incompatible coordinates    |
| Plot migration           | Uses Plot only as a conceptual reference and maps stale Plot options to supported TanStack APIs                |
| Maintenance edit         | Evolves an existing data model and chart without assertions, definition recreation, or type erosion            |

Every task validates typecheck, rendering, compact and wide containers, light
and dark themes, accessibility, and empty input where relevant. React and
Octane tasks must produce equivalent definitions rather than framework-specific
chart semantics.

Hard failures are consumer type errors, invented or deep-private imports,
`as any`, double assertions, suppression comments, forced adapter generics,
`import * as d3`, copied Plot-only APIs, or omitted dynamic input. Literal
preservation with `as const` is allowed.

## Documentation architecture

### 1. TanStack Charts API reference

Document only the APIs and behavior owned here:

- Host
- Framework adapters
- Renderer integration
- Native marks, channels, scales, transforms, and scene graph if that engine
  passes its gates
- Sizing
- Themes
- Events
- SSR
- Export
- Testing
- Extensions

### 2. Goal-oriented playbooks

Initial playbooks:

- Trend over time
- Compare and rank
- Distribution and outliers
- Relationships and correlation
- Change and delta
- Composition and share
- Cumulative values
- Small multiples and facets
- Normalization and baselines
- Uncertainty and ranges
- Annotations and events
- Geo
- Hierarchy, flow, and networks where Plot is suitable

Each playbook should include:

- Goal
- When to use it
- When not to use it
- Required data shape
- Recommended mark and transform construction
- Complete React implementation
- Complete Octane implementation
- Common modifications
- Failure modes
- Responsive and theme considerations
- Accessibility considerations
- Bundle profile
- Validation checklist
- Direct links to exact engine documentation and relevant compatible Plot
  concepts

### 3. Challenge-oriented guides

- Choosing marks
- Missing intervals
- Incomplete current periods
- Wide-to-tidy reshaping
- Long labels
- Tooltip clipping
- Custom tooltips
- Connecting pointer state to application state
- Interactive legends
- Controlled ranges
- Annotations
- Responsive layout
- Dark mode and custom themes
- SSR and hydration
- Export
- Testing
- Dense and large data
- Custom marks and transforms
- Migrating existing Plot code

### 4. Engine and Plot documentation

TanStack Charts declarations, exports, and checked examples are authoritative
for implementation. Do not restate D3 or Observable Plot APIs. Link to official
D3 documentation for the exact injected algorithm and maintain a curated Plot
map for visualization concepts:

- [Getting started](https://observablehq.com/plot/getting-started)
- [API index](https://observablehq.com/plot/api)
- [Marks](https://observablehq.com/plot/features/marks)
- [Transforms](https://observablehq.com/plot/features/transforms)
- [Facets](https://observablehq.com/plot/features/facets)
- [Interactions](https://observablehq.com/plot/features/interactions)
- [Accessibility](https://observablehq.com/plot/features/accessibility)

Every Plot link must be labeled conceptual or migration-only. A generated skill
must never translate a Plot mark, transform, tip, or pointer option into code
unless the installed TanStack exports and local compatibility guide name the
supported equivalent.

### 5. Machine-readable routing

Documentation pages should carry compact metadata that can generate search manifests, `llms.txt`, skill routing, and test matrices.

Illustrative frontmatter:

```yaml
goal: trend-over-time
challenges:
  - missing-intervals
  - partial-periods
  - responsive-layout
tanstack:
  marks:
    - lineY
    - ruleY
  imports:
    - '@tanstack/charts/line'
    - '@tanstack/charts/rule'
d3:
  packages:
    - d3-array
    - d3-scale
frameworks:
  - react
  - octane
tested:
  package: '@tanstack/charts'
  version: workspace
  typecheck: true
plotConcepts:
  - marks
  - scales
```

## Skills and TanStack Intent

Skills will be generated and distributed with the package documentation using
TanStack Intent when that system is ready for this project. The package docs,
public exports, declarations, and checked examples are the source of truth; the
skill is a reproducible derived artifact, never a second hand-maintained API
reference.

Start with one lean charting skill and progressively disclosed references. Split it only after usage shows clear, independent triggers.

Proposed structure:

```text
SKILL.md
references/
  choosing-a-visualization.md
  trends-and-time-series.md
  comparison-and-ranking.md
  distributions-and-outliers.md
  relationships.md
  composition-and-baselines.md
  annotations-and-layering.md
  interaction-and-selection.md
  responsive-layout.md
  accessibility.md
  performance.md
  testing-and-ssr.md
  react.md
  octane.md
  migrating-existing-plot-code.md
  plot-documentation-map.md
```

### Skill workflow

1. Inspect installed package versions and application framework.
2. Identify the analytical goal and actual data shape.
3. Load only the relevant playbooks and challenge guides.
4. Consult the installed engine documentation for exact APIs and Plot
   documentation for compatible concepts.
5. Trust installed typings over remembered options.
6. Generate ordinary TypeScript and JSX or TSRX using the TanStack host.
7. Use named, capability-specific imports.
8. Validate typecheck, rendering, resizing, themes, accessibility, and empty data.
9. Report any assumptions made about data semantics.

The skill must explicitly prevent invented APIs, accidental full-namespace
imports, duplicated host lifecycle, unsupported compatibility assumptions, and
React semantics inside native Octane code.

### Generation and release gates

1. Attach compact routing metadata to each goal and challenge guide.
2. Generate `llms.txt`, the one lean `SKILL.md`, and progressively loaded
   references from the same documentation index.
3. Resolve every API symbol and package subpath against the built public exports
   and declarations. Reject private or missing imports.
4. Typecheck all generated code blocks as package consumers under strict
   TypeScript.
5. Run the agent matrix above once with documentation only and once with the
   generated skill. The skill must improve routing without weakening the hard
   failure rules.
6. Regenerate in CI and require no diff. A package release cannot publish stale
   routing metadata or a skill from a different API version.
7. Feed failures into `API-FRICTION.md` and fix them at the API,
   documentation, skill, application, or tooling layer that owns them.

The first skill covers the full grammar. Split it only after evaluation data
shows independent triggers and a smaller reference set improves performance.
General data profiling, cleaning, and chart recommendation may use separate
exploration skills later; they do not become runtime dependencies.

## TanStack.com findings and migration

### Existing generic infrastructure

- `src/components/charts/PlotContainer.tsx`
  - Generic responsive React lifecycle wrapper
  - Direct migration candidate
- `src/components/charts/TimeSeriesChart.tsx`
  - Generic line, area, bar, and cumulative chart
  - Better represented as a documented recipe built on the new host
- `src/components/intent/SkillSparkline.tsx`
  - Plot-based interactive sparkline
  - Migrate host behavior and replace manual click geometry with Plot’s value and `input` event bridge where practical
- `src/components/intent/SkillDependencyGraph.tsx`
  - Custom D3 force-directed SVG
  - Remains bespoke; not a migration target

### NPM Stats

`NPMStatsChart.tsx` currently combines:

- Data transformations
- Plot construction
- Container sizing
- Themes
- Tooltip geometry
- Interaction
- Animation
- Export
- Product controls
- Package grouping and normalization
- Baselines
- Partial-data handling

The library should absorb only the generic host, responsive, theme, interaction, SSR, export-extension, and lifecycle concerns.

The application should retain:

- NPM-specific fetching and API limits
- URL-serializable product state
- Range and binning semantics
- Grouped package behavior
- Partial download semantics
- Baseline and index semantics
- Timeline playback
- Product-specific motion
- Embed product behavior

The native Stats fixtures now exercise:

- complete and partial multi-series lines
- stacked, normalized-share, and stream areas from explicit intervals
- grouped and stacked bars in both orientations
- per-series and per-datum colors, gradients, and dashed strokes
- zoom domains and clipping
- explicit tick rotation plus automatic measured margins
- grouped pointer focus and tooltip values
- stable keyed updates, enter/update/exit, and interrupted animation
- light and dark rendering with unique resource IDs

The fixture and acceptance matrix live in
`packages/charts-core/docs/tanstack-stats-migration.md`. TanStack Charts is now
the default renderer on the real TanStack.com route;
`chartRenderer=plot` retains the comparison path. It uses the production Stats
data and product state rather than fixture-specific transforms.

Browser comparison passes every timeline and bar layout, zoom clipping,
320px/full-width responsiveness, light/dark inheritance, wrapped legends,
embed rendering, and non-blank animated bucket updates. Static and animated
export controls are live against the canary SVG, but GIF and WebM frames still
come from the existing Plot frame generator. Remaining sign-off work is
automated screenshot coverage, pointer and keyboard comparison, decoded export
comparison, native animated frames, and route-level timing.

The historical pre-D3-native canary bundle comparison against the same
`origin/main` commit showed:

- baseline Stats chunk: 20.45 kB gzip
- canary Stats shell: 20.92 kB gzip
- lazy TanStack Charts renderer: 14.56 kB gzip
- existing Plot chunk: 68.98 kB gzip

At that checkpoint, the default Plot path paid only 0.47 kB gzip for the
canary switch, and a native-only Stats route was estimated to save at least
53.96 kB gzip. These values predate the strict-scale migration and default
renderer cutover; the current repository bundle fixtures above are the source
of truth.

The historical deterministic local benchmark also favored the native path: a keyed
78-point host update measures 1.66 ms median versus 3.05 ms for the stateful
Plot renderer, and native line scene plus SVG generation measures 0.19 ms
median versus 4.75 ms for the equivalent Plot trend case. Production-route
profiling remains before removal sign-off.

### Lessons to preserve

- The NPM API can silently truncate requests over roughly 18 months; requests need application-level chunking, caching, retries, and partial-result handling.
- Baselines and normalization are data semantics, not rendering options.
- Equal-weighted multi-package indexes require deliberate definition and tests.
- Tooltip marks can be clipped independently from the surrounding SVG; mark clipping, visible overflow, and `--plot-background` must be handled coherently.
- Export needs resolved styles, not just serialized markup.
- URL state and reproducible chart configuration are valuable application patterns but do not belong in the chart runtime.
- Generic guide geometry, automatic layout, browser font measurement, and host
  invalidation have focused tests. Automated visual baselines remain a release
  gate.

## Historical expected capability map

This is the initial prototype target retained for design history. The current
implemented surface and remaining gaps are recorded in the product checkpoint,
conformance catalog, stress checkpoint, and phased status sections above and
below; do not infer current support from this list.

At the start of the proof, Observable Plot supplied most low-level
visualization capability. The proposed native engine was expected to make the
following production concerns easy and documented:

### Common charts

- Line and area
- Bar and grouped bar
- Dots and scatterplots
- Sparklines
- Histograms and binned distributions
- Box plots
- Heatmaps
- Small multiples
- Cumulative charts
- Normalized and indexed series
- Difference and range charts

### Advanced grammar capability

- Layered marks
- Built-in and custom transforms
- Facets
- Statistical marks and regressions
- Contours and density
- GeoJSON and projections
- Trees and supported network-like layouts
- Custom SVG marks

### Application integration

- Container responsiveness
- Automatic themes
- SSR and static output
- Pointer value bridging
- Controlled application state
- Loading and empty states
- Accessible titles and descriptions
- Locale-aware formatting
- RTL validation
- Export
- Testing
- Optional motion

### Features to validate during prototyping

- Interactive legends
- Brush selection
- Zoom and pan
- Cross-chart coordination
- Streaming or frequently updating data
- Very large datasets and downsampling boundaries
- Data-table companions
- Print styles
- Canvas or raster fallbacks

These should not automatically become core features. Each must prove that a shared primitive is materially better than a documented application recipe.

## Phased delivery

### Phase 0: durable plan and evidence

Status: complete and ongoing as maintenance.

- Maintain this file as the source of truth.
- Create the repository README when implementation begins.
- Convert provisional decisions into explicit accepted decisions as prototypes validate them.
- Keep bundle measurements and Plot compatibility findings current.

### Phase 1: architecture prototypes

Status: complete. The host and native-engine prototypes cover client lifecycle,
SSR, hydration adoption, sizing, zero-to-visible recovery, theme, interaction,
dynamic input, memoized preparation, keyed transitions, React, Octane, bundle
measurement, and the first cartesian profile.

Build disposable but correct prototypes for:

- Framework-neutral renderer contract
- React host
- Native Octane host
- Responsive zero-to-visible behavior
- Automatic nested themes
- Plot `input` event bridging
- SSR with injected `document`
- Minimal and common-chart bundle measurements
- Arbitrary dynamic definition input and invalidation
- Separately memoized preparation
- Optional state-to-state reconciliation with interruption
- Plot-compatible modular fork measurement
- Native-engine cartesian subset measurement

Exit criteria:

- One chart definition works in React and Octane.
- Resize, theme switching, SSR, interaction, cleanup, and bundle boundaries are demonstrated.
- No fixed chart-component grammar is introduced; any native track preserves the layered mark/channel model.

### Phase 2: minimal production core

Status: in progress. Package names, capability boundaries, packed-consumer
artifacts, automated visual and interaction conformance, production-browser
stress evidence, and bundle CI are established. Remaining productization gates
include public diagnostics, release compatibility policy, and published bundle
budgets.

- Finalize public package and entry-point structure.
- Implement host lifecycle and diagnostics.
- Implement sizing modes.
- Implement theme tokens and exportable theme resolution.
- Implement interaction bridge.
- Add core, adapter, differential, and visual tests.
- Establish bundle-size CI.

### Phase 3: first recipes and documentation

- Trend over time
- Comparison and ranking
- Distribution
- Faceted or cohort visualization
- Sparkline
- Loading, empty, partial, and error states
- React and Octane versions
- Bundle profiles and exact engine documentation links
- Strict, cast-free consumer typecheck for every complete example
- Routing metadata that resolves only public TanStack and granular D3 imports

### Phase 4: TanStack.com migration

Status: the Stats-shaped fixtures, real TanStack.com integration, and default
renderer cutover are complete. Manual differential coverage passes the
rendering, responsive, theme, zoom, legend, embed, and animated-update matrix.
Plot remains in the route for GIF and WebM frame generation and the explicit
comparison path. Automated visual, interaction, decoded-export, and
production-browser performance gates remain before Plot removal. The current
repository bundle matrix passes its profile-specific ceilings.

- Replace `PlotContainer`.
- Rebuild generic `TimeSeriesChart` as a recipe.
- Migrate `SkillSparkline`.
- Extract the generic shell from NPM Stats without moving its product semantics.
- Verify feature and export parity where migration scope requires it.

### Phase 5: TanStack Starters integration

- Add optional chart capability or add-on.
- Build a polished analytics example.
- Include both basic and advanced layered compositions.
- Verify starter production bundle.
- Add agent-readable modification instructions.
- Run the agent acceptance test.

### Phase 6: skills

- Generate one lean skill with TanStack Intent from the versioned package docs,
  public exports, declarations, and checked examples.
- Package the generated skill and progressively loaded references beside the
  documentation.
- Generate routing metadata and `llms.txt` from the same index.
- Require symbol resolution, strict example typecheck, regeneration with no
  diff, and the documentation-versus-skill agent matrix above.
- Run the matrix against React, Octane, TanStack.com migration, and Starters.
- Feed every failure into `API-FRICTION.md`; never teach a cast around an API
  defect.
- Split skills only when evaluation evidence justifies it.

### Phase 7: optional capabilities

- SVG and raster export — implemented
- Static rendering pipeline — implemented
- Motion — implemented
- Selection and brush helpers
- Cross-chart coordination

Each optional capability should have a real consumer, independent entry point, bundle budget, and removal path.

## Initial success criteria

- A small, stable runtime surface
- A documented TanStack grammar subset with direct granular D3 injection and
  an explicit conceptual migration map from Observable Plot
- React and Octane parity
- Reliable container responsiveness
- Automatic light and dark mode
- SSR without browser-global failures or theme mismatch
- Typed application-facing pointer state
- Optional features excluded from default bundles
- Measured bundle budgets
- Complete, tested, goal-oriented examples
- A successful generic migration from TanStack.com
- A compelling optional integration in TanStack Starters
- An agent can create and modify charts without inventing APIs or requiring runtime AI features

## Open decisions

- Whether the core should render loading and empty UI or expose only state slots
- Minimum React and Octane versions
- CSS distribution strategy
- Locale and RTL API boundaries
- Which interaction helpers belong in the library versus recipes
- Whether Starters integration is a built-in capability, CLI add-on, or maintained example
- Public bundle budgets

## Decision log

### Accepted

- The product and package family are named TanStack Charts. Observable Plot is
  an architectural influence and preserved comparison, not the shipped engine.
- The package topology is `@tanstack/charts` plus thin React and Octane adapter
  packages. Chart-owned optional capabilities use core subpaths; D3 algorithms
  remain direct granular dependencies.
- A D3-compatible, TanStack-rendered, Plot-inspired engine owns the product
  package names; Observable Plot remains preserved comparison research.
- The React Charts revival spike is part of the TanStack Charts native-engine
  investigation rather than a separate product plan.
- TanStack Charts will preserve a layered marks, channels, scales, transforms,
  and facets grammar rather than introduce fixed chart components.
- Data exploration intelligence belongs in documentation and skills, not the runtime.
- React and Octane are first-class.
- Responsiveness is based on the chart container.
- Automatic light and dark themes are the default.
- Bundle boundaries are a product requirement.
- Optional heavy capabilities must not leak into root entry points.
- TanStack.com is the first migration target.
- TanStack Starters is a first-party proving ground.
- Skills will eventually be built and distributed using TanStack Intent.
- Stable object-based definitions use typed declarative input, shallow
  plain-object equality, optional `prepareEqual`, and per-host runtime state.
- Keyed scene reconciliation is the native dynamic-update boundary.
- Optional scale families, curves, guides, export, and framework adapters use
  explicit tree-shakeable imports.
- Native D3 callables remain first-class inputs, while compact TanStack
  primitives may own narrower ergonomic contracts. Both remain independently
  tree-shakeable; neither owns the renderer or DOM lifecycle.
- Configured positional scales are required by the destination grammar.
  TanStack copies them and owns responsive ranges; D3 owns their semantics.
- Common capabilities use a four-level progressive disclosure model:
  automatic polished defaults, declarative mapping, typed structured
  composition, and complete inversion of control.
- Automatic guide margins are the minimum measured space needed to keep axis
  labels and titles inside the chart. Numeric per-side margins remain hard
  overrides.
- The conformance `case.json` corpus is the canonical manifest for the
  source-backed catalog, per-case proof pages, documentation embeds, and
  checked-in source index.

### Provisional

- Chart-module-level lazy loading
- A structured tooltip row and swatch model
- Selection, brushing, zooming, and cross-chart coordination helpers
