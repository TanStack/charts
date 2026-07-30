# TanStack Charts API friction log

This is the durable feedback loop for building the API with itself. It records
observed difficulty from examples, production migrations, tests, and agent
evaluations so later API, documentation, and TanStack Intent skill work is
based on evidence.

Last updated: 2026-07-29

## Triage rule

| Owner         | Use when                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| API           | Correct code is repeatedly verbose, error-prone, ambiguous, or untypable |
| Documentation | The API is sound but the correct pattern is hard to discover             |
| Skill         | The difficulty is data analysis, chart choice, or multi-step authoring   |
| Application   | The behavior is specific to Stats or another product                     |
| Tooling       | The issue is imports, bundle inspection, testing, or generation          |

Do not hide API problems in a skill. Do not add runtime inference merely to
save an agent a few tokens. Prefer an explicit D3 value when it already
expresses the required semantics.

## Entry format

Each entry records:

- status: `open`, `monitoring`, or `resolved`;
- owner and severity;
- the concrete task where it appeared;
- expected and actual authoring experience;
- decision and verification;
- follow-up if the evidence is not yet sufficient.

## Index

| ID    | Finding                                                  | Owner           | Status     |
| ----- | -------------------------------------------------------- | --------------- | ---------- |
| F-001 | Configured D3 scales required a TanStack wrapper         | API             | resolved   |
| F-002 | Responsive range ownership was unclear                   | Documentation   | resolved   |
| F-003 | Scale requirements were absent from chart types          | API             | resolved   |
| F-004 | A radius channel silently imported continuous D3         | API             | resolved   |
| F-005 | Curved area topology was implemented independently       | API             | resolved   |
| F-006 | Explicit domain construction is repetitive               | API/Skill       | monitoring |
| F-007 | Runtime and adapters bypassed strict scales              | API             | resolved   |
| F-008 | D3 motion would currently burden every DOM host          | API             | resolved   |
| F-009 | Automatic ordinal color is an implicit exception         | Documentation   | resolved   |
| F-010 | D3 curves require one TanStack grammar bridge            | API             | monitoring |
| F-011 | Adapters performed dynamic preparation twice             | API             | resolved   |
| F-012 | Render callbacks omit diagnostic metrics                 | API             | monitoring |
| F-013 | Bar series identity also changed bar geometry            | API             | resolved   |
| F-014 | Responsive nicing duplicates layout calculations         | API             | resolved   |
| F-015 | Legacy scale helpers compete with the D3-first API       | API             | resolved   |
| F-016 | Stats animated export still renders through Plot         | Integration/API | open       |
| F-017 | React migration rebuilt a static definition              | Documentation   | resolved   |
| F-018 | Stats derivations still invalidate dynamic input         | Application     | monitoring |
| F-019 | Custom tooltip formatting leaked float artifacts         | Application     | resolved   |
| F-020 | Axis focus could not select a single nearest point       | API             | resolved   |
| F-021 | Native tooltips only accept plain text                   | API             | monitoring |
| F-022 | Native tooltips could not be pinned                      | API             | resolved   |
| F-023 | Fixed margins clip or waste guide space                  | API             | resolved   |
| F-024 | Co-located benchmark cases defeated tree shaking         | Tooling         | resolved   |
| F-025 | Bundle maintenance clobbered comparison reports          | Tooling         | resolved   |
| F-026 | Facet summaries omitted the overall result               | Tooling         | resolved   |
| F-027 | Pnpm validation attempted an interactive purge           | Tooling         | resolved   |
| F-028 | Field channels accepted incompatible value types         | API             | resolved   |
| F-029 | Dynamic hosts allowed omitted input                      | API             | resolved   |
| F-030 | Heterogeneous dynamic marks erased datum types           | API             | resolved   |
| F-031 | Positional scales were disconnected from channels        | API             | resolved   |
| F-032 | Memoized adapter internals erase generic types           | API             | resolved   |
| F-033 | Point coordinate values remain broad                     | API/Docs        | resolved   |
| F-034 | Text color and offset required mark duplication          | API             | resolved   |
| F-035 | Plot legends confused the primary SVG measurement        | Tooling         | resolved   |
| F-036 | Presence-only visual checks overstated parity            | Tooling         | resolved   |
| F-037 | Facets repeat shared axes in every panel                 | API             | resolved   |
| F-038 | Plot and D3 threshold arrays mean different things       | Documentation   | resolved   |
| F-039 | Dots could not express stroke opacity                    | API             | resolved   |
| F-040 | Bundle ceilings allowed silent universal growth          | Tooling         | resolved   |
| F-041 | Bounded segments and caps required custom marks          | API             | resolved   |
| F-042 | Hoisted tooltip options lose callback context            | API/Docs        | monitoring |
| F-043 | Plot and D3 wiggle stacks use different origins          | Documentation   | resolved   |
| F-044 | Difference fills need crossing interpolation             | Documentation   | resolved   |
| F-045 | Arrow endpoints could not express vector fields          | API             | resolved   |
| F-046 | Mirrored labels required duplicate text marks            | API             | resolved   |
| F-047 | Unique Delaunay edges are not obvious                    | Documentation   | monitoring |
| F-048 | Responsive waffle packing lacks final bounds             | API             | monitoring |
| F-049 | Plot and d3-hexbin use different units                   | Documentation   | resolved   |
| F-050 | Plot proportion units depend on transform scope          | Documentation   | monitoring |
| F-051 | Beeswarm layout needs responsive pixel preparation       | Documentation   | monitoring |
| F-052 | D3 rank overloads lose callback context                  | Documentation   | monitoring |
| F-053 | Data-bound annotations can escape auto margins           | Documentation   | monitoring |
| F-054 | D3 reducer output needs empty-safe narrowing             | Documentation   | monitoring |
| F-055 | Horizontal areas required renderer internals             | API             | resolved   |
| F-056 | Conformance tooling assumed Plot was the reference       | Tooling         | resolved   |
| F-057 | D3 hierarchy coordinates use screen-space y              | Documentation   | monitoring |
| F-058 | Radar checks ignored polar labels                        | Tooling         | resolved   |
| F-059 | Vite cached a newly added package subpath                | Tooling/API     | resolved   |
| F-060 | Geometry similarity could not gate exact layouts         | Tooling         | resolved   |
| F-061 | Catalog metadata validation was browser-bound            | Tooling         | resolved   |
| F-062 | Interaction checks were selector-bound                   | Tooling         | resolved   |
| F-063 | Resolved scales cannot map pixels back to values         | Documentation   | resolved   |
| F-064 | Scroll-clipped labels failed containment                 | Tooling         | resolved   |
| F-065 | Logical views required fake DOM roots                    | Tooling         | resolved   |
| F-066 | Disabling native focus required a custom strategy        | API             | resolved   |
| F-067 | Reference wrappers duplicated accessible roots           | Tooling         | resolved   |
| F-068 | Source audit omitted shared implementation files         | Tooling         | resolved   |
| F-069 | Strict containment exposed a clipped Plot guide          | Application     | resolved   |
| F-070 | ECharts brush injected an undeclared toolbox             | Application     | resolved   |
| F-071 | Formatter crossed into the Stats parity worktree         | Tooling         | resolved   |
| F-072 | Wide brush ticks exceeded a locked right margin          | Application     | resolved   |
| F-073 | Scenario state overstated interaction quality            | Tooling         | resolved   |
| F-074 | Axis focus distance created sparse cursor gaps           | Documentation   | monitoring |
| F-075 | Gesture recipes omitted controller semantics             | Documentation   | monitoring |
| F-076 | Compact charts could not keep only one axis guide        | API             | resolved   |
| F-077 | Transient host focus survived blur and cancellation      | API             | resolved   |
| F-078 | Renderer completion signals were incomparable            | Tooling         | resolved   |
| F-079 | Large-data timing hid representation cost                | Tooling/Skill   | resolved   |
| F-080 | Benchmark adapters drifted from shared geometry          | Tooling         | resolved   |
| F-081 | Pointer probes confused tooltip presence with state      | Tooling         | resolved   |
| F-082 | Dormant DOM-host work accumulated across dashboards      | API             | resolved   |
| F-083 | One-shot pointer timing hid sustained cursor work        | Tooling         | resolved   |
| F-084 | Gesture and viewport costs were conflated                | Tooling         | resolved   |
| F-085 | Grid style repeated on every rule                        | API             | resolved   |
| F-086 | Finding status drifted from the index                    | Tooling         | resolved   |
| F-087 | Custom focus strategies erased application types         | API             | resolved   |
| F-088 | Update counts hid key and latest-wins correctness        | Tooling         | resolved   |
| F-089 | Custom SVG renderers erased scene point types            | API             | resolved   |
| F-090 | Source exports hid packed-package failures               | Tooling         | resolved   |
| F-091 | Adapter coordinate generics broke explicit arity         | API             | resolved   |
| F-092 | Packed documentation linked outside its tarball          | Docs/Tooling    | resolved   |
| F-093 | Filtered stress runs overwrote canonical reports         | Tooling         | resolved   |
| F-094 | Custom marks conflated point and scale values            | API/Docs        | resolved   |
| F-095 | Long matrices treated one browser stall as deterministic | Tooling         | resolved   |
| F-096 | Export smoke tests drifted from package manifests        | Tooling         | resolved   |
| F-097 | Lifecycle page errors passed the memory soak             | Tooling         | resolved   |
| F-098 | Filtered conformance runs overwrote full reports         | Tooling         | resolved   |
| F-099 | Invalid cells remained eligible for fastest rankings     | Tooling         | resolved   |
| F-100 | Spatial-index updates skipped focused UI repaint         | API             | resolved   |
| F-101 | Page errors could age into retryable timeouts            | Tooling         | resolved   |
| F-102 | AI recipes hid direct D3 dependency ownership            | Docs/Tooling    | resolved   |
| F-103 | Mixed valid and unknown filters narrowed benchmark scope | Tooling         | resolved   |
| F-104 | Catalog embeds lacked a production-safe contract         | Tooling         | monitoring |
| F-105 | Competing documentation roots drifted                    | Docs/Tooling    | resolved   |
| F-106 | Build-context theme looked fully resolved                | Documentation   | resolved   |
| F-107 | Authored SVG tab indexes were ignored                    | API             | resolved   |
| F-108 | Interaction point color differed from rendered fill      | API             | resolved   |
| F-109 | Grouped focus could duplicate the focused series         | API             | resolved   |
| F-110 | Hexagon radius mapping accepted invalid source values    | API             | resolved   |
| F-111 | Adapter aspect-ratio geometry diverged on first render   | API             | resolved   |
| F-112 | Reference rules could not render dashed strokes          | API             | resolved   |
| F-113 | Direct runtime factories cannot infer later definitions  | API/Docs        | monitoring |
| F-114 | Gradient stop tokens disappeared from standalone exports | API             | resolved   |
| F-115 | Documentation checks did not validate code snippets      | Tooling         | resolved   |
| F-116 | Build context was mistaken for resolved plot geometry    | Documentation   | resolved   |
| F-117 | Non-Cartesian examples duplicated coordinate engines     | API             | resolved   |
| F-118 | Serialized SVG discarded interaction semantics           | API/Application | monitoring |
| F-119 | Catalog hosting crossed repository ownership             | Tooling         | monitoring |
| F-120 | Key-only focus collapsed duplicate observations          | API             | resolved   |
| F-121 | SVG callback was not a rendering-pipeline boundary       | API             | resolved   |
| F-122 | Dense scene aggregation overflowed the call stack        | API             | resolved   |
| F-123 | Framework adapters repeated runtime ownership            | API             | resolved   |
| F-124 | Name-only inventories masked undocumented contracts      | Docs/Tooling    | resolved   |
| F-125 | Adapter surface classes disappeared across lifecycles    | API             | resolved   |
| F-126 | Executable comparisons had no public documentation       | Docs/Tooling    | resolved   |
| F-127 | Catalog source hid data transformation dependencies      | Docs/Tooling    | resolved   |
| F-128 | Chart-owned data reactivity duplicated application state | API             | resolved   |

## Findings

### F-001 — Configured D3 scales required a TanStack wrapper

- Status: resolved
- Severity: high
- Observed in: explicit-scale bundle spike
- Friction: authors had to wrap `scaleLinear()` with `configuredScale(...)`
  even though the D3 callable already contained the complete contract.
- Decision: accept raw callable, copyable D3 scales directly.
- Verification: positional scale tests cover linear, UTC, band centering,
  reversal, responsive copying, and source-scale immutability.

### F-002 — Responsive range ownership was unclear

- Status: resolved
- Severity: medium
- Observed in: documentation conversion to raw D3 scales
- Friction: normal D3 examples configure both domain and range, while a
  container-responsive chart cannot know its final pixel range at definition
  time.
- Decision: the author owns the semantic domain; TanStack copies the scale and
  owns its responsive range.
- Verification: the responsive-scale tests cover copying, range replacement,
  reversal, and source immutability. A source audit of the complete authored
  conformance catalog found no configured positional chart scale with an
  application-owned pixel range. The remaining `.range(...)` calls are
  intentional color/radius mappings, screen-space preparation, or interaction
  copies using `scene.chart`; the recipes distinguish all three.

### F-003 — Scale requirements were absent from chart types

- Status: resolved
- Severity: high
- Observed in: strict compiler and runtime integration
- Friction: definitions did not require an author to decide how both
  positional dimensions map, so omitted scales could reach scene creation.
- Decision: `ChartSpec` requires `x` and `y`. Each dimension supplies a
  configured scale or explicitly uses `null` when no mark materializes that
  dimension. `createChartScene` retains guards for untyped consumers.
- Verification: TypeScript rejects an omitted axis; scene tests reject missing
  scales and `null` on materialized dimensions while accepting positionless
  charts with two explicit null axes.

### F-004 — A radius channel silently imported continuous D3

- Status: resolved
- Severity: high
- Observed in: representative-mark and spatial bundle traces
- Friction: importing `dot` retained `scaleRadial` and the full continuous D3
  scale graph even when every dot used a fixed radius.
- Decision: radius values are pixels by default. Data-driven area mapping
  requires a supplied `scaleRadial` or compatible callable.
- Verification: representative marks returned to 7.81 kB gzip from 15.39 kB;
  raw D3 radial mapping has behavior coverage.

### F-005 — Curved area topology was implemented independently

- Status: resolved
- Severity: high
- Observed in: D3 correctness audit
- Friction: joining two independently curved line paths was not equivalent to
  D3 area topology.
- Decision: `d3Curve` delegates curved line and area generation to `d3-shape`.
  Straight SVG paths remain dependency-free renderer serialization.
- Verification: line and area curve tests pass against D3-generated paths.

### F-006 — Explicit domain construction is repetitive

- Status: monitoring
- Severity: medium
- Observed in: recipe, sandbox, shared fixture, and TanStack Stats migrations
- Friction: every positional scale needs a complete, empty-safe domain. The
  correct expression varies for linear, time, band, stacked, diverging, and
  interval data.
- Current decision: teach direct `d3-array` and `d3-scale` construction before
  adding runtime inference or TanStack wrappers.
- Sandbox evidence: one time-series definition required separate
  `dateDomain` and `zeroIncludingDomain` helpers, including two different
  empty-data policies. The helpers remained short and application-specific.
- Stats evidence: six layout branches required UTC extents, zero-inclusive
  numeric extents, both endpoints of stacked and stream intervals, explicit
  categorical order, and empty or constant fallbacks. D3 still supplied the
  mathematical primitives; the remaining policy was application-specific.
- Documentation evidence: an audit found examples asserting `d3.extent`
  results into non-empty tuples. The recipes now show explicit empty-data
  fallbacks instead of teaching an assertion that can create undefined scale
  domains.
- Follow-up: measure agent mistakes in recipes and evals. Add an API only if a
  correctness-sensitive domain policy repeats across unrelated products.

### F-007 — Runtime and adapters bypassed strict scales

- Status: resolved
- Severity: high
- Observed in: strict compiler integration audit
- Friction: an isolated strict scene function was insufficient while the
  vanilla runtime, dynamic definitions, React, Octane, and nested facets still
  entered the transitional inferred-scale compiler.
- Decision: make `createChartScene` the only runtime compiler and migrate every
  internal consumer to raw supplied scales or explicit null axes.
- Verification: runtime tests cover dynamic missing-scale failure; facets,
  shared fixtures, benchmarks, the sandbox, React, Octane, and the Stats
  canary all use the same strict compiler. No production compiler calls the
  inferred scale builder.

### F-008 — D3 motion would currently burden every DOM host

- Status: resolved
- Severity: medium
- Observed in: interpolation bundle audit
- Friction: `d3-interpolate` adds about 3.82 kB gzip if imported by the normal
  reconciler, including charts that never animate.
- Decision: define an injectable motion driver or separate animated host
  boundary before replacing native interpolation and easing.

### F-009 — Automatic ordinal color is an implicit exception

- Status: resolved
- Severity: low
- Observed in: strict-scale product policy
- Friction: positional and continuous color scales are explicit, while grouped
  marks receive an automatic D3 ordinal theme scale.
- Decision: retain this documented exception because it costs about 0.62 kB
  gzip and materially improves the default chart.
- Verification: the first grouped-series recipe now states the automatic
  theme-palette default and routes fixed semantic ownership to a supplied D3
  ordinal scale, palette-only changes to `color.range`, and theme-wide changes
  to CSS variables. Catalog cases use explicit ordinal scales where reference
  colors are semantic while ordinary grouped examples need no extra setup.

### F-010 — D3 curves require one TanStack grammar bridge

- Status: monitoring
- Severity: low
- Observed in: optional curve integration
- Friction: authors write `d3Curve(curveMonotoneX)` instead of supplying the D3
  curve factory directly.
- Decision: keep the bridge while it prevents straight lines and areas from
  importing `d3-shape` and gives one curve value both line and area semantics.
- Follow-up: measure authoring errors before considering a direct curve-factory
  overload or a separate curved mark.

### F-011 — Adapters performed dynamic preparation twice on mount

- Status: resolved
- Severity: high
- Observed in: TanStack Charts sandbox migration
- Friction: `ChartSurface` creates a temporary runtime and prepares the dynamic
  definition for initial markup. The mounted DOM host creates another runtime
  and immediately prepares the same input again. A preparation counter reads
  two before the first interactive update.
- Expected: one logical chart mount performs expensive preparation once.
- Decision: superseded by F-128. Charts no longer owns data preparation.
  Adapter prerender and mount still share one runtime for renderer handoff, but
  application reactivity owns transformed data and asynchronous cleanup.
- Verification: React and Octane dynamic mounts, hydration, and SSR retain
  complete initial markup without a preparation lifecycle.

### F-012 — Render callbacks omit diagnostic metrics

- Status: monitoring
- Severity: low
- Observed in: TanStack Charts sandbox migration
- Friction: `onRender` exposes the scene and elements but not render count,
  reason, or duration. The sandbox can count callbacks, but it lost the prior
  host's resize/update reason and timing diagnostics.
- Current decision: keep a local render counter. Add core metrics only if
  performance tooling or another production consumer needs them.

### F-013 — Bar series identity also changed bar geometry

- Status: resolved
- Severity: high
- Observed in: package-ranking sandbox and TanStack Stats migrations
- Friction: `barY` and `barX` interpreted every `z` value as an implicit
  side-by-side subgroup, dividing a primary band with TanStack-owned math. Nine
  unique package identities made the Stats snapshot bars roughly one pixel
  thick and shifted each away from its categorical tick.
- Expected: the supplied D3 band scale completely owns bar position and
  thickness. Series or color identity must not silently change geometry.
- Decision: bars fill the primary scale bandwidth by default, with no implicit
  inset. `z` remains series identity and a color fallback. True side-by-side
  bars inject a secondary D3 band scale through `groupScale`; TanStack copies
  it and supplies the primary bandwidth as its responsive range.
- Verification: focused tests cover exact band starts, widths, centers,
  source-scale immutability, non-positional `z`, and injected grouped scales.
  Stats grouped and stacked snapshots now match Plot rectangle geometry in
  both orientations.

### F-014 — Responsive nicing duplicates layout calculations

- Status: resolved
- Severity: medium
- Observed in: strict D3-scale migration of the TanStack Stats canary
- Friction: Stats owns the semantic domains, but preserving its previous
  responsive nicing required it to reproduce TanStack's inner plot size and
  tick-count formulas before calling D3's `nice(tickCount)`.
- Expected: an application should supply semantic data policy without
  duplicating private guide-layout calculations.
- Decision: Stats now supplies the exact semantic domain, matching Plot, and
  lets the copied D3 scale generate ticks for the resolved range. This removes
  its duplicate inner-size and tick-count calculation. If a future product
  genuinely requires range-dependent nicing, it can justify a scale-factory
  extension with new evidence.
- Verification: the Stats definition no longer calculates private inner plot
  dimensions or calls `.nice(tickCount)`, and its snapshot value endpoints
  match Plot.

### F-015 — Legacy scale helpers compete with the D3-first API

- Status: resolved
- Severity: high
- Observed in: strict migration of fixtures, sandbox, and Stats
- Friction: `scaleUtc`, `scaleTime`, `scaleLog`, `scaleSymlog`, `scaleSqrt`,
  `configuredScale`, `ChartScaleTransform`, and inferred scale types remain
  exported beside native `d3-scale` values. Their names are easier for both
  humans and agents to select accidentally even though the strict compiler no
  longer consumes inferred axis options.
- Decision: remove the legacy inferred scale and transform surface after its
  historical tests and bundle fixtures have been relabeled or deleted. Keep
  D3 imports visibly sourced from `d3-scale`.
- Verification: the obsolete scale, radius, color, curve, transform, and
  spatial wrappers and subpaths are gone; the inferred-scale builder and its
  tests are deleted; fixtures and histogram benchmarks use direct `d3.bin`;
  repository search finds only direct D3 imports in product definitions.
  TypeScript, the standard test suite, both four-test Octane matrices, and
  every bundle budget pass.

### F-016 — Stats animated export still renders through Plot

- Status: open
- Severity: high
- Owner: Integration/API
- Observed in: TanStack Stats default-renderer cutover
- Friction: the live route and static export use TanStack Charts by default,
  but GIF and WebM frame generation still calls the Observable Plot export
  renderer. Plot therefore remains a production dependency after the runtime
  cutover.
- Decision: render animated frames through TanStack scenes using the same
  prepared Stats data, then compare decoded timing, dimensions, colors,
  legends, and frame contents against the existing output.
- Verification: pending animated export parity tests and removal of the Plot
  frame generator.

### F-017 — React migration rebuilt a static definition

- Status: resolved
- Severity: high
- Observed in: TanStack Stats default-renderer cutover
- Friction: the first migration created a static chart definition inside
  `useMemo(..., [props])`. React creates a new props object for every component
  render, so the definition changed identity and reset runtime memoization even
  when every chart-relevant value was unchanged.
- Decision: define one dynamic chart at module scope and pass a narrowed input
  object containing only scene-relevant values. The runtime's shallow input
  equality now ignores parent-only legend, footer, ref, and callback changes;
  resolved chart height comes from the dynamic build context.
- Verification: the Stats figure typecheck and lint pass, while core and
  adapter tests cover stable-definition input invalidation and one preparation
  per mount.

### F-018 — Stats derivations still invalidate dynamic input

- Status: monitoring
- Severity: medium
- Owner: Application
- Observed in: TanStack Stats default-renderer cutover
- Friction: the chart definition is stable, but `NPMStatsChart` still derives
  arrays and accessor functions during its application render. Those values
  are legitimate chart inputs, so new identities cause a redraw even when an
  unrelated parent update leaves their semantics unchanged.
- Current decision: keep equality honest in the chart runtime. Memoize the
  Stats derivation pipeline or add a narrow application revision key if render
  diagnostics show avoidable redraws; do not hide unstable application input
  behind generic deep equality in TanStack Charts.
- Follow-up: expose or instrument render reasons in the Stats canary, then
  measure parent-only updates before promoting this from a migration concern
  into API work.

### F-019 — Custom tooltip formatting leaked float artifacts

- Status: resolved
- Severity: high
- Owner: Application
- Observed in: TanStack Stats tooltip parity and ECharts axis-pointer catalog
  case
- Friction: the automatic host tooltip uses locale-aware number formatting,
  but Stats supplied `formatGroup` and then formatted values below 1,000 with
  `Number.prototype.toString()`. Normalized values exposed full floating-point
  artifacts such as `0.4863476502659163`.
- Decision: keep numeric presentation policy in the application callback and
  use `Intl.NumberFormat('en-US')`, matching the existing Plot tooltip.
- Verification: the Stats formatting test covers integers, normalized
  fractions, negative compact values, thousands, and millions. The core
  runtime test proves its automatic formatter also suppresses float artifacts.

### F-020 — Axis focus could not select a single nearest point

- Status: resolved
- Severity: high
- Owner: API
- Observed in: TanStack Stats tooltip parity
- Friction: `focusX` and `focusY` intentionally return one point per series at
  an axis value. Observable Plot's `pointerX` and `pointerY` select only the
  nearest point while prioritizing that axis, so stacked and segmented charts
  could not preserve their existing interaction without a custom strategy.
- Decision: add tree-shakeable `focusNearestX` and `focusNearestY` strategies.
  Keep `focusX` and `focusY` for grouped cross-section tooltips, and omit the
  strategy for ordinary two-dimensional nearest-point focus.
- Verification: focused strategy tests cover singleton X/Y selection,
  secondary-axis tie-breaking, keyboard navigation, and grouped-mode
  preservation. Stats uses the singleton modes for stacked and bar charts.

### F-021 — Native tooltips only accept plain text

- Status: monitoring
- Severity: medium
- Owner: API
- Observed in: TanStack Stats tooltip parity
- Friction: the host assigns formatter output with `textContent`. Selection
  and values can match Plot, but an application cannot render structured rows,
  colored series swatches, or interactive content through the native tooltip
  option.
- Current decision: keep `onFocusChange` as the rich-tooltip inversion point
  while the built-in tooltip remains small and accessible. Add a structured
  renderer only after another product needs it or Stats requires exact visual
  tooltip parity.
- Verification: the snapped-axis-pointer case builds a grouped tooltip with
  color swatches and a crosshair from typed `onFocusGroupChange` and
  `onRender` state. Its semantic pointer/leave scenarios pass across both
  revisions and responsive widths without changing the locked DOM host. The
  pinned nested-tooltip case keeps hover separate from activation, mounts a
  real second chart host after click, and destroys it on Escape or a second
  click; all three semantic scenarios pass.
- Follow-up: evaluate whether a framework-neutral render callback can support
  cleanup, SSR, keyboard focus, and adapters without burdening charts that use
  plain text.

### F-022 — Native tooltips could not be pinned

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: TanStack Stats tooltip parity
- Friction: Observable Plot lets a pointer click freeze the current tip while
  the pointer leaves or moves elsewhere. The TanStack host always cleared focus
  on mouse leave, so inspecting a dense value required holding the pointer
  still.
- Decision: add opt-in `tooltip.sticky`. A click pins the focused point;
  another click or Escape releases it. Pointer selection and `onSelect` remain
  available, and the option adds no separate interaction dependency.
- Verification: the DOM-host regression covers pinning, ignored pointer
  movement while pinned, mouse leave, Escape, repinning, and click release.
  Stats enables the option.

### F-023 — Fixed margins clip or waste guide space

- Status: resolved
- Severity: high
- Owner: API
- Observed in: TanStack Stats renderer parity
- Friction: core previously resolved fixed margin heuristics before scales,
  formatted ticks, titles, and rotations existed. Stats compensated with
  duplicated character-width estimates and large manual margins, yet labels
  could still escape a clipped SVG.
- Decision: make omitted margin sides automatic. Solve the minimum guide bounds
  from formatted text, anchors, and rotations; treat numeric sides as hard
  overrides; expose resolved bounds for aligned application UI. Keep label
  containment separate from tick collision and tiny-container degradation.
- Verification: six guide-bound tests cover deterministic measurement, anchors,
  baselines, rotation, translated groups, and all four sides. Five scene-layout
  tests cover long labels and titles, rotated endpoints, narrow-to-wide
  reclamation, side locks, and single mark rendering. DOM tests cover inherited
  family, style, stretch, weight, direction, letter spacing, exact painted
  bounds, measurer replacement, coalesced font completion, and cleanup. Stats
  supplies neither Charts margins nor title offsets; its timeline consumes the
  resolved scene margin. TypeScript, focused lint, browser containment across
  every Stats shape, and bundle ceilings pass.

### F-024 — Co-located benchmark cases defeated tree shaking

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: cross-library bundle and browser comparison matrix; executable
  catalog production loading
- Friction: re-exporting one benchmark mount from a module containing four
  top-level chart definitions retained every TanStack mark. Line, bar, area,
  and scatter therefore produced the same 52.48 kB minified artifact even
  though the public mark modules are tree-shakeable. The same failure recurred
  when a shared conformance mount module imported `react-dom` for Recharts:
  TanStack's isolated case grew from 22.40 to 80.90 kB gzip despite never
  calling the Recharts helper. It recurred a second time when cross-library
  adapters read exported stress-mode aliases: normal bundles retained 194
  bytes of probe scheduling in Chart.js, Recharts, and Plot, and 509 bytes in
  ECharts. The production catalog later repeated the boundary failure through
  two broad `import.meta.glob('./cases/*/*.ts')` registries. Its default entry
  registered 584 implementation and raw-source imports, including every
  comparison renderer, data/helper modules, and a `tanstack.test.ts` file.
- Decision: give each chart type an isolated entry module and share only the
  renderer-free host setup. Renderer-specific helpers with runtime imports
  live in separate modules. Tier variants also use direct build-time globals;
  exported or locally aliased tier constants are not assumed to propagate
  across modules. The catalog keeps metadata, exact TanStack loaders, and exact
  comparison loaders in separate registries; only `?compare=1` dynamically
  imports the comparison registry. Production publication goes further: it
  copies only the recursive ESM closure rooted at each exact implementation
  entry. Raw-source wrappers, the standalone application, and the comparison
  registry are not part of the artifact. Do not rely on purity annotations,
  minifier-specific interprocedural analysis, or a render-time branch to
  establish a bundle boundary.
- Verification: emitted TanStack artifacts contain only the selected mark
  class, and the four minified and compressed measurements are distinct. The
  tiered line bundles also separate as expected: TanStack gzip is 18.12 kB
  basic, 18.42 kB interactive, and 20.65 kB advanced; Chart.js interactive
  similarly adds its legend and tooltip plugins. After moving `rechartsMount`
  to its own module, the composed Recharts comparison restored TanStack to
  22.40 kB gzip versus Recharts at 168.56 kB and passed the quick visual gate.
  The comparison builder now rejects any normal artifact with nonzero bytes
  from `comparison/stress`; direct build-time globals reduce that contribution
  to zero for all five libraries, and `pnpm benchmark:check` passes. The
  catalog graph gate now proves exactly 100 TanStack, 68 Plot, 21 Recharts, and
  11 ECharts implementations plus their isolated raw-source entries, with no
  test/data/helper dynamic entries. Every published TanStack root now receives
  the same static-closure comparison-package check. The schema-v2 artifact
  validator rejects unreferenced files, unsafe paths, missing imports, invalid
  preloads, and a comparison module not marked debug-only.

### F-025 — Bundle maintenance clobbered the full comparison report

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: tiered cross-library benchmark validation
- Friction: `benchmark:check` and `benchmark:update-baseline` wrote their
  size-only result to the canonical comparison paths. Running normal
  verification after a full browser matrix silently discarded the mount,
  update, and output-complexity measurements.
- Decision: baseline maintenance commands report their own result without
  writing the canonical comparison files. Explicit size and browser benchmark
  commands still write the selected facets. Baseline checks write a separate
  complete candidate file; pinned CI uploads it on failure or explicit manual
  request so an intentional change can use the canonical runner measurements.
- Verification: the bundle baseline passes without changing the restored
  standard comparison report, and its candidate artifact includes passing
  references as well as failures that appear in the concise console output.
  Linux x64/Node 24.18.0 measurements confirmed that the renderer-neutral SVG
  host added 2,811–2,849 minified bytes across the 12 TanStack fixtures while
  polar, geo, and canvas modules retained zero bytes. The reviewed values now
  form the canonical baseline without widening its 3%/512-byte tolerance.

### F-026 — Facet rollup tables did not explain the overall result

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: review of the tiered cross-library benchmark report
- Friction: each measurement facet had a normalized summary table, but the
  report still required a reader to interpret several hundred values and
  combine capability, bundle, timing, and renderer caveats themselves.
- Decision: derive a short narrative from the same JSON summaries and place it
  at the top of every Markdown report. Store the paragraphs in
  `narrativeSummary` so downstream reports can reuse them without scraping
  Markdown.
- Verification: the standard report summarizes all 60 library/chart/tier cases
  and 120 browser scenarios before the detailed facet tables.

### F-027 — Pnpm validation attempted an interactive purge

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: Octane showcase demo validation
- Friction: `pnpm exec prettier` attempted to remove and reinstall the existing
  workspace modules, then aborted because validation ran without a TTY. The
  already-installed Prettier, TypeScript, Vite, and Vitest binaries worked
  directly without changing dependencies.
- Expected: repository formatting, build, typecheck, and test commands run
  non-interactively against the existing install.
- Decision: pin the repository package manager and lockfile, then use the
  documented pnpm scripts against that install rather than bypassing package
  management with ad hoc binary paths. Keep CI mode consistent between install
  and validation: pnpm 11 changes `enableGlobalVirtualStore` under CI, so
  mixing a CI install with a non-CI `pnpm exec` correctly reports the install
  as incompatible.
- Verification: repeated `pnpm exec prettier`, TypeScript, Vitest, Vite,
  benchmark, bundle, catalog, and conformance commands now run
  non-interactively without requesting a module purge. The polar/geo task
  reproduced the warning after a CI install followed by a non-CI exec;
  `pnpm_config_verify_deps_before_run=warn` identified the changed global
  virtual-store setting, and consistently using `CI=true` restored all
  documented commands without another purge.

### F-028 — Field channels accepted incompatible value types

- Status: resolved
- Severity: high
- Owner: API
- Observed in: public type-safety audit
- Friction: a numeric channel accepted any existing datum key, including a
  boolean field, and failed only by filtering every value at runtime.
- Decision: field-name channels now include only keys whose values satisfy the
  channel contract. Accessors remain the explicit derivation path.
- Verification: compile-time contracts accept numeric, categorical, and date
  fields while rejecting boolean and missing fields without assertions.

### F-029 — Dynamic hosts allowed omitted input

- Status: resolved
- Severity: high
- Owner: API
- Observed in: core, React, and Octane adapter type audit
- Friction: `input` was optional even when the definition was dynamic, so a
  chart could compile and then receive `undefined`.
- Decision: host and adapter options are correlated static/dynamic unions.
  Dynamic definitions require their inferred input; static definitions reject
  it. The DOM boundary also guards untyped JavaScript callers.
- Verification: core, React JSX, and Octane TSRX contracts reject missing,
  extra, and incorrectly shaped input, including dynamic definitions whose
  input type is `undefined` or `void`. `ChartHost.update` retains the same
  correlation, callback datum inference remains exact, and a widened
  static-or-dynamic definition must be narrowed before use. Runtime tests cover
  mount and update. Without `exactOptionalPropertyTypes`, TypeScript still
  permits explicit `input: undefined` on a static definition; non-undefined
  static input is rejected.

### F-030 — Heterogeneous dynamic marks erased datum types

- Status: resolved
- Severity: high
- Owner: API
- Observed in: the Stats history/latest definition migration
- Friction: conditional chart branches with different datum types widened
  callbacks to `unknown`, forcing explicit mark generics or datum guards.
- Decision: `defineChart` infers the complete returned specification and
  derives the callback datum union from its marks. Positionless rules contribute
  `never` because they emit no interaction points.
- Verification: Stats uses no definition annotation or consumer assertion, and
  a compile-time contract preserves an exact heterogeneous datum union.

### F-031 — Positional scales were disconnected from channels

- Status: resolved
- Severity: high
- Owner: API
- Observed in: D3-native authoring type audit
- Friction: a string channel could be paired with a linear scale and a date
  channel with a band scale despite both sides being statically known.
- Decision: built-in marks with provable positional semantics carry phantom
  x/y output types. Point-coordinate and scale-domain phantoms are independent:
  they default to the same values for ordinary marks, while rectangles and
  cells infer every materialized endpoint for scale compatibility without
  misrepresenting their runtime focus-point value. `ChartSpec` links the scale
  phantoms to configured D3 scales and axis formatters, widening literals to
  their normal string, number, or Date type. Bare `ChartSpec`, custom marks,
  facets, and explicitly widened mark options remain intentionally broad.
  `ChartScale` remains the explicit advanced unchecked scale escape hatch.
- Verification: compile-time contracts infer band/string, linear, UTC,
  implicit-index, static, dynamic, and heterogeneous definitions and reject
  swapped configured scales without consumer casts. Separate positive
  contracts prove that specialized specs pass through facets, optional
  rectangle endpoints remain inferred, widened rectangle options remain
  compatible, and custom marks and `ChartScale` retain the unchecked path.
  Public `ChartMarkPointX`/`ChartMarkPointY` helpers expose interaction values
  separately from `ChartMarkScaleX`/`ChartMarkScaleY`. The pre-existing
  `ChartMarkX`/`ChartMarkY` names remain point aliases rather than silently
  changing meaning. The explicit helpers ship from the advanced
  `mark/scale-values` subpath: exporting them from the ergonomic root changed
  esbuild symbol ordering by 1–5 gzip bytes despite erasing at runtime, so the
  exact ordinary-bundle gate rejected that shape.
  Negative contracts reject incompatible rectangle and cell scales. The
  catalog's size-only strict audit rejects all eight known-invalid TanStack
  programs without suppressions, including categorical rectangle endpoints on
  a linear scale. The separation is declaration-only and adds no runtime
  statements.
- Remaining edge: the parallel-coordinates case showed that a categorical
  literal union is widened to `string` before axis compatibility is checked.
  This keeps `scaleBand<string>` ergonomic but rejects the equally valid
  `scaleBand<ParallelMetric>`. The AI guide and compact documentation map now
  state the required `scaleBand<string>()` boundary so agents do not cast or
  repeatedly debug it. This documented boundary is accepted for the current
  grammar; reopen the finding if authoring evidence justifies accepting both
  narrow and widened domains without weakening incompatible-scale rejection.

### F-032 — Memoized adapter internals erase generic types

- Status: resolved
- Severity: low
- Owner: API
- Observed in: React and Octane adapter type audit
- Friction: the memoized rendering surface stores definitions and runtimes in
  a non-generic component boundary, requiring two contained internal
  assertions per adapter. Public definitions, props, callbacks, and input
  remain inferred.
- Decision: move generic runtime ownership into the shared
  `@tanstack/charts/adapter` controller. The memoized framework surfaces now
  receive only prerendered markup and retain no definitions or runtimes.
- Verification: React and Octane compile without the private definition or
  runtime assertions, preserve public inference, and pass their adapter tests.

### F-033 — Point coordinate values remain broad

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: callback type audit
- Friction: `point.datum` is exact, but `point.xValue` and `point.yValue` remain
  `ChartValue`, so direct coordinate use may require normal TypeScript
  narrowing.
- Decision: derive point-coordinate types from the x/y phantom types already
  carried by marks and propagate them through inferred definitions, scenes,
  runtimes, focus and spatial protocols, DOM hosts, React, and Octane.
  Positionless marks contribute no point-coordinate type. Public generics keep
  broad defaults for explicitly erased or custom boundaries, while ordinary
  consumers specify no new generics and use no assertions.
- Verification: strict compile contracts cover string, number, and Date
  coordinates; heterogeneous x/y unions; grouped focus; tooltip, focus,
  selection, render, and spatial callbacks; static and dynamic host updates;
  and React and Octane adapter inference. Core and React pass 90 focused tests,
  both Octane matrices pass four tests, and the AI guide now teaches inferred
  coordinates and normal union narrowing. The emitted change is
  declaration-only with no runtime statements added.

### F-034 — Text color and offset required mark duplication

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: Plot catalog multi-line end labels and labeled heatmap
- Friction: `text.fill` accepted only one constant color, text had no
  categorical color channel, and labels could not apply a pixel offset. The
  multi-line case needed one filtered text mark per series to retain its color;
  the heatmap needed two filtered marks solely for contrast; direct end labels
  could not move clear of their final point.
- Expected: one text mark maps datum-driven literal color or a supplied color
  scale, and can apply constant `dx`/`dy` without changing data-space values.
- Decision: text accepts a literal-color accessor or `z` backed by the chart
  color scale, and constant `dx`/`dy` offsets are applied after positional
  scales. Group identity and resolved color survive in interaction points.
- Verification: the multi-line case now uses one colored endpoint text mark;
  the heatmap uses one contrast-color accessor instead of two filtered marks.
  Focused mark tests cover resolved categorical colors and pixel offsets, and
  strict TypeScript passes without assertions.

### F-035 — Plot legends confused the primary SVG measurement

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: Observable Plot catalog conformance runner and gallery
- Friction: Plot can emit a small legend or swatch SVG before the chart SVG.
  Selecting the first `svg` therefore measured the swatch as the primary
  visualization, undercounted total SVG output, and compared chart labels
  against the wrong bounds.
- Expected: geometry, accessibility, output size, and guide containment reflect
  the complete renderer output without assuming either library emits one SVG.
- Decision: choose the largest rendered SVG as the primary chart, sum the
  serialized bytes of every SVG, and test every SVG text element against the
  chart container. Exclude labels whose computed display, visibility, or
  opacity makes them non-rendered; a hidden SVG text node has no containment
  contract. Plot legends intentionally allow endpoint labels to overflow their
  small owner SVG while remaining visible inside the container.
- Verification: the runner and gallery now aggregate every emitted SVG, while
  primary geometry uses the chart-sized SVG and multi-SVG legend labels are
  checked against the same container-level visibility contract as chart
  labels. The label-free Recharts sunburst can now use `display: none`
  directly instead of zero-size transparent text.

### F-036 — Presence-only visual checks overstated parity

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: first review of the Observable Plot catalog screenshots
- Friction: the gate treated one primitive as sufficient regardless of the
  expected count, normalized geometry against each mark's own bounds, and did
  not associate categorical labels with positions. A five-bin Plot histogram
  therefore passed a seven-bin expectation, reordered bars looked equivalent,
  and repeated facet axes were invisible to the report.
- Decision: enforce expected primitive counts as minima, normalize diagnostic
  geometry against the chart SVG, and allow cases to assert categorical guide
  sequences, maximum label repetition, and corresponding computed data-mark
  paints. Paint comparison canonicalizes computed `rgb()`/`rgba()` and
  driver-reported three-, four-, six-, or eight-digit hex colors. Equivalent
  interpolation output may differ by one channel unit because Plot and direct
  D3 scale paths round colors differently.
- Verification: the corrected histogram boundary contract renders all seven
  bins, explicit bar domains preserve category order, paired paints pass for
  all implemented cases, and the Anscombe case now fails specifically because
  Charts repeats its shared y-axis four times. The ECharts polar line and
  scatter drivers report hex colors while TanStack inspection reads computed
  RGB; both now pass the six-variant standard paint gate without case-specific
  color rewriting.

### F-037 — Facets repeat shared axes in every panel

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: Anscombe quartet catalog comparison
- Friction: `facet` compiles every panel as a complete nested chart. With shared
  domains, Charts emits the same y-axis in all four panels while Plot emits one
  shared outer y-axis. The repeated labels consume space and weaken the default
  small-multiple layout.
- Decision: facets with compatible resolved scales now own guides at their
  outer edges by default. The facet reserves one measured outer guide band,
  gives every cell the same inner plot width and height, retains each cell's
  grid, draws y axes only on the left edge and x axes only on the bottom edge,
  and emits each shared axis title once. `axes: "cell"` explicitly restores
  complete per-panel guides for independent scales. Outer mode rejects
  differing domains, tick labels, directions, guide options, guide themes,
  manual cell margins, and per-cell legends instead of displaying a
  misleading shared axis. Its guide prepass preserves initialized channels but
  suppresses mark rendering, so data marks render only once.
- Verification: focused facet tests cover one shared y guide, bottom x guides,
  single shared titles, equal inner plot spans, explicit independent cell
  axes, a render-free guide prepass, and an actionable incompatible-scale
  error. All 73 core tests pass.
  The standard Anscombe matrix passes its count, paint, containment,
  accessibility, and maximum-label-repetition gates at 320, 640, and 960
  pixels in light and dark mode, with 99.0% diagnostic geometry similarity,
  clean strict types, and a 20.11 kB versus 83.54 kB gzip pair.

### F-038 — Plot and D3 threshold arrays mean different things

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: paired histogram catalog case
- Friction: Plot treated an explicit threshold array as the complete bin
  boundary sequence, while `d3.bin().thresholds(array)` treated the same values
  as interior cuts inside its configured domain. Passing `[30, …, 80]` to both
  produced five Plot bins and seven D3 bins over `[20, 90]`.
- Density evidence: Plot exposes density thresholds in readability units that
  are 100 times the underlying `d3-contour` density. Passing the same explicit
  values to `Plot.density` and `contourDensity().thresholds(...)` therefore
  produced different level sets.
- Decision: describe bins in terms of a complete boundary sequence. Plot
  receives the sequence directly; D3 receives the first and last values as its
  domain and the interior values through `thresholds`. Density recipes keep
  thresholds in Plot's documented units and divide by 100 only at the direct
  `d3-contour` boundary.
- Verification: the paired case now renders seven bins on both sides, and the
  migration recipe records the conversion without assertions or custom bin
  math. The paired density case renders six matching responsive contours with
  no unsafe type escape.

### F-039 — Dots could not express stroke opacity

- Status: resolved
- Severity: low
- Owner: API
- Observed in: bubble scatter catalog comparison
- Friction: the Plot reference used a subtle outline, but `dot` exposed
  `stroke` and `strokeWidth` without `strokeOpacity`, making every TanStack
  outline visibly darker.
- Decision: add `strokeOpacity` to `DotOptions` and pass it through the existing
  scene style and SVG renderer.
- Verification: the scatter case now uses the same `0.28` opacity, and the
  composite mark test verifies both scene dots retain the option.

### F-040 — Bundle ceilings allowed silent universal growth

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding the Plot conformance catalog with optional marks
- Friction: the package bundle check used gzip ceilings with enough unused
  headroom for optional feature work to add code to every ordinary chart
  without failing. Several direct D3 composition entries were measured but
  had no product budget.
- Decision: every package measurement now declares one of three policies.
  Ordinary scene, SVG, DOM, React, custom-scale, and representative-mark
  consumers are byte-locked. Optional features have isolated gzip budgets;
  comparison and exploratory kernels remain measurement-only. Baseline
  changes require an explicit reviewed command, including decreases, so saved
  bytes cannot become silent future headroom.
- Verification: repeated builds match the exact minified and gzip baseline.
  `pnpm bundle:check` passes the locked consumers and the tightened histogram,
  facet, curve, time, transform, spatial, arrow, frame, link, and tick feature
  budgets. The reviewed focus-cleanup and per-axis-guide change reduced every
  locked minified entry by 133–250 bytes; gzip fell by 14–29 bytes for static
  scenes and rose by 43 bytes for the DOM host, 35 bytes for the React
  adapter, and 21 bytes for the React line consumer. Those exact results are
  now locked rather than hidden inside unused ceiling headroom. The canonical
  byte lock runs on pinned Ubuntu 24.04 and Node 24.18.0; this prevents runner
  and compressor upgrades from masquerading as library-size changes. The
  current canonical baseline records the unchanged source tree under that
  environment.

### F-041 — Bounded segments and caps required custom marks

- Status: resolved
- Severity: high
- Owner: API
- Observed in: error-bar, boxplot, lollipop, dumbbell, and candlestick catalog
  cases
- Friction: `ruleX` and `ruleY` intentionally span the complete chart, while
  rects cannot represent a zero-width segment. These common recipes otherwise
  required case-local `createMark` implementations and repeated bandwidth
  math for caps.
- Decision: add tree-shakeable `link` and `tickX`/`tickY` marks over the
  existing rule scene node. Link owns typed endpoint channels and interaction
  identity; ticks derive their default length from the perpendicular band
  scale and accept an explicit pixel length.
- Verification: the five catalog families pass initial and updated responsive
  geometry, paint, containment, accessibility, and strict-type checks.
  Isolated link and tick consumers are 13.25 and 13.64 kB gzip, while the
  byte-locked universal consumers remain unchanged.

### F-042 — Hoisted host tooltip options lose callback context

- Status: monitoring
- Severity: low
- Owner: Documentation/API
- Observed in: pointer and grouped-tooltip catalog cases
- Friction: an inline `mountChart` options literal infers the tooltip datum,
  but assigning the literal to a local variable before the call removes
  contextual typing from `tooltip.format` and `formatGroup`. Strict TypeScript
  then requires a `ChartPoint<Row>` parameter annotation.
- Current decision: document the annotation or a typed `ChartTooltipOptions`
  variable as a normal type-introduction boundary; never recommend a cast.
- Follow-up: if raw-host examples repeat this pattern, add a small
  definition-correlated options helper rather than weakening callback types.

### F-043 — Plot and D3 wiggle stacks have different vertical origins

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: streamgraph catalog case
- Friction: Plot's wiggle stack zero-shifts the completed stream, while
  `d3-shape`'s `stackOffsetWiggle` can leave a negative minimum baseline.
  Passing D3 intervals through unchanged produced equivalent layers at a
  different vertical origin.
- Decision: the D3 recipe computes the minimum generated baseline and shifts
  every lower and upper endpoint by its negation. Keep this explicit in the
  streamgraph recipe rather than hiding it in the renderer.
- Verification: the paired streamgraph passes the responsive initial and
  updated visual matrix with cast-free prepared intervals and granular
  `d3-shape` imports.

### F-044 — Difference fills require explicit crossing interpolation

- Status: resolved
- Severity: medium
- Owner: Documentation/Skills
- Observed in: actual-versus-forecast difference catalog case
- Friction: mapping two series directly to `areaY` produces an overlapping
  ribbon, not semantic positive and negative lobes. Correct output requires
  finding every sign change, linearly interpolating its exact crossing, and
  duplicating that boundary into the adjacent positive and negative segments.
  The first recipe assigned a segment to every sample; consecutive samples
  with the same sign therefore produced degenerate one-point paths instead of
  one contiguous lobe.
- Current decision: keep this preparation outside the renderer and publish it
  as a typed difference-chart recipe. Build maximal same-sign runs, duplicate
  each interpolated or exact-zero boundary into its two adjacent runs, and
  keep plot bounds and guide formats explicit in comparisons. A native
  transform is not justified until repeated use shows that the authoring cost
  outweighs its optional bundle cost.
- Verification: the composed case passes responsive initial and updated
  geometry, paint, containment, accessibility, guide-sequence, and strict-type
  checks at 0.26× Plot gzip with no assertions or suppressions. Its four
  expected sign runs are bounded by `maxCount: 4`, preventing the original
  nine per-sample paths from passing again.

### F-045 — Arrow endpoints could not express pixel-space vector fields

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: vector-field catalog case
- Friction: `arrow` correctly maps both endpoints through chart scales, but
  direction fields need a scaled anchor plus per-datum pixel length and
  rotation. Converting pixel lengths into data units would vary with viewport,
  domain, and measured plot bounds.
- Decision: add an optional `vector` mark with typed anchor, length, rotation,
  grouping, and identity channels. It shares the arrowhead geometry helper but
  remains a separate tree-shakeable entry point. Zero degrees points up,
  rotation is clockwise, and start, middle, and end anchors are explicit.
- Verification: the native vector-field pair passes at 320 and 640 pixels with
  96.4% diagnostic geometry similarity, clean strict types, and 0.22× Plot
  gzip. Its isolated static-SVG consumer is 13.49 kB gzip; byte-locked ordinary
  consumers remain unchanged.

### F-046 — Mirrored labels required duplicate text marks

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: tidy hierarchy tree catalog case
- Friction: tree branches and leaves need opposite anchors and pixel offsets,
  but `text.anchor`, `dx`, `dy`, and `rotate` accepted constants only. The same
  node rows had to be filtered into two otherwise identical text marks.
- Decision: allow typed accessors for these presentation channels while
  retaining their constant shorthand. The change remains isolated to consumers
  that import the text mark.
- Verification: the hierarchy case now maps all ten labels through one text
  mark with inferred node types. Focused tests verify per-row anchor, rotation,
  and offset output.

### F-047 — Unique Delaunay edges are not obvious from halfedges

- Status: monitoring
- Severity: medium
- Owner: Documentation/Skills
- Observed in: Delaunay spatial-network catalog case
- Friction: `d3-delaunay` exposes triangles, halfedges, and hull indexes rather
  than a ready-made unique edge list. A correct link recipe must take one side
  of each paired halfedge and separately close the convex hull.
- Current decision: keep topology preparation in granular D3 and package the
  tested extraction as a typed recipe. It does not belong in rendering core.
- Verification: the recipe produces 26 unique links for 12 points before and
  after update; the paired case passes with 97.5% diagnostic geometry
  similarity and no assertions or suppressions.

### F-048 — Responsive waffle packing cannot see final inner bounds

- Status: monitoring
- Severity: low
- Owner: API/Documentation
- Observed in: responsive waffle unit-chart catalog case
- Friction: data preparation receives requested outer width and height, while
  the mark's final inner bounds are known only after guide and legend layout.
  The recipe can choose a near-square grid but cannot guarantee the same cell
  aspect ratio after a top legend consumes space.
- Current decision: use outer dimensions for the lightweight recipe and
  disable Cartesian guides through the existing `guides: false` option. Do not
  expose layout internals until another use case needs a true bounds-aware
  preparation hook.
- Follow-up: evaluate a post-layout transform or layout-aware custom-mark
  context if this repeats. The current 100-unit case passes responsive visual,
  color, containment, accessibility, and strict-type gates at 0.13× Plot gzip.

### F-049 — Plot hexbin width and d3-hexbin radius use different units

- Status: resolved
- Severity: medium
- Owner: Documentation/Skills
- Observed in: hexagonally binned density catalog case
- Friction: Plot's `binWidth` is the horizontal distance between neighboring
  centers, while `d3-hexbin.radius` is the center-to-vertex radius. Passing half
  the Plot width to D3 changed bin membership and the resulting color
  thresholds even though the rendered hexagon radius matched.
- Decision: convert with `radius = binWidth / sqrt(3)`. Keep the rendered symbol
  radius separate because it controls the visible gap rather than bin
  membership. For responsive parity, run D3 over the chart's explicit pixel
  range and invert bin centers back through the positional scales.
- Verification: after the unit conversion, the paired case passes at 99.5%
  diagnostic geometry similarity with matching threshold paints, clean strict
  types, and 0.22× Plot gzip. The optional hexagon renderer is 13.26 kB gzip and
  byte-locked ordinary chart bundles are unchanged.

### F-050 — Plot proportion units depend on transform scope

- Status: monitoring
- Severity: medium
- Owner: Documentation/Skills
- Observed in: faceted distribution catalog case
- Friction: Plot's percentage display uses transformed values in `[0, 100]`,
  and `proportion` normalizes globally while faceted histograms generally need
  `proportion-facet`. Treating either output as a fraction produces incorrect
  domains or comparisons between panels.
- Current decision: recipes must name the normalization scope and express
  domains in their own post-transform units. Plot's percentage axis consumes
  values in `[0, 100]`; the direct D3 preparation keeps fractions in `[0, 1]`
  and formats them with `Intl.NumberFormat`. In both cases, divide each facet
  bin by that facet's own observation count.
- Verification: focused preparation tests prove that every in-domain row is
  counted once, each populated facet sums to one, the domain maximum remains
  in the final bin, and absent groups produce no `NaN` values. The paired
  faceted distributions pass responsive shared-guide, geometry, paint, and
  strict-type checks with each panel independently normalized.

### F-051 — Beeswarm layout is responsive pixel-space preparation

- Status: monitoring
- Severity: medium
- Owner: Documentation/Skills
- Observed in: beeswarm distribution catalog case
- Friction: collision radii are pixels, while the input measure and rendered
  coordinates are data-space values. A direct D3-force composition must map
  through explicit responsive scales, settle the simulation synchronously, and
  invert displaced positions back into chart values.
- Current decision: keep this as an optional granular `d3-force` recipe. It is
  substantially more code and slower than Plot's built-in dodge, but does not
  justify weight in every chart. Pin the quantitative coordinate with the
  simulation node's `fx`; a strong `forceX` still permits visible measure-axis
  drift. For a mark radius `r` and Plot dodge padding `p`, use a collision
  radius of `r + p / 2`. Revisit a tree-shakeable dodge helper only if agent
  evaluations repeatedly fail the recipe.
- Verification: the corrected cast-free case preserves all 25 quantitative x
  positions exactly and passes at 99.8% diagnostic geometry similarity and
  22.58 kB gzip. The prior force-X recipe created 69 distinct rendered x
  positions from those same 25 values and reached only 99.0% similarity.

### F-052 — Some d3-array overloads lose callback context

- Status: monitoring
- Severity: low
- Owner: Documentation/Skills
- Observed in: empirical CDF and bump-ranking catalog cases
- Friction: the installed `d3-array` `rank` overloads do not always
  contextually type an inline accessor over generic or readonly rows.
- Current decision: project typed rows to a numeric array before ranking, or
  annotate the accessor parameter. This is an explicit third-party function
  boundary, not a consumer cast and not a Charts API problem.
- Verification: both ranking cases compile strictly without assertions,
  suppressions, umbrella D3 imports, or lost datum types in chart marks.

### F-053 — Data-bound annotations can escape automatic guide margins

- Status: monitoring
- Severity: low
- Owner: Documentation/Skills
- Observed in: annotated minimum/maximum time-series catalog case
- Friction: automatic layout measures axes and guide labels, but it cannot
  reserve space for arbitrary data-bound text near a domain edge. The maximum
  label overflowed the 320 px container when centered over its point.
- Current decision: keep data annotation placement explicit. Use an edge-aware
  anchor and pixel offset for extrema or other labels that may land on a chart
  boundary; do not increase every chart's margins for optional marks.
- Verification: `anchor: "end"` with a negative `dx` keeps both extrema labels
  contained across the responsive initial/update matrix. The paired case passes
  with 98.3% diagnostic geometry similarity and no core bundle change.

### F-054 — D3 reducer output needs empty-safe narrowing

- Status: monitoring
- Severity: low
- Owner: Documentation/Skills
- Observed in: percentile-ribbon and lag-autocorrelation catalog cases
- Friction: `d3-array` quantiles correctly return `undefined` for empty groups,
  while chart channels require definite numeric summaries. Lag preparation is
  also clearer and less error-prone with `pairs` than with manual indexing.
- Current decision: recipes must preserve D3's result types, drop incomplete
  summaries with an explicit guard, and use the narrowest D3 iterator for
  adjacency transforms. Do not cast reducer output or add transform semantics
  to Charts core.
- Verification: both cases compile strictly from raw typed rows with granular
  `d3-array` imports, no assertions or suppressions, and pass responsive
  initial/update visual checks.

### F-055 — Horizontal areas required renderer internals

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: violin-distribution catalog case
- Friction: `areaY` could express vertical envelopes, but its horizontal
  counterpart required a case-local `createMark`, manual channels, scene
  nodes, grouping, and a direct D3 area generator. The result had no standard
  interaction points and duplicated renderer ownership in application code.
- Decision: add a tree-shakeable `areaX` mark with typed `x1`, `x2`, `y`, `z`,
  key, and visual channels. Keep its implementation and `d3AreaXCurve` bridge
  in separate subpaths so straight areas and all existing `areaY`/`d3Curve`
  consumers retain their dependency boundaries.
- Verification: the violin case now uses the inferred public mark without
  casts or suppressions. Focused tests cover exact D3 horizontal area topology,
  interaction values, invalid-row segmentation, channel rejection, and package
  exports. The smooth static-SVG consumer is 15.31 kB gzip. Every locked
  minified bundle and all existing Stats/curve bundles are byte-identical. The
  root exports change only unrelated gzip compression: the line scene is one
  byte smaller, line plus SVG is one byte larger, and the direct D3 linear
  scene is three bytes smaller.

### F-056 — Conformance tooling assumed Plot was the reference

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding the paired corpus from Observable Plot to Recharts
  and Apache ECharts
- Friction: reference filenames, gallery panels, source audits, bundle loops,
  visual result keys, selectors, summaries, and failure messages each encoded
  a Plot-versus-TanStack branch. Adding Recharts through a second runner would
  have duplicated the protocol and allowed the suites to drift. The catalog
  parser also silently discarded newer geometry roles, guide assertions, and
  interaction assertions.
- Decision: each case may select `referenceRenderer: "recharts"` or
  `"echarts"` while omitted metadata defaults to Observable Plot. One renderer
  mapping now drives the existing runner and gallery, and the catalog strictly
  validates and preserves all assertion metadata. ECharts guide checks classify
  actual rendered SVG path/line bounds and text transforms in benchmark code;
  they do not inspect renderer models or private APIs. Existing Plot result
  keys and Plot-only summary fields remain compatible.
- Verification: strict typecheck passes; the unchanged Plot line case passes
  its isolated bundle/type audit; Recharts and ECharts cases pass quick
  responsive initial/update geometry, paint, guides, containment,
  accessibility, bundle, performance, interaction, and type checks through the
  same runner. Eight single-grid ECharts cases gate rendered y-axis sequences
  or multiplicity; the synchronized two-grid case deliberately omits a generic
  axis assertion because ownership is ambiguous.

### F-057 — D3 hierarchy coordinates use screen-space y

- Status: monitoring
- Severity: low
- Owner: Documentation/Skills
- Observed in: Recharts bundle-size treemap comparison
- Friction: `d3-hierarchy` treemap output uses screen coordinates where `y`
  increases downward. Feeding normalized `y0`/`y1` values into a normal
  Cartesian scale silently flips the layout vertically.
- Current decision: treemap recipes should use a descending y domain when
  routing normalized hierarchy coordinates through `rect` and `text` marks.
  Keep hierarchy layout in granular D3 preparation rather than teaching the
  renderer a second coordinate convention.
- Verification: the paired treemap uses `scaleLinear().domain([100, 0])`,
  keeps labels contained at 320 and 640 px, and passes initial/update geometry,
  paint, accessibility, strict-type, and isolated-bundle gates.

### F-058 — Radar checks ignored polar labels

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: Recharts simple-radar comparison
- Friction: the conformance case asserted only the filled radar polygon. It
  reported 100% geometry similarity while the TanStack composition omitted all
  five radial tick labels and placed the six angle labels at a different
  offset. The case also used a smaller radius and margin than the official
  reference.
- Decision: the reference uses its documented 80% radius and 20 px margin.
  The native polar composition uses `radialGrid`, `angleGrid`, and
  `radialArea`; guide label callbacks preserve Recharts' eight-pixel
  angle-label offset, rotated 30-degree radial axis, baselines, and distinct
  angle/radius label colors. All eleven labels remain data-bearing visual
  geometry so an omission cannot pass again.
- Verification: focused responsive initial/update conformance passes at 320
  and 640 px with all eleven labels present, matching paints, no overflow,
  100.0% diagnostic geometry similarity, clean strict types, and 0.16×
  Recharts gzip. The standard matrix also passes at 320, 640, and 960 px in
  light and dark themes without a case-local coordinate renderer.

### F-059 — Vite cached a newly added package subpath

- Status: resolved
- Severity: low
- Owner: Tooling/API
- Observed in: live conformance gallery after the `areaX` extraction
- Friction: the focused benchmark and fresh builds resolved
  `@tanstack/charts/d3/area-x`, but the already-running Vite gallery had cached
  the package export map before that subpath existed. Its dynamic TanStack
  module returned HTTP 500, leaving case 63 at `pending` while Plot rendered.
- Decision: retain the granular curve subpath, and also export
  `d3AreaXCurve` from the established package root beside `areaX`. The gallery
  example now uses the normal root import, so API work hot-reloads without a
  hidden source import or forced server restart. Renderer loading and mounting
  are isolated per panel; a future module error replaces `pending` with an
  explicit local error instead of leaving a blank chart.
- Verification: the unchanged live server now serves the case module with HTTP 200. After reload the gallery reports one SVG, three areas, three links, three
  dots, and populated timing/node/size metrics. Focused quick conformance passes
  responsive initial/update visual and strict-type gates at 98.4% diagnostic
  geometry similarity and 0.23× Plot gzip; the production gallery build passes
  with the per-panel error boundary.

### F-060 — Geometry similarity could not gate exact layouts

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: beeswarm horizontal-position correction
- Friction: normalized bounding-box similarity was reported only as a corpus
  diagnostic. A previous beeswarm layout with visible horizontal drift still
  passed every visual gate at about 99.0%, while a global threshold would be
  invalid for cases whose reference and target intentionally emit different
  primitive topology.
- Decision: allow deterministic cases to declare a validated
  `minimumGeometrySimilarity` from zero to one. The floor applies separately
  to every viewport, theme, initial render, and revised render; cases without a
  floor retain diagnostic-only behavior.
- Verification: the corrected beeswarm clears its 99.5% floor across the full
  standard matrix with a minimum score of 99.71%; its prior 99.0% result would
  fail. Radar clears a 99.99% floor with a minimum score above 99.999%. Both
  remain clean under strict type auditing, and the change is test tooling only.

### F-061 — Catalog metadata validation was browser-bound

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: publishing the conformance gallery as native case and embed
  routes
- Friction: the only strict case metadata parser lived beside
  `import.meta.glob`, so Node publication tooling either had to duplicate the
  schema or trust raw JSON. A duplicate validator would drift as interaction
  scenarios and additional reference renderers were added.
- Decision: move metadata parsing into an environment-neutral TypeScript
  module. The Vite catalog and Node artifact publisher consume the same parser;
  the publisher adds only publication invariants such as unique IDs/orders,
  directory-name agreement, safe routes, and a closed module allowlist.
- Verification: strict typecheck passes, `catalog:check` validates all current
  cases, and `catalog:build` generates schema-v2 `catalog.json` plus the exact
  implementation closure from the same parsed metadata. TanStack.com renders
  detail and embed routes from that structure rather than generated HTML.

### F-062 — Interaction checks were selector-bound

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: expanding tooltip checks into crosshairs, legends, linked
  selection, and ECharts references
- Friction: the prior visual inspector dispatched one synthetic
  `pointermove` at a renderer-specific SVG element and asserted a CSS selector.
  It could not express clicks, keyboard input, drag, wheel, multiple views, or
  semantic state, and assertions reused mutated mounts. ECharts' generated SVG
  paths also have no stable role classes suitable for this contract.
- Decision: interaction cases declare ordered semantic scenarios. Each
  implementation supplies a benchmark-only driver that resolves named anchors
  to viewport coordinates and reports serializable state. A separate behavior
  runner fresh-mounts each scenario and uses native Playwright mouse, keyboard,
  drag, and wheel input. Named views and optional driver geometry remove the
  single-largest-SVG assumption.
- Verification: 16 interaction cases pass native pointer, click, keyboard,
  drag, wheel, pointer-leave, and in-place revision-update scenarios for both
  renderers, starting revisions, and quick-profile widths with zero type
  diagnostics or unsafe assertions. Uncaught browser errors fail the active
  step. The legend, brush paint, and synchronized-crosshair checks read actual
  rendered SVG output rather than only case-owned state. The shared metadata
  parser and published `catalog.json` preserve the scenario schema.

### F-063 — Resolved scales cannot map pixels back to values

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: focus-plus-context, continuous brush, and wheel zoom/pan cases
- Friction: `ChartScene.scales.x` exposes semantic-to-pixel `map`, but not an
  inverse operation. A snapped overview click can scan known datum positions,
  but continuous brush, pan, zoom, and free data-space selection need a
  correct pixel-to-value mapping for the configured scale.
- Decision: inversion stays with the configured D3 scale that the application
  already supplies. Copy that scale, apply the resolved `scene.chart` pixel
  range, and call its native `invert`; reverse the range for y. Then apply an
  explicit semantic precision policy such as `utcDay.round`. Do not add a
  second scale algorithm or universal inversion surface.
- Verification: the focus-plus-context case remains snapped to known dates.
  The continuous brush passes forward and reverse real-pointer drags, and the
  wheel viewport passes pointer-anchored zoom, horizontal pan, clamping, and
  full-domain restoration. Both implementations are cast-free, use the same
  source D3 scale semantics, pass responsive behavior and visual checks, and
  leave every locked universal bundle unchanged.

### F-064 — Scroll-clipped labels failed containment

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: scrollable resource timeline
- Friction: the visual gate compared every SVG text box with the outer case
  container. A first correction intersected every label with its clipping
  ancestors, which made partially clipped labels pass and omitted fully
  clipped labels globally.
- Decision: containment tests each original label box and reports ancestor
  clipping separately. Only a case-owned
  `data-conformance-scroll-viewport` may omit a scrolling tick whose anchor is
  outside that viewport; a partially clipped label whose anchor remains inside
  still fails. The timeline uses an explicit three-tick UTC guide so its
  visible month labels do not straddle the viewport edge.
- Verification: the strict check first caught TanStack's partially clipped
  `Jan 19` tick at 320 px. After the explicit tick policy, both renderers pass
  initial and revised containment with zero overflow or clipping at 320 and
  640 px. Real wheel input reaches `scrollLeft = 260`, and in-place revision
  updates preserve that scroll position and the semantic domain in both
  renderers with no captured page errors.
- Interaction-audit evidence: passing containment did not preserve usable
  schedule context. At 320 px and `scrollLeft = 260`, all five lane labels
  were fully offscreen, and the three-tick policy left only “February”
  visible. The chart remained mathematically correct but no longer identified
  the visible resource lanes.
- Resolution: the case now keeps resource labels in a fixed rail while only
  the time surface scrolls. Responsive date ticks, a visible overflow cue,
  keyboard task focus, task details, and a complete semantic schedule preserve
  context without weakening the clipping rule.
- Verification: both renderers pass post-scroll lane visibility, focused
  offscreen-task auto-scroll, task-detail text, real wheel input, scrolled
  geometry, screenshots, and update-time scroll preservation at every standard
  width and theme.

### F-065 — Logical views required fake DOM roots

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: synchronized ECharts multi-grid cursors
- Friction: named-view geometry and pointer-leave validation required a DOM
  element for every logical view. ECharts owns two grids inside one SVG, so the
  first implementation added invisible case-local marker elements solely for
  the harness.
- Decision: a conformance driver may report viewport-relative logical
  `viewBounds`. Visual normalization and behavior validation use those bounds
  when no DOM root exists.
- Verification: the ECharts markers are removed. Both renderers normalize
  against their actual plot bounds, producing 100.0% diagnostic geometry
  similarity. Both synchronized crosshairs are asserted from rendered SVG
  lines before and after in-place data revisions rather than inferred from the
  shared semantic date.

### F-066 — Disabling native focus required a custom strategy

- Status: resolved
- Severity: low
- Owner: API
- Observed in: free cursor, continuous brush, and wheel zoom cases
- Friction: an application that owns all pointer semantics had to define three
  no-op `resolve`, `group`, and `navigation` methods merely to keep the DOM
  host from running native datum focus.
- Decision: export `focusDisabled` from the isolated
  `@tanstack/charts/focus/disabled` entry point. Do not add a branch or export
  to the universal host/root path.
- Verification: all three custom-gesture cases use the shared strategy and
  keep native focus out of their pointer path. The first root-export attempt
  changed an ordinary line bundle by one gzip byte and was rejected; the
  isolated subpath restores every exact universal bundle baseline.

### F-067 — Reference wrappers duplicated accessible roots

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: ECharts and Recharts conformance adapters
- Friction: both shared adapters named an outer wrapper while their renderer
  also emitted a nested named SVG. Presence-only accessibility checks passed
  the duplicate chart semantics.
- Decision: require a named chart root and reject nested roots with the same
  accessible name. ECharts keeps its focusable wrapper as the sole
  `role="application"` owner and hides its generated SVG from the accessibility
  tree. Recharts keeps its rendered SVG as the sole named `role="img"` owner.
- Verification: focused DOM tests enforce one named root for both adapters.
  The strict browser gate first failed the three affected legacy Recharts
  cases, then all three passed after the shared adapter correction.

### F-068 — Source audit omitted shared implementation files

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: ECharts comparison source-line ratios
- Friction: bundle bytes included the shared ECharts mount, but “authored
  implementation surface” counted only each renderer entry file. The report
  therefore favored any reference that moved setup into a local shared module.
- Decision: use the esbuild metafile to count every transitive authored source
  under `benchmarks/conformance` once per implementation. Keep dependency and
  TanStack package internals out of this case-authoring metric.
- Verification: focused audited cases report a 0.79× transitive authored-line
  ratio instead of the direct-entry-only value while bundle contents remain
  unchanged.

### F-069 — Strict containment exposed a clipped Plot guide

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: the interval-timeline reference implementation
- Friction: Observable Plot's default left margin clipped every long task
  label at the SVG boundary. The earlier containment check used clipped boxes,
  so the broken reference still passed.
- Decision: keep the strict original-box gate and configure the Plot reference
  with the margin its labels require. TanStack remains on automatic margins;
  this is reference-case setup, not a core API change.
- Verification: the interval timeline passes initial and revised containment
  at 320 and 640 px, with geometry similarity improving from 96.1% to 97.4%.

### F-070 — ECharts brush injected an undeclared toolbox

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: ECharts brush-range reference case
- Friction: registering `BrushComponent` caused its preprocessor to inject a
  toolbox option, but the modular reference had not registered
  `ToolboxComponent`. ECharts rendered the brush while logging a missing
  component error, so the catalog looked correct with an invalid modular
  dependency graph.
- Decision: explicitly register and type `ToolboxComponent` in the brush
  reference. Keep this reference-library dependency out of TanStack Charts.
- Verification: the brush reference mounts in the live catalog without the
  ECharts missing-toolbox error and retains its rendered brush interaction.

### F-071 — Formatter crossed into the Stats parity worktree

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: the repository-wide formatting gate
- Friction: the Stats parity checkout is a separate nested Git worktree, but
  the root Prettier command descended into it and reported 65 unrelated source
  and generated files as Charts formatting failures.
- Decision: exclude `tanstack.com-parity/` in the Charts `.prettierignore`.
  The parity worktree keeps its own formatting ownership and commands.
- Verification: the root formatting gate checks only TanStack Charts sources
  and no longer reports files from the nested worktree.

### F-072 — Wide brush ticks exceeded a locked right margin

- Status: resolved
- Severity: low
- Owner: Application
- Observed in: the 960px brush-range conformance variant
- Friction: the case locked all four margins to match the ECharts plot frame,
  then relied on TanStack's default responsive UTC formatter. At 960px the
  formatter expanded the final tick to “December,” which exceeded the locked
  24px right margin by three pixels. The quick 320/640 profile did not expose
  it.
- Decision: keep the intentional geometry lock and explicitly format month
  ticks with locale-stable abbreviated UTC names, matching the reference
  chart's presentation. Automatic margins remain the default when a side is
  not locked.
- Verification: the full 320/640/960 light/dark case matrix passes initial and
  revised containment, its 99.1% geometry floor, rendered brush paint, and all
  drag scenarios at 99.2% mean geometry similarity.

### F-073 — Scenario state overstated interaction quality

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: interaction UX audit across conformance cases 80–92
- Friction: ordered semantic scenarios solved renderer-specific selectors, but
  most assertions read JSON from a case-owned driver. Several values are
  constants or are regenerated from source data. An overlay can fail to paint,
  an axis can remain stale, focus can be lost, or a live region can remain
  empty while the scenario passes.
- Evidence: the current green suite missed an overflowing grouped tooltip,
  disappearing scroll-lane labels, sparse-date cursor dead zones, invisible
  value feedback, pointer-only sliders, scroll trapping, and synthesized
  handle geometry. Initial-state screenshots also omit the interactive state
  where these failures occur.
- Decision: retain semantic drivers for target resolution and serializable
  application state, but add checkpoint assertions against rendered DOM text,
  attributes, geometry, focus ownership, live regions, chart/page scroll, and
  responsive bounds. Let scenarios request screenshots after meaningful
  interaction steps.
- Verification: the grammar now covers touch, separate pointer phases,
  cancellation, captured movement, pixel/line/page wheel modes, bounded waits,
  revisions, and screenshots. Rendered assertions cover text, attributes,
  roles, focus, bounds, dimensions, and element/page scroll. Named composite
  regions are inspected honestly alongside chart images and applications.
  All 16 interaction cases pass both renderers, revisions, 320/640/960 px, and
  light/dark themes with zero captured page errors.

### F-074 — Axis focus distance created sparse cursor gaps

- Status: monitoring
- Severity: high
- Owner: Documentation
- Observed in: snapped grouped tooltip and synchronized-cursor cases
- Friction: `focusX` correctly groups the nearest x value, but the DOM host's
  default `maxFocusDistance = 48` still applies. At 960 px, April and May in
  the synchronized-cursor case were 111.6 px apart; the 55.8 px midpoint
  exceeded the threshold and cleared both cursors instead of snapping.
- Expected: an authored axis pointer that says it snaps to the nearest shared
  date remains active across the plot.
- Current decision: do not change the safe global proximity default. Axis
  pointer recipes and skills must choose an explicit distance policy based on
  interval spacing or continuous nearest-axis behavior. Cases 80 and 87 need
  midpoint and edge coverage.
- Verification: cases 80 and 87 now use an explicit continuous nearest-x
  policy and pass midpoint, first/last edge, pointer-leave, keyboard, touch,
  rendered crosshair, and revision checks at every standard width.
- Documentation verification:
  `packages/charts-core/docs/large-data-and-interaction.md` now places
  `maxFocusDistance` beside the four axis-focus strategies and distinguishes
  continuous snapping from finite proximity.
- Follow-up: reassess the API only if authoring evaluations still require
  case-specific pixel calculations after reading the guide.

### F-075 — Gesture recipes omitted controller semantics

- Status: monitoring
- Severity: high
- Owner: Documentation/Skill
- Observed in: focus/context, brush, wheel zoom, scrubber, and editable-range
  cases
- Friction: the current guidance correctly teaches scale copying and D3
  inversion, but the examples then hand-build pointer capture, wheel math,
  snapping, and overlays. Their value math passes while keyboard semantics,
  touch, cancellation, out-of-bounds clamping, visible values, and recovery
  controls are missing or inconsistent.
- Current decision: keep specialized interaction algorithms outside Charts
  core. Teach granular optional `d3-brush` for focus/context and range
  selection, optional `d3-zoom` for zoom/pan, and native semantic range
  controls for scrubbers and editable handles. The application still owns
  policy and presentation.
- Verification: cases 83 and 89 use real optional `d3-brush`; case 90 uses
  optional `d3-zoom`; cases 91 and 92 pair direct manipulation with native
  semantic controls. Pointer, keyboard, touch, cancellation, clamping,
  recovery, screenshots, and update preservation pass across the full matrix.
  Practical `d3-brush` plus selection and `d3-zoom` plus selection kernels are
  isolated at 16.20 and 15.91 kB gzip with independent budgets. Neither enters
  a locked Charts consumer.
- Documentation verification:
  `packages/charts-core/docs/large-data-and-interaction.md` routes by problem
  to the corrected brush, zoom, cursor, scrubber, editable-range, scrolling,
  and nested-tooltip cases and requires equivalent keyboard, touch,
  cancellation, clamping, visible-value, and recovery semantics.
- Follow-up: generate and evaluate the skill from this guide. Consider a
  tree-shakeable headless interaction boundary only if repeated production use
  still duplicates lifecycle code after using D3 and native controls.

### F-076 — Compact charts could not keep only one axis guide

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: pinned tooltip with a nested mini bar chart
- Friction: the mini chart needs x-period labels but no y guide. `guides` is an
  all-or-nothing chart boolean, so `guides: false` removed both axes and left
  four bars without temporal context.
- Expected: compact and nested charts can independently show or hide each axis
  guide without custom rendering.
- Decision: add per-axis guide visibility at the narrow axis configuration
  layer while retaining `guides: false` as the positionless-chart shorthand.
  The option must not add a universal dependency or affect charts that keep
  both guides.
- Verification: scene-layout tests cover x-only, y-only, both, and neither,
  including automatic margins and grid suppression. The nested-tooltip case
  retains period labels while hiding its y guide. The full 79-case matrix
  protects existing facet and ordinary-guide behavior. Exact bundle baselines
  record the reviewed change.

### F-077 — Transient host focus survived blur and cancellation

- Status: resolved
- Severity: high
- Owner: API
- Observed in: snapped tooltip and synchronized-cursor interaction audit
- Friction: the host establishes pointer and keyboard focus, but leaving the
  chart through normal keyboard focus movement can leave an unpinned tooltip
  and crosshair visible. The pointer path listens for movement and mouseleave,
  but not pointer cancellation, which can leave stale state after a canceled
  touch gesture.
- Expected: transient focus clears when the chart no longer owns keyboard or
  pointer interaction. Explicit application pinning remains controlled by the
  application.
- Decision: add scoped focus-out and pointer-cancel cleanup in the DOM host
  without changing selection or pinned application state.
- Verification: the shared DOM-host tests cover focus moving within the same
  cross-realm chart, focus moving to an adjacent control, pointer cancellation,
  and explicit selection preservation. Interaction scenarios cover blur,
  touch cancellation, pointer cancellation, and pinned state. Core, React, and
  Octane test suites plus the full 79-case matrix pass.

### F-078 — Renderer completion signals were incomparable

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: cross-library mount, update, and streaming stress work
- Friction: synchronous adapter return time was the only shared boundary.
  ECharts also exposes renderer events, while the other adapters did not, so a
  naïve comparison could either stop before progressive work completed or let
  one renderer report completion before the common browser-frame boundary.
- Decision: report synchronous commit, first-frame proxy, and two-frame settle
  proxy separately. Every adapter crosses the same frame barriers. Renderer
  signals are additive where available and fail through a bounded watchdog
  instead of acting as an early-success fallback.
- Verification: production-minified quick raw-line cells mount and update
  across TanStack Charts, Chart.js, ECharts, Recharts, and Observable Plot
  without an unsettled operation. Raw samples and all three boundaries are
  retained in the JSON result.

### F-079 — Large-data timing hid representation cost

- Status: resolved
- Severity: high
- Owner: Tooling/Skill
- Observed in: million-row stress-design review
- Friction: timing only renderer rows rewards pre-aggregation without exposing
  its cost, while timing a million direct SVG marks rewards a visualization no
  user should ship. “Rendered marks” also incorrectly described a line path,
  SVG points, and canvas commands as the same unit.
- Decision: keep raw-frontier, product, and encoded lanes separate. Record
  source rows, represented rows, prepared rows, output nodes/canvas pixels, and
  preparation time independently. Smart density, envelope, histogram, and
  top-plus-Other workloads must account for every source row and stay within
  an explicit prepared-row budget.
- Verification: deterministic tests cover source accounting, output budgets,
  global-extrema preservation, fixed histogram and density grids, top-category
  remainder accounting, true append prefix identity, and every update shape.
  Validation-only digest hashing is excluded from preparation timing. The
  runner rejects cross-library digest differences and never creates a combined
  raw/encoded rank. Density preparation materializes only occupied cells:
  100,000 rows produce 1,909 shared marks in the quick fixture rather than
  asking some renderers to discard 139 empty marks. The package's large-data
  guide now turns those invariants into a problem-first, skill-ready decision
  and validation procedure. The AI evaluation plan now requires routed and
  discovery cohorts to preserve row accounting, extrema, output budgets,
  preparation ownership, resize behavior, and semantic alternatives at
  100,000 and 1,000,000 source rows before the generated skill can pass.

### F-080 — Benchmark adapters drifted from shared geometry

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: first cross-library stress smoke runs
- Friction: appended line and scatter values were clipped because Chart.js and
  ECharts kept their mount-time x maximum; variable point `size` meant radius
  in three adapters, diameter in ECharts, and a remapped area in Recharts.
  Observable Plot's default figure margin also reduced an authored 800×400
  chart to 720×360.
- Decision: derive numeric x domains from the current canonical input on every
  render, define stress `size` as CSS-pixel radius, adapt diameter/shape APIs at
  their boundary, and normalize Plot's benchmark root margin. Output geometry
  is validated before a timing cell is accepted.
- Verification: the five-library 10,000-row raw-line smoke passes append and
  resize updates with exact 800×400 output. Adapter probes verify retained
  items or path vertices, numeric endpoint visibility, and post-update
  dimensions from the rendered scene, controller metadata, renderer model, or
  serialized SVG geometry as appropriate. Those probes caught a remaining
  TanStack adapter bug: the scene resized to 560×440 while its 100%-sized SVG
  stayed inside an 800×400 container. Updating container ownership alongside
  `host.update` closed it. The final quick matrix passes all 40 cells across
  TanStack Charts, Chart.js, ECharts, Recharts, and Observable Plot.

### F-081 — Pointer probes confused tooltip presence with state

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: trusted interactive-scatter stress timing
- Friction: timing two fixed animation frames and then checking for any
  tooltip-like DOM could accept a tooltip that was already active. ECharts'
  broad descendant-text heuristic also matched persistent renderer DOM, so
  moving outside the chart could not prove an inactive baseline.
- Decision: move outside the chart, wait for the adapter's exact tooltip to
  become inactive, arm the trusted event capture, and resolve only on the first
  observed inactive-to-active transition. The ECharts benchmark gives its
  tooltip an explicit class rather than inferring state from arbitrary
  descendants.
- Verification: five repeated trusted probes activate from a confirmed
  inactive state for TanStack Charts, Chart.js, ECharts, Recharts, and
  Observable Plot in the 40-cell quick matrix.

### F-082 — Dormant DOM-host work accumulated across dashboards

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: 64-chart dashboard stress profiling
- Friction: every fixed-width render still measured container bounds and
  refreshed computed font styles twice. Hosts without focus or `onRender` also
  queried DOM nodes they could not use.
- Decision: resolve explicit widths without layout reads, refresh DOM text
  state once per render boundary, and guard focus and render-callback queries
  behind their active state.
- Verification: three optimized full-profile runs mounted 64 charts in
  26.7–26.9 ms median versus 27.8–28.7 ms in two baseline runs. Median resize
  updates improved from 29.4 ms to 26.2–26.6 ms; same-shape updates improved
  from 24.3–24.4 ms to 23.6–24.1 ms. The locked DOM-host bundle grows by 21
  minified bytes and 8 gzip bytes. The composed interactive fixtures changed
  by 21 minified bytes and 51–64 Brotli bytes; their baselines moved by only
  those isolated A/B deltas rather than rebasing previously tolerated growth.
  Focused host tests, all 83 core tests, strict typecheck, and both bundle
  checks pass.

### F-083 — One-shot pointer timing hid sustained cursor work

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: cross-library interactive-scatter stress comparison
- Friction: an inactive-to-active tooltip probe measured startup latency but
  said nothing about a cursor already moving across data. A renderer could
  activate once, then retain stale content or update slowly without failing.
- Decision: expose deterministic fractional data targets and a rendered
  tooltip-state signature from every stress adapter. After activation,
  Playwright sweeps across 20, 100, or 300 targets using trusted pointer
  events and resolves each sample only after the active signature changes.
- Verification: the focused quick matrix changes state at all 20 targets for
  TanStack Charts, Chart.js, ECharts, Recharts, and Observable Plot with zero
  correctness failures. TanStack's active-to-active p95 is 0.5 ms in that run;
  the report keeps this separate from its 5.7 ms inactive activation p95.

### F-084 — Gesture and viewport costs were conflated

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: cross-library zoom and crop stress design
- Friction: a wheel or brush benchmark combines application-owned gesture
  policy, optional D3 controller work, framework state propagation, and the
  renderer's domain update. That makes a cross-library timing difference
  impossible to attribute.
- Decision: add a controlled viewport workload that gives every renderer the
  same 2,999-row extrema-preserving envelope, reuses the row array, and
  alternates only an explicit numeric x domain. Keep trusted wheel, drag,
  cancellation, clamping, and recovery behavior in the conformance suite.
- Verification: the focused quick matrix passes all five libraries with exact
  output-domain and SVG frame-clipping probes with zero correctness failures.
  TanStack's viewport update is 2.5 ms p95 for a 100,000-row source encoded
  into 2,999 vertices, within the frame budget. Preparation remains separately
  measured at zero for the domain-only transition.

### F-085 — Grid style repeated on every rule

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: node-heavy SVG update profiling
- Friction: every grid rule repeated the same inherited `stroke`,
  `stroke-opacity`, and `stroke-width`, increasing serialized SVG, attribute
  parsing, and reconciliation work without carrying datum-specific state.
- Decision: place only those three safely inherited presentation attributes on
  the existing grid group. Keep geometry on each rule and keep any
  non-inherited or compositing-sensitive style child-owned.
- Verification: focused scene and SVG tests prove the group owns the style and
  serialized rules omit all three attributes. Core passes 84 tests. Ordinary
  grids remove 30 attributes and 610 SVG bytes; the 128-bin histogram removes
  399 attributes and 8,113 SVG bytes. Every affected locked bundle shrinks by
  54 minified bytes and 0–5 gzip bytes, and the exact baselines record the
  reduction.

### F-086 — Finding status drifted from the index

- Status: resolved
- Severity: low
- Owner: Tooling
- Observed in: durable API-friction review before skill generation
- Friction: the index called F-008 open after its finding was resolved, while
  five documentation findings used `documentation` instead of one of the
  log's declared statuses. An agent reading only the index or only a finding
  would receive different routing guidance.
- Decision: normalize every finding to `open`, `monitoring`, or `resolved`, and
  test that IDs are unique, sequential, present in both locations, and carry
  identical statuses.
- Verification: the focused documentation test passes both structural checks
  across all 86 findings.

### F-087 — Custom focus strategies erased application types

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: advanced interaction inversion-of-control type audit
- Friction: `ChartFocusStrategy` made each method independently generic, so a
  custom strategy had to accept every possible datum and coordinate type. A
  hoisted strategy could not safely inspect an application datum or use its
  inferred string, number, or Date coordinates without narrowing or an
  assertion.
- Decision: parameterize `ChartFocusStrategy` and `ChartFocusMode` by datum,
  x-value, and y-value. Host and adapter options use the definition as the
  inference source, while the built-in `focusX`, `focusY`, nearest-axis, and
  disabled strategies remain genuinely polymorphic.
- Verification: strict contracts let a custom categorical strategy use datum
  fields and string/number operations directly, reject a numeric-x strategy
  for a string-x chart, and continue accepting built-in focus strategies for
  categorical and heterogeneous definitions. Core focus tests and the
  repository typecheck pass. The public contract adds no dependency or
  observable behavior; the built-in strategy implementation was reshaped to
  preserve its polymorphism.

### F-088 — Update counts hid key and latest-wins correctness

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: rolling-window and multi-series stress protocol review
- Friction: a renderer could preserve the expected number of points while
  reassigning series ownership, remounting every surviving key, selecting the
  wrong grouped x value, or allowing a superseded rapid update to overwrite
  the final state. Item counts, raw SVG signatures, and a single tooltip
  activation could not distinguish those failures.
- Decision: add an immutable rolling feed with exact logical datum probes,
  five-percent overlap accounting, monotonic awaited streams, and synchronous
  latest-wins bursts. Gate TanStack's surviving keyed SVG nodes and report
  physical reuse where other SVG renderers expose it. Multi-series output now
  requires ordered identities, stable color ownership, explicit domains, and
  exact focused x and per-series values before and after structural updates.
  Canonical SVG signatures normalize generated resource IDs. Idle stability
  uses rendered-pixel signatures, while an idempotent replay compares exact
  logical/output probes: Chart.js and ECharts can rasterize the same canonical
  data to byte-different antialiased pixels after a fresh draw.
- Verification: deterministic data tests prove exact removed, added, overlap,
  object-identity, domain, and semantic-digest behavior at the protocol
  boundary. All five rolling and multi-series adapter bundles compile with
  stress-only probes, strict typecheck passes, and normal comparison builds
  define the rolling feature off. The exact grouped-value gate caught a
  Chart.js adapter declaring `parsing: false` while the reorder update supplied
  descending x values: Chart.js consequently treated the data as sorted and
  selected x 258 when the authored pointer target was x 129. Leaving parsing
  enabled for that input lets Chart.js detect the unsorted series; the focused
  quick workload now passes exact x and all eight series values for initial,
  reorder, append, and visibility states. Failure output retains both expected
  and observed x, identities, and values. The standard Recharts rolling run
  then exposed a second false-positive shape: its output probe counted both
  each renderer-owned scatter wrapper and a nested custom mark carrying the
  same class, reporting 2,000 items for 1,000 rows and 10,000 for 5,000. The
  probe now counts only top-level Recharts symbol layers, independently of
  authored data attributes; DOM regressions cover both default and nested
  custom shapes. Scatter item gates now require exact equality across every
  adapter. The canonical five-library quick matrix passes all 55 cells,
  including exactly 1,000 rolling items per adapter. The integrated standard
  multi-series and rolling matrix passes all 15 cells at 24×520, 1,000, and
  5,000 rows with exact output and grouped interaction probes. Every
  48-revision latest-wins burst drains to the stable final digest. TanStack
  reuses all 950 and 4,750 surviving keyed nodes, while the observable SVG
  competitors reuse none, and retains no DOM nodes or listeners after the
  lifecycle soak. A focused full run extends the exact gate to 96 revisions
  and 10,000 dots: all 9,500 survivors retain their nodes and the final scene
  is correct, while the 2.56-second synchronous enqueue makes the application
  ownership boundary explicit. The dynamic-chart guide now distinguishes
  correctness from free coalescing and tells latest-only sources to commit at
  the display cadence upstream.

### F-089 — Custom SVG renderers erased scene point types

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: advanced renderer inversion-of-control type audit
- Friction: `ChartSvgRenderer` accepted only a broadly typed `ChartScene`, even
  when the consuming chart definition had exact datum, x-value, and y-value
  types. A custom renderer that inspected scene points therefore lost the
  inference available to focus, tooltip, and render callbacks.
- Decision: parameterize `ChartSvgRenderer` by datum and coordinate values and
  connect host, React, and Octane renderer props to the definition-owned types.
  `NoInfer` keeps the chart definition, rather than an optional callback, as
  the inference source. The existing generic built-in renderer remains
  assignable without consumer annotations.
- Verification: a strict host contract infers row, string-x, and numeric-y
  values inside an inline renderer and rejects a numeric-x renderer for the
  same categorical chart. The full repository typecheck passes; the change is
  declaration-only outside the adapters' already-erased private memo surface.

### F-090 — Source exports hid packed-package failures

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: packed core, React, and Octane consumer validation
- Friction: workspace source exports proved neither the files a package would
  publish nor the declarations and runtime conditions a clean consumer would
  resolve. The first real tarball check found that public `d3-shape`
  declarations depended on `@types/d3-shape` even though it was owned only as a
  development dependency. Octane also requires distinct browser and server
  entry artifacts.
- Decision: keep source exports for workspace development and define
  conditional `publishConfig.exports` over built `dist` artifacts. A
  deterministic gate stages the declared package files, builds client and
  server outputs, normalizes sibling workspace dependency ranges, creates real
  tarballs, and installs only those TanStack tarballs into a disposable
  fixture. Public declaration dependencies now travel with the core package.
  Third-party packages are linked from the installed workspace solely to keep
  the gate offline; this does not claim registry installability.
- Verification: `pnpm package:check` resolves every core subpath and both
  adapters from fixture-owned `dist` files, exercises core, React, and Octane
  runtime rendering, and passes strict consumer declarations for required
  dynamic input, exact point coordinates, definition-derived datum and
  coordinate helpers, custom focus, and custom SVG rendering without casts.
  Minimal packed production consumers measure 33.43 kB / 13.32 kB gzip for
  core, 47.95 kB / 18.65 kB for React, and 27.90 kB / 10.78 kB for Octane.

### F-091 — Adapter coordinate generics broke explicit arity

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: React and Octane public-signature compatibility audit
- Friction: adding definition-owned x-value and y-value generics to the
  adapter overloads made every generic parameter required. Existing explicit
  `Chart<Datum>` and `Chart<Datum, Input>` calls stopped compiling even though
  fully inferred calls remained sound.
- Decision: default only the trailing coordinate generics to `ChartValue` in
  the React and Octane overloads, including Octane's manual declaration. The
  definition remains the inference source when consumers omit explicit
  generics.
- Verification: source contracts compile the prior one-parameter static and
  two-parameter dynamic call shapes. The packed strict fixture independently
  infers exact datum, x-value, and y-value types for inline React and Octane
  focus strategies and SVG renderers, while rejecting incompatible numeric-x
  strategies and renderers without explicit component generics. Repository
  typecheck and `pnpm package:check` pass.

### F-092 — Packed documentation linked outside its tarball

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: packed core, React, and Octane documentation audit
- Friction: relative links in package Markdown worked from the repository
  checkout but could point to benchmarks, acknowledgements, or other files
  omitted from the published tarball. A clean npm consumer received broken
  documentation even though every source link resolved locally.
- Decision: package-owned documentation links relatively only to files shipped
  in the same package. Repository-only evidence and shared source material use
  canonical GitHub URLs. The packed-consumer gate now reads every Markdown file
  reported by `pnpm pack --json`, resolves its inline, image, and reference
  links from that file, and rejects missing files or paths escaping the same
  tarball. Absolute URLs, fragments, query-only links, and `mailto:` links
  remain valid.
- Verification: focused helper tests cover inline, image, reference, encoded,
  nested-parenthesis, fragment, query, absolute URL, code-span, fenced-code,
  missing-file, traversal, root-relative, and malformed destinations.
  `pnpm package:check` validates the staged core, React, and Octane tarballs,
  while `pnpm adapters:check` applies the same packed Markdown-link contract
  to Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine. The friction-log
  structural tests pass.

### F-093 — Filtered stress runs overwrote canonical reports

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: focused Recharts and Chart.js multi-series browser gates
- Friction: every stress invocation wrote
  `stress-<profile>.{json,md}`, so a one-library or one-workload diagnostic run
  silently replaced the complete profile matrix and its durable evidence.
- Decision: keep canonical filenames only for unfiltered profiles. Derive
  filtered artifact names from sorted, deduplicated, filesystem-safe library
  and workload IDs, with a bounded digest for long selections. Store the
  resolved filters in result metadata so artifact scope is explicit.
- Verification: four helper tests cover canonical, deterministic, sanitized,
  collision-resistant, and bounded names. A real filtered Chart.js quick run
  emitted
  `stress-quick--libraries-chartjs--workloads-stats-multi-series-line.{json,md}`
  with matching filter metadata and zero correctness failures; pre- and
  post-run hashes of both canonical quick artifacts remained identical.

### F-094 — Custom marks conflated point and scale values

- Status: resolved
- Severity: medium
- Owner: API/Documentation
- Observed in: rect/cell scale-domain and point-value type separation
- Friction: `ChartMark` could correctly distinguish the values materialized
  into positional scales from the values emitted in interaction points, but
  the public `createMark` factory exposed only the point-value generics. An
  advanced custom interval mark needed a manual return annotation or had to
  widen both contracts, losing either callback precision or scale checking.
- Decision: keep the ordinary `createMark` signature unchanged and add the
  `@tanstack/charts/mark/scale-values` subpath with a
  `createMarkWithScaleValues` factory for the exceptional split contract. An
  attempted five-parameter overload on `createMark` changed esbuild's minifier
  assignment and added 1–4 gzip bytes to ordinary consumers despite erasing
  from JavaScript; re-exporting the isolated factory from the root still added
  one gzip byte. Both were rejected. The exceptional factory must remain zero
  bytes when unused.
- Verification: a strict custom-mark contract declares numeric point values
  and categorical/numeric scale values without an assertion, accepts a band x
  scale, rejects a linear x scale, and preserves numeric x in the inferred
  definition callbacks and in `ChartSpecXValue`/`ChartSpecYValue` after
  declaration emit. Exact locked ordinary bundles remain unchanged. The
  isolated entry is 0.13 kB gzip against a 0.25 kB ceiling, and the packed
  package gate resolves the source and declaration subpath for Node, browser,
  and bundler consumers.

### F-095 — Long matrices treated one browser stall as deterministic

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: complete five-library standard stress run
- Friction: 99 of 100 cells completed, but one ECharts Stats-shaped timing
  cell exceeded the 120-second outer limit after a long sequential run. The
  exact same production bundle and profile passed immediately in a fresh
  isolated run with 9.3 ms mount p95, 4.5–5.7 ms update p95, 100 exact grouped
  pointer states, and zero correctness failures. Treating the first stall as a
  renderer regression made the canonical gate nondeterministic.
- Decision: retry only an outer cell timeout or browser-context
  infrastructure failure, exactly once in a fresh browser context. Renderer,
  adapter, page, protocol, and correctness failures are not retryable; a
  one-off blank render or stale pointer state cannot become green on a second
  attempt. Record every attempted error in JSON and Markdown. A repeated
  failure remains hard; clean first attempts are unchanged.
- Verification: the focused ECharts rerun passes the complete standard cell.
  Six unit tests gate clean, recovered, persistent, and non-retryable paths;
  timing and memory recovery render `r`, persistent timing or memory failure
  renders `x`, and both errors from a failed retry remain available to the
  report. The final unfiltered five-library standard run completed all
  100 cells with zero correctness failures and zero retries; the formerly
  stalled ECharts Stats-shaped cell passed on its first attempt.

### F-096 — Export smoke tests drifted from package manifests

- Status: resolved
- Severity: medium
- Owner: Tooling
- Observed in: final public-package surface audit
- Friction: the source export smoke tests claimed to resolve every documented
  capability subpath but duplicated hand-written lists. The core list omitted
  ten current exports, including focus, custom scale-value marks, SVG
  resources, and several mark capabilities; the D3 package list omitted its
  root, focus, and SVG resources exports.
- Decision: derive source export specifiers directly from each package's
  `exports` manifest and dynamically import every declared entry. Keep the
  packed-package gate as the independent proof that the corresponding
  published runtime and declaration exports resolve.
- Verification: both source export tests resolve every manifest entry,
  including the root exports, and `pnpm package:check` validates every staged
  published subpath for Node, browser, and bundler consumers.

### F-097 — Lifecycle page errors passed the memory soak

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final adversarial stress-protocol audit
- Friction: timing cells rejected browser `pageerror` and console errors, but
  memory cells did not listen for either. An error exposed only by repeated
  mount, update, or destroy cycles could therefore return `status: "ok"` and
  pass validation with misleading lifecycle metrics.
- Decision: use one shared page-error collector in timing and memory cells.
  Deduplicate page and console errors, ignore non-error console messages, and
  throw the same non-retryable `Page errors:` failure before either cell can
  succeed.
- Verification: focused collector tests cover non-error exclusion plus
  page/console aggregation and deduplication. The retry, artifact-scope, and
  page-error suites pass all 12 tests; stress-runner syntax and repository
  whitespace checks pass.

### F-098 — Filtered conformance runs overwrote full reports

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final conformance-artifact audit
- Friction: a focused `--case` catalog run always wrote
  `plot-catalog.{json,md}`, silently replacing the complete 79-case report
  consumed by CI and documentation with a partial result.
- Decision: retain the historical canonical filenames only for unfiltered
  runs. Give filtered runs deterministic, sorted, deduplicated,
  filesystem-safe `plot-catalog--cases-<selection>` names with a bounded
  digest for long selections, and record the resolved filter in JSON.
- Verification: four helper tests cover canonical, deterministic, sanitized,
  collision-resistant, and bounded names. A real one-case size run emitted
  `plot-catalog--cases-90-zoomable-time-window.{json,md}` with explicit filter
  metadata; hashes of both canonical 79-case artifacts remained unchanged.

### F-099 — Invalid cells remained eligible for fastest rankings

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final adversarial stress-report audit
- Friction: renderer completion and correctness were separate states, but the
  Markdown report selected rows only by `status: "ok"`. A completed cell with
  a digest, accounting, pointer, memory, or burst failure could still appear in
  metric tables and be named the fastest library.
- Decision: count renderer completion independently, then exclude every cell
  with a matching correctness failure from Markdown metrics and fastest-result
  comparisons. Preserve the complete row and failure evidence in JSON.
- Verification: focused validity tests distinguish completion from
  correctness, exclude an exactly matching failed cell, and guard against
  prefix collisions between cell IDs.

### F-100 — Spatial-index updates skipped focused UI repaint

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: final DOM-host lifecycle audit
- Friction: a no-render host update treated spatial-index replacement and
  focused UI repaint as mutually exclusive branches. Changing the spatial
  index while disabling or reformatting the tooltip rebuilt pointer lookup but
  left the old focused tooltip visible and stale until another interaction.
- Decision: refresh the optional spatial index and repaint existing focus as
  independent work in the no-render update path. This preserves the current
  scene and SVG while applying every changed interaction option immediately.
- Verification: a focused runtime regression mounts an active tooltip, changes
  the spatial index and disables the tooltip in one shallow-equal update, then
  proves the replacement index was created and the existing tooltip was
  hidden. The clean branch shrinks affected consumers by five minified bytes
  and adds 1–2 gzip bytes; that measured correctness cost is recorded in the
  exact universal bundle lock. Core runtime tests, repository typecheck,
  formatting, bundle policy, and the friction-log structural checks pass.

### F-101 — Page errors could age into retryable timeouts

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final adversarial retry-protocol audit
- Friction: per-cell page-error collectors asserted only after a timing or
  memory operation returned. If an uncaught error also left a renderer
  completion promise pending, the 120-second outer timeout won the race and
  became retryable. A clean second attempt could then hide the original
  correctness failure.
- Decision: subscribe to existing and newly created pages at the browser
  context boundary. Race an immediate page/console-error rejection alongside
  the cell operation and timeout so the error remains non-retryable even when
  renderer settlement never completes. Keep the end-of-cell collectors as a
  defensive aggregate.
- Verification: four focused page-error tests cover aggregate deduplication,
  non-error console exclusion, a new page's uncaught error, and an existing
  page's console error. Retry tests continue to reject non-retryable
  correctness failures after one attempt. A real focused Chromium run completes
  the Stats-shaped timing, trusted-pointer, sustained-update, and memory-soak
  cell with zero correctness failures and zero retries.

### F-102 — AI recipes hid direct D3 dependency ownership

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: final packed AI-documentation audit
- Friction: package docs repeatedly instructed applications to import granular
  `d3-*` modules without saying those modules and their `@types/*` packages
  must be direct dependencies under strict package managers. The log-scatter
  recipe also called `defineChart` and `dot` without importing them, while the
  Stats migration duplicated a stale exact bundle checkpoint.
- Decision: make the core README and `llms.txt` explicit about consumer-owned
  D3 dependencies, give both adapter READMEs exact direct-install examples,
  make the recipe self-contained, and link Stats to the canonical measured
  table rather than copying values. Model the documented D3 imports as direct
  dependencies in the packed-consumer fixture.
- Verification: the packed declaration consumer directly declares and
  resolves `d3-array`, `d3-scale`, `d3-shape`, and their matching type packages
  while compiling imports from all three beside the packed TanStack packages.
  Packed Markdown link validation and the package gate pass.

### F-103 — Mixed valid and unknown filters narrowed benchmark scope

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final benchmark CLI audit
- Friction: stress and conformance filters rejected a selection only when
  nothing matched. A command containing one valid ID and one typo silently ran
  the valid subset, allowing a user or agent to believe the missing library,
  workload, or case had been tested.
- Decision: validate every requested filter value against the complete
  configured ID set before selecting work, building bundles, or launching a
  browser. Report all unknown values and the sorted available set in one
  actionable error.
- Verification: focused tests accept absent and completely known filters while
  rejecting a mixed valid/unknown selection with every typo named. Both
  benchmark runners pass syntax checks and retain their existing empty-scope
  guards. A real mixed `tanstack,typo` stress invocation exits before browser
  launch and lists `typo` plus every available library ID.

### F-104 — Catalog embeds lacked a production-safe contract

- Status: monitoring
- Severity: high
- Owner: Tooling/Integration
- Observed in: integrating catalog iframes into the TanStack Charts
  documentation
- Friction: an omitted `height` query value became 120 pixels because
  `Number(null)` is zero; the root document retained a 320-pixel minimum width
  in embed mode; status messages used an unversioned type and wildcard target;
  and a documentation theme controlled by site state could not update an
  already interactive iframe. The intended production origin and base path
  were described but not exercised by the build gate.
- Decision: publish one versioned embed contract in the schema-v2
  `catalog.json`; fix the production route at
  `https://tanstack.com/charts/catalog/`; parse explicit query defaults and
  bounds; remove root and body width/background constraints in local embed
  mode; derive the exact parent origin from the HTTP(S) referrer; and accept a
  versioned `set-theme` command only from that origin and `window.parent`. A
  missing or opaque referrer disables messaging instead of falling back to
  `*`. TanStack.com owns the production embed route and response headers.
- Verification: focused contract and route tests cover missing, invalid,
  bounded, and production-base inputs plus source/origin/case/version
  rejection. The generated artifact carries the shared contract and canonical
  page/embed paths for every case. A real 280-pixel production-preview iframe
  renders without horizontal overflow or catalog chrome, defaults to 360
  pixels when height is omitted, reports one exact-origin/source versioned
  ready event, accepts the trusted theme command, and ignores a wrong-case
  command. Typecheck and catalog metadata validation pass.
- Follow-up: TanStack.com currently sends `X-Frame-Options: DENY` outside its
  existing Stats embed and drops raw Markdown iframes whose host is not on its
  external-media allowlist. The Charts site worktree now validates exact
  catalog embed URLs, preserves authored iframe metadata, forwards trusted
  theme changes, and exempts only valid catalog embed paths from the deny
  header. Keep this finding in monitoring until that site change and the
  generated catalog are deployed together at the production path.

### F-105 — Competing documentation roots drifted

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: authoring the publishable TanStack Charts documentation
- Friction: repository-level plans, package-local guides, adapter READMEs, and
  prospective website pages could each describe the same API independently.
  Existing package guides had already accumulated incomplete imports, stale
  measurements, and contradictory lifecycle claims.
- Decision: make root `docs/` the only authored documentation tree. Generate
  the package-local mirror and both `llms.txt` indexes from it. Keep README
  content introductory and route detailed behavior to one canonical page.
  Validate navigation completeness, frontmatter, local links, public exports,
  D3 ownership, and catalog embeds in CI.
- Verification: the canonical contract covers 79 configured pages and 83
  unique catalog embeds. `docs:sync` reproduces the package mirror byte for
  byte, and `docs:check` rejects stale generated files or a second direct D3
  reference owner.

### F-106 — Build-context theme looked fully resolved

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: dynamic-definition and theme reference authoring
- Friction: `ChartBuildContext.theme` sounds like the final scene theme, but a
  dynamic builder receives `defaultChartTheme`; a `theme` returned by that
  builder is merged later during scene creation.
- Decision: describe the value consistently as the default build-time theme.
  Theme-aware builders that need application overrides receive them through
  typed input; the final resolved theme remains available on `ChartScene`.
- Verification: the concepts, theme guide, chart-definition reference, and
  type reference use the same ownership language, and a source audit traces
  the default token through `createChartRuntime` and the later scene merge.

### F-107 — Authored SVG tab indexes were ignored

- Status: resolved
- Severity: high
- Owner: API
- Observed in: documenting host and adapter accessibility options
- Friction: `ChartHostCommonOptions` exposed `tabIndex`, but the DOM host
  always passed `0` while keyboard behavior was enabled and did not rebuild
  when only `tabIndex` changed. React and Octane could not preserve an authored
  value consistently between server and client.
- Decision: use `options.tabIndex ?? 0` whenever keyboard behavior is enabled,
  retain `-1` as the `keyboard: false` override, include `tabIndex` in render
  invalidation, and expose the same prop through both adapters.
- Verification: core and React regressions cover initial output and updates;
  Octane shares the same server renderer and host option. Focused runtime,
  adapter, type, and accessibility tests pass.

### F-108 — Interaction point color differed from rendered fill

- Status: resolved
- Severity: high
- Owner: API
- Observed in: tooltip and focus reference authoring
- Friction: `barX`, `barY`, `areaX`, and `areaY` could paint an explicit or
  accessor-derived fill while emitting the fallback ordinal color on
  `ChartPoint`. Native focus rings and tooltip swatches therefore disagreed
  with the visible mark.
- Decision: resolve fill once per datum or series and use that exact value for
  both scene paint and the interaction point.
- Verification: focused mark tests use deliberately different ordinal
  fallbacks and cover constant and accessor fills for all four marks.

### F-109 — Grouped focus could duplicate the focused series

- Status: resolved
- Severity: high
- Owner: API
- Observed in: validating the grouped focus reference against source
- Friction: grouped focus chose the first point encountered for each group,
  then prepended the focused point. Restoring a later same-group point could
  therefore return two representatives for one series, contradicting native
  tooltip and callback semantics.
- Decision: seed the per-group map with the focused point before collecting
  representatives from the remaining candidates.
- Verification: a regression restores the second same-group point and asserts
  exactly one member for that group with the focused point first.

### F-110 — Hexagon radius mapping accepted invalid source values

- Status: resolved
- Severity: medium
- Owner: API
- Observed in: auditing the dot and hexagon reference contract
- Friction: `dot` rejected negative raw radii before calling `rScale`, while
  `hexagon` passed every finite value through. A mapper such as `Math.abs`
  could turn invalid negative input into a visible hexagon.
- Decision: share one finite, nonnegative radius predicate across both marks
  and apply it before optional radius mapping and after mapped output.
- Verification: a regression proves that a negative raw radius neither calls
  the mapper nor emits a point while a valid sibling still renders.

### F-111 — Adapter aspect-ratio geometry diverged on first render

- Status: resolved
- Severity: high
- Owner: API
- Observed in: React, Octane, responsive, and SSR documentation
- Friction: with explicit `width` and `aspectRatio`, both adapters derived the
  initial height from `initialWidth` but built the scene at the explicit
  width. Negative and nonfinite ratios also produced invalid outer CSS while
  the runtime used a different fallback.
- Decision: resolve the initial scene width as `width ?? initialWidth`;
  normalize aspect ratio to a positive finite number; and use those values for
  server geometry, host options, and outer styles. Apply the same finite
  fallback in the vanilla DOM host.
- Verification: React SSR, Octane SSR/client, and core-host regressions cover
  explicit width plus ratio and zero, negative, `NaN`, and infinite values.
  The exact bundle lock records the combined tab-index and sizing corrections
  at +90 minified/+25 gzip bytes for the DOM host, +163/+49 bytes for the React
  adapter, and +165/+52 bytes for the complete React line consumer.

### F-112 — Reference rules could not render dashed strokes

- Status: resolved
- Severity: low
- Owner: API
- Observed in: authoring a layered chart-spec example
- Friction: a dashed threshold required by the example could be expressed by
  lines and links but not by `ruleX` or `ruleY`, forcing an unnecessary custom
  mark or unsupported cast for a routine annotation.
- Decision: add `strokeDasharray` to both rule option types and forward it
  through the existing scene style and SVG renderer.
- Verification: the composed-mark test asserts both rule orientations retain
  their dash arrays in the scene and serialized SVG. The representative-marks
  lock records the capability at +34 minified bytes and -1 gzip byte.

### F-113 — Direct runtime factories cannot infer later definitions

- Status: monitoring
- Severity: low
- Owner: API/Documentation
- Observed in: authoring the runtime, SSR, and TypeScript reference pages
- Friction: `createChartRuntime()` is called before `runtime.render()` receives
  a definition, so TypeScript cannot infer the datum, input, x-value, and
  y-value types from that later call. The low-level direct-runtime examples
  required all four generic arguments even though normal hosts and adapters
  infer them from `definition`.
- Decision: document the four explicit generics at the advanced direct-runtime
  boundary and keep the common host and adapter paths fully inferred. Do not
  add a definition token or second runtime-construction shape until repeated
  direct-runtime use shows that the extra API surface would pay for itself.
- Verification: the runtime, SSR, and TypeScript pages use the exact generic
  order, while host, React, Octane, and packed declaration tests continue to
  prove definition-driven inference without casts or adapter generics.

### F-114 — Gradient stop tokens disappeared from standalone exports

- Status: resolved
- Severity: high
- Owner: API
- Observed in: validating the export guide against CSS-variable theme examples
- Friction: standalone SVG export inlined computed presentation properties for
  chart nodes but omitted `stop-color` and `stop-opacity`. A gradient that
  depended on inherited CSS variables could therefore look correct in the DOM
  and lose its colors when downloaded.
- Decision: include both gradient stop properties in the computed-style
  serialization allowlist.
- Verification: the export regression uses computed CSS-variable values on
  gradient stops and asserts that the standalone SVG contains their resolved
  color and opacity.

### F-115 — Documentation checks did not validate code snippets

- Status: resolved
- Severity: high
- Owner: Tooling
- Observed in: final documentation and public-export audit
- Friction: the documentation contract proved that a TanStack package subpath
  existed and that every public export appeared somewhere in the reference,
  but it did not prove that a named import came from the entry that exported it
  or that a typed code fence was syntactically valid. Heading fragments were
  also accepted without proving the destination existed. Plausible, copyable
  snippets could pass with a wrong type import or a bare object-property
  fragment that was not valid TypeScript, while cross-page navigation could
  silently land at the top.
- Decision: parse typed code fences in canonical docs and public READMEs,
  reject syntax diagnostics, resolve every TanStack specifier through its
  package manifest, and validate every named value and type import against
  that source entry. Resolve local Markdown fragments against generated
  heading anchors, including duplicate-heading suffixes. Designate primary
  standalone examples for strict TypeScript checking; compile the Octane
  quick start in both client and server modes.
- Verification: the contract rejects invalid typed syntax, unknown subpaths,
  unknown symbols, and missing headings; helper tests cover syntax,
  named-import extraction, heading slugs, and example discovery; 16
  executable examples, all 79 canonical pages, and the public READMEs pass
  against the current package manifests.

### F-116 — Build context was mistaken for resolved plot geometry

- Status: resolved
- Severity: medium
- Owner: Documentation
- Observed in: responsive, dynamic-data, faceting, and large-data guide review
- Friction: the dynamic chart builder receives the full scene `width` and
  `height`, while the final inner plot rectangle depends on guide and legend
  measurement that happens afterward. Examples that treated the builder size
  as exact plot space could misplace pixel-based collision layouts, bins, or
  overlays at responsive widths.
- Decision: consistently call builder dimensions the outer scene bounds.
  Route exact plot-space work to a custom mark render phase or to an
  application overlay driven by the resolved `scene.chart` rectangle.
- Verification: the responsive, dynamic-data, faceting, large-data, and custom
  extension pages use the same boundary, and responsive examples no longer
  claim that builder dimensions are final inner bounds.

### F-117 — Non-Cartesian examples duplicated coordinate engines

- Status: resolved
- Severity: high
- Owner: API
- Observed in: native pie, donut, gauge, radar, polar line/scatter, radial
  hierarchy, and atlas-backed GeoJSON catalog expansion
- Friction: scene nodes could already carry arbitrary paths, but the public API
  did not own a non-Cartesian coordinate system. The radar case duplicated
  responsive centering, angular projection, polygon grids, spokes, and label
  placement in a 211-line custom mark; the GeoJSON case separately rebuilt
  responsive projection, paths, styling, and identity. Pie, donut, and gauge
  examples were absent rather than forcing consumers through more local marks.
  Expanding the five seed cases into the expected catalog then exposed two
  narrower holes: polar labels and radial segments still required a custom
  mark, while projected Point geometry could not pass a datum radius through
  D3 `geoPath`. The first numeric polar-line comparison also exposed that the
  specialized radial-line group lacked the generic line-role class shared by
  catalog and inspection tooling.
- Decision: add opt-in `@tanstack/charts/polar` and
  `@tanstack/charts/geo` entry points. `polar` copies configured D3 angle and
  radius scales into final responsive bounds and composes D3-backed arcs,
  radial lines, radial areas, dots, text, rules, and guides. `geoShape` accepts
  a responsive `d3-geo` projection factory, delegates path and centroid
  geometry to D3, and maps `r`/`rScale` through `geoPath().pointRadius()`.
  Radial line and dot groups also carry their generic geometry-role classes.
  Neither capability is re-exported from the package root. Boundary datasets
  and TopoJSON conversion stay application-owned inputs rather than package
  dependencies.
- Verification: focused core tests cover responsive scale copying, source-scale
  immutability, D3 path equality, wrapped seams, advanced per-datum arc
  generators, guide layering, semantic role classes, missing-scale errors,
  projected GeoJSON paths, and interaction points. The polar expansion covers
  labels, center content, rounded and nested rings, rose, needle gauge,
  comparative radar, radial bars, sunburst, numeric line, and numeric scatter.
  The geographic expansion covers regional and 177-country choropleths,
  proportional symbols, a 51-feature Albers USA map, orthographic globe,
  projected routes, and a four-projection atlas gallery. Isolated gzip gates
  are 10.50 KiB for geo, 8.69 KiB for arcs, 9.12 KiB for D3 pie plus arcs, and
  18.50 KiB for a complete polar line/scatter composition under an 18.75 KiB
  ceiling, while atlas data and every locked Cartesian entry remain outside
  those bundles. The full scale-backed gauge composition is independently
  budgeted at 17.5 KiB gzip.
  Numeric polar line/scatter pass the six-variant standard matrix at 100.0%
  geometry similarity; country and state atlas cases pass at 99.9%, and the
  four-pane projection gallery passes at 99.8%. All 328 tests, strict
  typechecking, isolated bundle gates, 64-page documentation checks, packed
  exports/declarations/runtime imports, 100 catalog pages and embeds, and all
  example builds pass.

### F-118 — Serialized SVG discarded interaction semantics

- Status: monitoring
- Severity: medium
- Owner: API/Application
- Observed in: adding tooltips to the TanStack Charts landing-page SVGs
- Friction: `renderChartSvg` preserved mark geometry, axis keys, focus
  affordances, and accessible chart text, but not the resolved `ChartPoint`
  scene or tooltip runtime. Keeping the marketing assets as portable server
  SVG therefore required one application adapter to recover points from
  circles, bars, line paths, and axis coordinates. Rounded SVG coordinates
  also placed interpolated dates seconds before midnight, so date tooltips
  needed exact encoded mark keys when available and UTC-day snapping
  otherwise. The activation hero also retained only its serialized SVGs; a
  landing-page source comparison had no checked-in definition that could prove
  which marks and scales generated them. A later kinetic hero exposed the same
  boundary for motion: serialized states retained `data-ts-key` identity but
  had no live reconciler, so a crossfade was the only automatic transition.
- Decision: keep this recovery logic isolated in the landing-page interaction
  component and do not present serialized SVG as a generally hydratable chart
  contract. Keep the activation definition as generator input and import that
  same file as the highlighted landing-page source so the evidence and SVG
  cannot drift. The kinetic definitions share rows, mark IDs, datum keys, and
  one view box; the landing adapter interpolates compatible path data and SVG
  attributes, with a crossfade only for unmatched geometry. Revisit supported
  interaction metadata or hydration only if another static-SVG consumer
  encounters the same boundary.
- Verification: all 14 landing SVG variants and the custom bundle chart expose
  formatted pointer and keyboard tooltips; compact and wide revenue tooltips
  retain exact dates and grouped series values. Regenerating the activation
  asset from the retained definition reproduces both prior SVGs byte for byte,
  and the generator check covers the displayed definition. All six kinetic
  states emit the same eight keyed product points; compatible lines, areas, and
  stems retain mark identity while the browser interpolates their geometry.
  Site typechecking, targeted type-aware lint, unit tests, production build,
  and desktop/mobile browser checks pass.

### F-119 — Catalog hosting crossed repository ownership

- Status: monitoring
- Severity: high
- Owner: Tooling/Integration
- Observed in: publishing the executable catalog at
  `https://tanstack.com/charts/catalog/`
- Friction: the catalog source, conformance contract, and production build
  belong to the Charts repository, while the public hostname is served by the
  separate `tanstack.com` repository. Copying source into that repository would
  couple releases and duplicate build ownership. A separate catalog Worker
  preserved ownership but necessarily replaced the site's chrome, routing,
  headers, cache policy, and content delivery behavior.
- Decision: treat the catalog as generated structured content. Charts CI builds
  schema-v2 `catalog.json` plus only the recursively allowlisted implementation
  modules, then replaces the generated `catalog-dist` branch after validation
  and the unfiltered conformance matrix. TanStack.com's existing content
  pipeline reads that branch, verifies hashes and limits, renders native routes
  and embeds, and serves modules below an artifact-commit namespace. Charts
  source and dependencies remain out of the site repository and default site
  bundle. The previous Worker, staging tree, deployment scripts, credentials,
  and route ownership are removed from the Charts workflow.
- Verification: the artifact generator records an exact Charts revision,
  deterministic SHA-256 allowlist, safe repository source paths, recursive
  imports, and debug-only comparison roots. Focused tests reject unsafe paths,
  unreferenced assets, and public comparison modules. The loading gate checks
  every TanStack root's static closure for reference cases or competitor
  packages. Main-branch CI uploads the validated artifact and publishes only
  `catalog.json` and `assets/*.js` to `catalog-dist`. The publication workflow
  pins every third-party action to a full commit SHA, as required by the
  repository's Actions policy.
- Follow-up: keep monitoring through the TanStack.com cutover, production route
  verification, and retirement of the previously deployed catalog Worker.

### F-120 — Key-only focus collapsed duplicate observations

- Status: resolved
- Severity: high
- Owner: API
- Observed in: native line tooltip path-hover regression
- Friction: the renderer host stored only the focused point's public `key`.
  When multiple observations in one line shared that key, moving between them
  was ignored, and an otherwise no-render host update repainted the first
  matching observation instead of the point nearest the pointer.
- Decision: retain the focused `ChartPoint` as the current-scene identity.
  Compare its key, mark, and datum index during interaction; on a scene render,
  restore an ambiguous key by datum reference, semantic point values, then
  datum index. Stable unique datum keys remain the preferred authoring path.
- Verification: the DOM-host regression dispatches pointer movement from the
  actual SVG line path to a later duplicate-key point, updates tooltip options
  without rendering, forces a responsive render, and moves back to the first
  point. The callback, focus marker, and tooltip stay on the exact observation
  throughout. All 25 focused runtime tests pass.

### F-121 — SVG callback was not a rendering-pipeline boundary

- Status: resolved
- Severity: high
- Owner: API
- Observed in: adding an optional Canvas renderer without changing the default
  SVG consumer path
- Friction: `ChartSvgRenderer` replaced scene-to-string serialization, but the
  host still owned SVG root discovery, coordinate mapping, focus painting,
  keyed reconciliation, and SVG-shaped `onRender` callbacks. A Canvas consumer
  could compile `ChartScene`, but preserving responsive sizing, runtime reuse,
  pointer and keyboard focus, tooltips, selection, SSR, and framework
  lifecycles required reimplementing the host. Adding Canvas to the existing
  default adapter would also make an optional renderer reachable from
  SVG-only bundles.
- Decision: introduce `ChartRenderer` for deterministic prerendering and
  mounted-surface creation, `ChartSurface` for paint, coordinate, focus, and
  cleanup ownership, and `mountChartRenderer` for shared host behavior. Keep
  `mountChart` and `ChartSvgRenderer` as SVG compatibility APIs. Publish Canvas
  through `@tanstack/charts/canvas` and framework `/canvas` entries, while
  framework `/core` entries accept an application-supplied renderer.
- Verification: core, React, and Octane tests cover deterministic SSR,
  hydration identity, renderer replacement, and shared
  pointer/keyboard/tooltip/selection behavior. Native Chromium verification
  covers device-pixel-ratio backing stores, `Path2D`, CSS color resolution,
  gradients, focus isolation, resizing, and PNG export. Bundle metafiles and
  packed-consumer checks enforce that renderer-neutral entries include neither
  renderer and Canvas entries include no SVG reconciler.

### F-122 — Dense scene aggregation overflowed the call stack

- Status: resolved
- Severity: high
- Owner: API
- Observed in: the one-million-point Canvas stress check
- Friction: scene compilation aggregated channel values and interaction points
  with `push(...values)`. Large valid arrays exceeded the JavaScript engine's
  argument limit before the selected renderer could paint them. Facet and
  polar aggregation used the same unsafe pattern.
- Decision: append dense collections with bounded loops in the shared scene,
  facet, and polar compilers. This keeps the public data contract intact and
  fixes the failure before it reaches any renderer.
- Verification: a 200,000-value scene regression completes without an
  argument-limit error. Native Chromium also compiles and mounts one million
  dots through the Canvas renderer with four surface descendants. That check
  still retains roughly 427 MiB of JavaScript heap and spends most first-paint
  time rasterizing the dense path, so Canvas removes per-mark DOM cost rather
  than making unbounded data free.

### F-123 — Framework adapters repeated runtime ownership

- Status: resolved
- Severity: high
- Owner: API
- Observed in: launching Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine
  adapters beside React and Octane
- Friction: every component needed the same runtime creation, deterministic
  initial geometry, renderer prerender, prerender-to-mount cache handoff,
  update, scene access, and cleanup rules. Reimplementing those rules in each
  framework would repeat the preparation bug from F-011 and allow SSR,
  `aspectRatio`, keyboard, or teardown behavior to drift.
- Decision: publish `createChartAdapter` and `resolveChartAdapterLayout` from
  `@tanstack/charts/adapter`, with the renderer-neutral
  `createChartRendererAdapter` isolated at
  `@tanstack/charts/adapter/renderer`. Framework packages own only their native
  prop, lifecycle, reactivity, and presentation boundary.
- Verification: the controller regression proves dynamic preparation runs
  once across prerender and mount, pre-mount updates are retained, and invalid
  ratios resolve consistently. Preact, Vue, Solid, and Svelte cover server and
  browser paths; Angular, Lit, and Alpine cover update and teardown; Angular
  partial compilation and Svelte package compilation pass. Packed React
  consumers retain their renderer boundary without pulling SVG modules.

### F-124 — Name-only inventories masked undocumented contracts

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: full public documentation audit
- Friction: every exported name passed the documentation contract even when
  it appeared only in the API overview's import map or an adapter page's
  `Exports:` inventory. Six adapter-controller exports had no behavioral
  reference, and the Preact, Vue, Solid, Svelte, Angular, Lit, and Alpine
  adapters named their public symbols without documenting their complete
  option, lifecycle, presentation, or server contracts.
- Decision: add a controller lifecycle reference and a complete API reference
  for every framework adapter, route capability-specific types to their owner
  pages, and document the renderer, Canvas host and surface, scale resolver,
  color scale, and polar contracts found by the same audit. Exclude import
  maps, routing lists, and name-only export paragraphs from substantive symbol
  coverage.
- Verification: focused coverage tests prove inventories no longer satisfy an
  export while signatures, tables, code, and explanatory prose do. The
  documentation contract passes all 79 canonical pages, 83 catalog embeds, 16
  executable examples, public package entry points, and exported symbols.

### F-125 — Adapter surface classes disappeared across lifecycles

- Status: resolved
- Severity: high
- Owner: API
- Observed in: documenting framework adapter presentation contracts
- Friction: `className` was part of the shared typed host options, but both
  `createChartAdapter().prerender()` and
  `createChartRendererAdapter().prerender()` omitted it. Server output
  therefore disagreed with the mounted surface for every adapter that
  forwarded the option. Vue additionally disabled attribute inheritance
  without declaring `className`, so its client and server paths both dropped
  the value.
- Decision: forward `className` through both shared prerender boundaries and
  declare it as a Vue component prop so initial and mounted surfaces honor the
  published option.
- Verification: the SVG and renderer-neutral adapter regressions cover
  prerendered surface classes; Vue server and browser regressions cover the
  same class before and after mount. Focused tests, repository typechecking,
  and all seven adapter package gates pass.

### F-126 — Executable comparisons had no public documentation

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: full public documentation audit follow-up
- Friction: the repository exercised five chart libraries across 60
  deterministic bundle fixtures, shared browser and stress protocols, and a
  100-pair conformance corpus, but the public documentation exposed none of
  that evidence or the usual TanStack capability matrix. Readers could not
  distinguish a first-party feature, application composition, verified
  absence, or an untested claim.
- Decision: publish one canonical comparison page for the four alternatives
  in the executable matrix. Extract the capability data from the benchmark
  runner into a shared source, reserve red cells for verified missing
  first-party paths, cite exact official competitor pages, and report only the
  durable tracked bundle baseline rather than machine-sensitive browser
  rankings. Record package versions and the complete chart/tier matrix in that
  baseline so dependency or protocol changes require a refresh.
- Verification: the documentation contract checks every matrix cell against
  the shared benchmark source, every displayed package version against the
  repository manifests, all 60 expected bundle cases and displayed gzip
  ranges against the tracked baseline, and exact competitor-link
  allowlisting. The canonical and package documentation contain 80 pages, and
  the generated indexes route readers to the comparison.

### F-127 — Catalog source hid data transformation dependencies

- Status: resolved
- Severity: high
- Owner: Documentation/Tooling
- Observed in: transform authoring audit of the public catalog and example
  guides
- Friction: the gallery rendered only each `tanstack.ts` entry even though 95
  of 100 entries imported case-local or shared data. Several `data.ts` modules
  contained the defining accumulation, layout, or derived coordinates, making
  the visible source appear simpler than the raw-data-to-chart implementation.
  Transform-heavy dynamic cases also obscured whether transformation or cache
  invalidation belonged to Charts.
- Decision: treat the raw-data boundary as part of the authoring contract.
  Catalog source follows and displays every case-local source dependency.
  Raw fixture modules may load, parse, or generate observations; bins, stacks,
  ranks, cumulative endpoints, summaries, and layouts remain visible in
  renderer or transform source. The conformance report exposes transitive
  authored lines per implementation and their per-case ratio. Data-space
  transforms use ordinary adjacent functions; application or framework
  reactivity owns memoization. Surface-responsive transforms remain in the
  chart callback.
- Verification: recursive source-loader coverage proves that the entry,
  `data.ts`, and local transform modules render while shared harness modules
  stay excluded. Histogram, moving-average, stacked-area, boxplot, lollipop,
  and waterfall show their transforms beside `defineChart`. Waterfall data
  exports signed contributions rather than cumulative endpoints; force and
  Marimekko show their local layout modules; the responsive waffle source
  visibly expands category totals into cells. The nine-case browser run passes
  with zero diagnostics or unsafe assertions and reports a 1.19× geometric-mean
  authored-source ratio to Observable Plot.

### F-128 — Chart-owned data reactivity duplicated application state

- Status: resolved
- Severity: high
- Owner: API
- Observed in: transform authoring audit and catalog migration
- Friction: `prepare`, formal chart `input`, and their equality functions added
  a second reactivity contract beside framework computed state or explicit
  vanilla updates. The API added input and prepared-data generics, runtime
  caches, adapter handoff rules, and manual equality whose invalidation could
  diverge from application reactivity.
- Decision: remove `prepare`, `prepareEqual`, `ChartPrepareContext`,
  `prepared`, formal `input`, `inputEqual`, `chartInputsEqual`,
  `shallowInputEqual`, and their generics from the public API and runtime.
  Definitions capture application values. Framework-native memoization owns
  invalidation, definition identity signals application changes, and host size
  changes still rebuild responsive definitions. Place transforms in ordinary
  functions beside `defineChart`; memoize the complete definition when its
  captured values change.
- Verification: strict typecheck, 1,966 core and framework tests, the
  seven-adapter package gate, and the 81-page documentation contract pass with
  definitions built only from captured application values plus current size
  and theme. Public docs, adapters, and executable examples contain no formal
  chart input or chart-owned equality API. The packed-consumer declaration
  fixture exercises responsive definitions across core, React, and Octane and
  asserts that adapter chart props reject formal `input`. The bundle contract
  records additional reductions of 921 minified/311 gzip bytes for the
  TanStack DOM host and 716 minified/268 gzip bytes for the React adapter. An
  every-adapter example audit removed the final stale Angular and Lit guide
  snippets that still passed `input` separately from their definitions.
