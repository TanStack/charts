# TanStack Charts API friction log

This is the durable feedback loop for building the API with itself. It records
observed difficulty from examples, production migrations, tests, and agent
evaluations so later API, documentation, and TanStack Intent skill work is
based on evidence.

Last updated: 2026-07-27

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

| ID    | Finding                                            | Owner           | Status     |
| ----- | -------------------------------------------------- | --------------- | ---------- |
| F-001 | Configured D3 scales required a TanStack wrapper   | API             | resolved   |
| F-002 | Responsive range ownership was unclear             | Documentation   | monitoring |
| F-003 | Scale requirements were absent from chart types    | API             | resolved   |
| F-004 | A radius channel silently imported continuous D3   | API             | resolved   |
| F-005 | Curved area topology was implemented independently | API             | resolved   |
| F-006 | Explicit domain construction is repetitive         | API/Skill       | monitoring |
| F-007 | Runtime and adapters bypassed strict scales        | API             | resolved   |
| F-008 | D3 motion would currently burden every DOM host    | API             | open       |
| F-009 | Automatic ordinal color is an implicit exception   | Documentation   | monitoring |
| F-010 | D3 curves require one TanStack grammar bridge      | API             | monitoring |
| F-011 | Adapters performed dynamic preparation twice       | API             | resolved   |
| F-012 | Render callbacks omit diagnostic metrics           | API             | monitoring |
| F-013 | Bar series identity also changed bar geometry      | API             | resolved   |
| F-014 | Responsive nicing duplicates layout calculations   | API             | resolved   |
| F-015 | Legacy scale helpers compete with the D3-first API | API             | resolved   |
| F-016 | Stats animated export still renders through Plot   | Integration/API | open       |
| F-017 | React migration rebuilt a static definition        | Documentation   | resolved   |
| F-018 | Stats derivations still invalidate dynamic input   | Application     | monitoring |
| F-019 | Custom tooltip formatting leaked float artifacts   | Application     | resolved   |
| F-020 | Axis focus could not select a single nearest point | API             | resolved   |
| F-021 | Native tooltips only accept plain text             | API             | monitoring |
| F-022 | Native tooltips could not be pinned                | API             | resolved   |
| F-023 | Fixed margins clip or waste guide space            | API             | resolved   |
| F-024 | Co-located benchmark cases defeated tree shaking   | Tooling         | resolved   |
| F-025 | Bundle maintenance clobbered comparison reports    | Tooling         | resolved   |
| F-026 | Facet summaries omitted the overall result         | Tooling         | resolved   |
| F-027 | Pnpm validation attempted an interactive purge     | Tooling         | open       |
| F-028 | Field channels accepted incompatible value types   | API             | resolved   |
| F-029 | Dynamic hosts allowed omitted input                | API             | resolved   |
| F-030 | Heterogeneous dynamic marks erased datum types     | API             | resolved   |
| F-031 | Positional scales were disconnected from channels  | API             | resolved   |
| F-032 | Memoized adapter internals erase generic types     | API             | monitoring |
| F-033 | Point coordinate values remain broad               | API/Docs        | monitoring |
| F-034 | Text color and offset required mark duplication    | API             | resolved   |
| F-035 | Plot legends confused the primary SVG measurement  | Tooling         | resolved   |
| F-036 | Presence-only visual checks overstated parity      | Tooling         | resolved   |
| F-037 | Facets repeat shared axes in every panel           | API             | resolved   |
| F-038 | Plot and D3 threshold arrays mean different things | Documentation   | resolved   |
| F-039 | Dots could not express stroke opacity              | API             | resolved   |
| F-040 | Bundle ceilings allowed silent universal growth    | Tooling         | resolved   |
| F-041 | Bounded segments and caps required custom marks    | API             | resolved   |
| F-042 | Hoisted tooltip options lose callback context      | API/Docs        | monitoring |
| F-043 | Plot and D3 wiggle stacks use different origins    | Documentation   | resolved   |
| F-044 | Difference fills need crossing interpolation       | Documentation   | resolved   |
| F-045 | Arrow endpoints could not express vector fields    | API             | resolved   |
| F-046 | Mirrored labels required duplicate text marks      | API             | resolved   |
| F-047 | Unique Delaunay edges are not obvious              | Documentation   | monitoring |
| F-048 | Responsive waffle packing lacks final bounds       | API             | monitoring |
| F-049 | Plot and d3-hexbin use different units             | Documentation   | resolved   |
| F-050 | Plot proportion units depend on transform scope    | Documentation   | monitoring |
| F-051 | Beeswarm layout needs responsive pixel preparation | Documentation   | monitoring |
| F-052 | D3 rank overloads lose callback context            | Documentation   | monitoring |
| F-053 | Data-bound annotations can escape auto margins     | Documentation   | monitoring |
| F-054 | D3 reducer output needs empty-safe narrowing       | Documentation   | monitoring |
| F-055 | Horizontal areas required renderer internals       | API             | resolved   |
| F-056 | Conformance tooling assumed Plot was the reference | Tooling         | resolved   |
| F-057 | D3 hierarchy coordinates use screen-space y        | Documentation   | monitoring |
| F-058 | Radar checks ignored polar labels                  | Tooling         | resolved   |
| F-059 | Vite cached a newly added package subpath          | Tooling/API     | resolved   |
| F-060 | Geometry similarity could not gate exact layouts   | Tooling         | resolved   |
| F-061 | Catalog metadata validation was browser-bound      | Tooling         | resolved   |
| F-062 | Interaction checks were selector-bound             | Tooling         | resolved   |
| F-063 | Resolved scales cannot map pixels back to values   | Documentation   | resolved   |
| F-064 | Scroll-clipped labels failed containment           | Tooling         | resolved   |
| F-065 | Logical views required fake DOM roots              | Tooling         | resolved   |
| F-066 | Disabling native focus required a custom strategy  | API             | resolved   |
| F-067 | Reference wrappers duplicated accessible roots     | Tooling         | resolved   |
| F-068 | Source audit omitted shared implementation files   | Tooling         | resolved   |
| F-069 | Strict containment exposed a clipped Plot guide    | Application     | resolved   |
| F-070 | ECharts brush injected an undeclared toolbox       | Application     | resolved   |
| F-071 | Formatter crossed into the Stats parity worktree   | Tooling         | resolved   |
| F-072 | Wide brush ticks exceeded a locked right margin    | Application     | resolved   |

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

- Status: monitoring
- Severity: medium
- Observed in: documentation conversion to raw D3 scales
- Friction: normal D3 examples configure both domain and range, while a
  container-responsive chart cannot know its final pixel range at definition
  time.
- Decision: the author owns the semantic domain; TanStack copies the scale and
  owns its responsive range.
- Follow-up: track whether agents still set ranges or rebuild definitions on
  resize after reading the recipes.

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

- Status: monitoring
- Severity: low
- Observed in: strict-scale product policy
- Friction: positional and continuous color scales are explicit, while grouped
  marks receive an automatic D3 ordinal theme scale.
- Decision: retain the exception provisionally because it costs about 0.62 kB
  gzip and materially improves the default chart.
- Follow-up: verify that agents understand how to override it and that
  ungrouped charts do not need stricter color ownership.

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
- Decision: the adapter-owned prerender runtime is handed to `mountChart`,
  which adopts it and owns its eventual cleanup. A measured-width first render
  can rebuild the scene while reusing prepared data.
- Verification: vanilla runtime adoption tests assert one preparation and
  cleanup abort ownership; React and Octane client adapter tests assert one
  preparation on mount. React hydration, React SSR, and Octane SSR tests retain
  complete initial markup and pass unchanged.

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
- Observed in: cross-library bundle and browser comparison matrix
- Friction: re-exporting one benchmark mount from a module containing four
  top-level chart definitions retained every TanStack mark. Line, bar, area,
  and scatter therefore produced the same 52.48 kB minified artifact even
  though the public mark modules are tree-shakeable. The same failure recurred
  when a shared conformance mount module imported `react-dom` for Recharts:
  TanStack's isolated case grew from 22.40 to 80.90 kB gzip despite never
  calling the Recharts helper.
- Decision: give each chart type an isolated entry module and share only the
  renderer-free host setup. Renderer-specific helpers with runtime imports
  live in separate modules. Tier variants also use direct build-time globals;
  exported or locally aliased tier constants are not assumed to propagate
  across modules. Do not rely on purity annotations or minifier-specific
  interprocedural analysis for benchmark validity.
- Verification: emitted TanStack artifacts contain only the selected mark
  class, and the four minified and compressed measurements are distinct. The
  tiered line bundles also separate as expected: TanStack gzip is 18.12 kB
  basic, 18.42 kB interactive, and 20.65 kB advanced; Chart.js interactive
  similarly adds its legend and tooltip plugins. After moving `rechartsMount`
  to its own module, the composed Recharts comparison restored TanStack to
  22.40 kB gzip versus Recharts at 168.56 kB and passed the quick visual gate.

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
  commands still write the selected facets.
- Verification: the bundle baseline passes without changing the restored
  standard comparison report.

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

- Status: open
- Severity: low
- Owner: Tooling
- Observed in: Octane showcase demo validation
- Friction: `pnpm exec prettier` attempted to remove and reinstall the existing
  workspace modules, then aborted because validation ran without a TTY. The
  already-installed Prettier, TypeScript, Vite, and Vitest binaries worked
  directly without changing dependencies.
- Expected: repository formatting, build, typecheck, and test commands run
  non-interactively against the existing install.
- Current decision: validate this task with the installed workspace binaries;
  do not mutate dependencies to mask the environment mismatch.
- Follow-up: reconcile the package-manager metadata for the existing
  `node_modules` install, then verify the documented pnpm commands no longer
  request an interactive purge.

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
- Verification: core, React, and Octane negative contracts reject missing,
  extra, and incorrectly shaped input. Runtime tests cover mount and update.

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
- Decision: built-in marks carry phantom x/y output types. `ChartSpec` links
  those outputs to configured D3 scales and axis formatters, widening literal
  values to their normal string, number, or Date type. Rect endpoints now
  preserve the effective x1/x2 and y1/y2 channel unions. Ambiguous custom and
  faceted marks stay broad; `ChartScale` remains the explicit advanced escape
  hatch.
- Verification: compile-time contracts cover band, linear, UTC, implicit-index,
  static, dynamic, heterogeneous, and rect definitions and reject swapped
  scales. The catalog's eight known-invalid paired programs are all rejected
  by TanStack Charts without casts or suppressions.
- Remaining edge: the parallel-coordinates case showed that a categorical
  literal union is widened to `string` before axis compatibility is checked.
  This keeps `scaleBand<string>` ergonomic but rejects the equally valid
  `scaleBand<ParallelMetric>`. Keep this entry under observation until the
  scale contract can accept both narrow and widened domains without weakening
  incompatible-scale rejection.

### F-032 — Memoized adapter internals erase generic types

- Status: monitoring
- Severity: low
- Owner: API
- Observed in: React and Octane adapter type audit
- Friction: the memoized rendering surface stores definitions and runtimes in
  a non-generic component boundary, requiring two contained internal
  assertions per adapter. Public definitions, props, callbacks, and input
  remain inferred.
- Current decision: keep erasure private to the adapter render boundary; never
  teach or expose these assertions as consumer patterns.
- Follow-up: remove them if the framework memo APIs can preserve a correlated
  generic component without adding adapter complexity or runtime work.

### F-033 — Point coordinate values remain broad

- Status: monitoring
- Severity: medium
- Owner: API/Documentation
- Observed in: callback type audit
- Friction: `point.datum` is exact, but `point.xValue` and `point.yValue` remain
  `ChartValue`, so direct coordinate use may require normal TypeScript
  narrowing.
- Current decision: document `point.datum` as the semantic-value path. Do not
  use a consumer assertion. Coordinate typing requires propagation through the
  scene, runtime, interaction, and adapter protocols and will be evaluated as
  a separate type-only change.
- Follow-up: measure callback usage in Stats, examples, and agent evaluations
  before expanding the public generic surface.

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
  chart container. Plot legends intentionally allow endpoint labels to
  overflow their small owner SVG while remaining visible inside the container.
- Verification: the runner and gallery now aggregate every emitted SVG, while
  primary geometry uses the chart-sized SVG and multi-SVG legend labels are
  checked against the same container-level visibility contract as chart
  labels.

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
  paints. Equivalent RGB interpolation output may differ by one channel unit
  because Plot and direct D3 scale paths round colors differently.
- Verification: the corrected histogram boundary contract renders all seven
  bins, explicit bar domains preserve category order, paired paints pass for
  all implemented cases, and the Anscombe case now fails specifically because
  Charts repeats its shared y-axis four times.

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
  budgets.

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

- Status: documentation
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

- Status: documentation
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

- Status: documentation
- Severity: medium
- Owner: Documentation/Skills
- Observed in: faceted distribution catalog case
- Friction: Plot's percentage display uses transformed values in `[0, 100]`,
  and `proportion` normalizes globally while faceted histograms generally need
  `proportion-facet`. Treating either output as a fraction produces incorrect
  domains or comparisons between panels.
- Current decision: recipes must name the normalization scope and express
  domains in post-transform units. Direct D3 preparation divides each facet bin
  by that facet's own observation count, then multiplies by 100.
- Verification: the paired faceted distributions pass responsive shared-guide,
  geometry, paint, and strict-type checks with each panel independently
  normalized.

### F-051 — Beeswarm layout is responsive pixel-space preparation

- Status: documentation
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

- Status: documentation
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
- Decision: keep polar scaffolding in the case-local custom mark, but make the
  reference use its documented 80% radius and 20 px margin. Mirror Recharts'
  eight-pixel angle-label offset, rotated 30-degree radial axis, and distinct
  angle/radius label colors. Assert all eleven labels as data-bearing visual
  geometry so the omission cannot pass again.
- Verification: focused responsive initial/update conformance passes at 320
  and 640 px with all eleven labels present, matching paints, no overflow,
  100.0% diagnostic geometry similarity, clean strict types, and 0.07×
  Recharts gzip. The fix changes only the comparison case; no library bundle
  or universal renderer path changed.

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
- Observed in: publishing the conformance gallery as deep case and embed routes
- Friction: the only strict case metadata parser lived beside
  `import.meta.glob`, so Node publication tooling either had to duplicate the
  schema or trust raw JSON. A duplicate validator would drift as interaction
  scenarios and additional reference renderers were added.
- Decision: move metadata parsing into an environment-neutral TypeScript
  module. The Vite catalog and Node static publisher now consume the same
  parser; the publisher adds only publication invariants such as unique
  IDs/orders and directory-name agreement.
- Verification: strict typecheck passes, `catalog:check` validates all current
  cases, and `catalog:build` generates matching detail pages, embeds, and
  `catalog.json` from the same parsed metadata.

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
