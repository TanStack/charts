# @tanstack/charts

## 0.7.2

## 0.7.1

### Patch Changes

- [#64](https://github.com/TanStack/charts/pull/64) [`c3f1548`](https://github.com/TanStack/charts/commit/c3f15488bb072e446af61c3e7b04797384c5aca5) - Pin packaged documentation and comparison protocol links to the immutable tag
  for the same package version. Release automation now advances those tag links
  together with every visible release-version reference.

## 0.7.0

### Minor Changes

- [#60](https://github.com/TanStack/charts/pull/60) [`38cddc8`](https://github.com/TanStack/charts/commit/38cddc846c8f342aedcd237956a0057155022ae9) - Expose pinned state to tooltip content and item callbacks so built-in and
  framework-rendered tooltips can expand with additional detail when pinned.
  Keep dismissing clicks owned by the tooltip when a framework body unmounts
  during event propagation.

  Standardize public callback parameters as primary data plus a context bag.
  Tooltip `format` and `formatGroup` now receive the same content context as
  `content`; channel accessors use `(datum, { index, data })`; facet, focus,
  legend, and spatial-index extension callbacks move their supporting values
  into named context objects. Controlled signals now receive change reasons in
  `{ reason }`; keyed-selection keys and focus-guide label formatters receive
  their point in `{ point }`; interactive legend item labels receive
  `{ visible }`.

  `ruleX` and `ruleY` now expose axis-specific presentation-only focus anchors, so
  `whenFocused(..., { match: 'x' })` and `whenFocused(..., { match: 'y' })` can
  reveal focused guide rules without making them interaction or tooltip targets.

  Update the published pinned-tooltip catalog case to show the energy overview,
  compact hover summary, and animated pinned detail.

  Preserve distinct source rows in the linear-regression, framed-scatter, and
  many-point-scatter catalog examples when car names and years repeat.

  Keep React Native chart-host focusability aligned with the shared definition
  contract and toggle sticky activation exactly once per accessibility action.

- [#55](https://github.com/TanStack/charts/pull/55) [`a5f9702`](https://github.com/TanStack/charts/commit/a5f97022f90043254e0e0dde174cdf2a63b6a198) - Add renderer-native crosshair rules, categorical cursor bands, labels, and optional intersection markers plus shared focus/free cursor controllers across SVG, Canvas, motion, and React Native rendering. Focus-filtered rule marks now use non-interactive semantic anchors, built-in axis focus modes select the painted mark under the pointer before grouping or snapping, and keyed motion guides remain active through scene updates.

- [`6fd52a8`](https://github.com/TanStack/charts/commit/6fd52a8910c9f933609dce14bffab5277f6325b2) - Add native waffle, optional spatial hexbin, Delaunay link, Voronoi,
  scalar-grid contour, density contour, responsive treemap and sunburst marks,
  responsive Sankey composition, dot dodge layouts, typed wide-to-long fold and
  polar pie transforms, and optional static force-layout and tidy-tree
  transforms. Polar charts add radius- and angle-extending bar marks, responsive
  radius scale ranges, post-scale text and rule offsets, and automatic outside
  text anchors. These marks, layouts, and transforms own their data- or
  plot-space geometry, so examples no longer need to copy scales, author D3
  paths, flip hierarchy coordinates, manually pivot metric fields, calculate
  responsive label radii or bar rings, or hide hierarchy and settled network
  coordinates in case utilities. The exact Sankey entry accepts semantic graph
  rows and composes ordinary child marks over immutable final-pixel node and link
  values without exposing D3 mutation cleanup.

  Resolved dot placement is also extensible through `createDotLayout`, which
  receives final plot bounds, measured coordinates, and radii while Charts keeps
  row identity, interaction, state, and motion ownership. Treemap tiling, Sankey
  alignment, and named static-force factories accept D3-compatible callables in
  addition to the built-in shorthands; all operate over private layout copies and
  retain validation, immutability, and source lineage.

  Cartesian bars add an orientation-neutral `maxThickness` constraint that caps
  their final painted categorical size after grouping and inset, without asking
  definitions to estimate responsive chart bounds. Absolute inline-state inset
  overrides retain their existing semantics without escaping the cap.

  Add eager `boxRows` preparation plus raw-row `boxX` and `boxY` marks with Tukey
  quartiles, observed whiskers, outlier lineage, transposed orientation, and one
  summary interaction target per category. The marks reuse the public semantic
  rows without exposing presentation keys. Add `compositeMark` for namespaced
  composition of ordinary child marks with preserved datum, channel,
  interaction, and motion ownership.

  Stack layouts add inside-out series order and a zero-origin wiggle policy.
  Areas, bars, and row transforms now share D3 inside-out ordering, dense sparse
  cell handling, and a single global baseline translation, so streamgraphs can
  consume tidy source rows without case-owned pivoting or interval generation.
  Anchored stacks additionally translate ordered nonnegative series around a
  named series fraction, so diverging Likert charts can keep counts in ordinary
  bar definitions without manually materializing signed endpoints.

  Add an eager `waterfall` transform for ordered signed contributions, cumulative
  start/end intervals, increase/decrease classification, optional grouped net
  totals, and direct source lineage.

  Add eager `mosaicY` and `mosaicX` transforms for two-dimensional proportional
  intervals over explicitly aggregated category pairs. They preserve semantic
  categories, both normalization totals, stable source order, and direct lineage
  for ordinary rectangle and text marks. Mosaic and pie share an overflow-safe
  proportional interval allocator; waffle keeps its distinct rounded unit-fragment
  and resolved packing policy.

  Add `lineX` as the strict transposed counterpart to `lineY`, sharing grouping,
  keys, gaps, styling, interaction, motion, and renderer-neutral path output.

  Add eager `linearRegressionRowsY` and `linearRegressionRowsX` preparation plus
  `linearRegressionY` and `linearRegressionX` composite marks with centered
  least-squares fits, optional grouped Student-t confidence bands, semantic-domain
  sampling, aggregate lineage, transposed geometry, and one interactive fitted
  line per group. The marks reuse the public semantic rows without exposing
  presentation keys.

  Add `differenceY` and `differenceX` composite marks that split two source-row
  series at exact interpolated crossings, paint stable positive and negative
  lobes, preserve derived lineage, and keep both raw boundary lines interactive.

  Add semantic `ridgelineY` / `ridgelineX` and `violinY` / `violinX` marks for
  prepared normalized profiles. Both derive responsive displacement from complete
  point or band category domains without numeric category surrogates. Ridgelines
  own one-sided overlap and optional outlines; violins own mirrored envelopes
  while binning, normalization, density estimation, and summaries remain explicit
  definition concerns. Tick marks add an optional category-step-relative `span`
  for responsive summary bars without authored endpoint coordinates.

  Add exact-subpath focus guide marks with renderer-neutral rules, markers,
  measured labels, raw datum identity, and stable retargeting keys. Retargetable
  `whenFocused` marks now enter at the active geometry, update through ordinary
  mark motion, preserve interrupted spring velocity, and exit on focus clear
  across SVG, Canvas, and React Native surfaces. Candidate ownership is
  collision-safe for delimiter-containing keys, primitive rows match by value
  and source position, and mark-state transitions no longer override another
  mark's focus motion.

  Add an exact-subpath controlled signal and a controlled interactive categorical
  legend. Applications retain the visible-series snapshot while Charts owns
  domain-ordered toggling, post-domain geometry and focus filtering, responsive
  top or bottom layout, stable native browser buttons, and static SVG fallback.
  Static color and gradient legends also support top or bottom placement.

  Add exact-subpath controlled keyed selection with `keyedSelection` and
  `whenSelected`. Host activation maps ordinary chart points to application keys
  through a controlled signal. Selected marks keep their complete domain
  contribution, then paint only matching point-owned geometry as a decorative
  overlay without duplicate focus or activation targets.

  Add exact-subpath `decorative(mark)` composition. It keeps an ordinary or
  resolved-layout mark's scale contribution, layout measurement, motion,
  post-domain work, and painted geometry while removing interaction ownership and
  exposing `never` point types. This lets one layer in a line-plus-dot composition
  own focus, tooltips, and activation without changing pointer affinity.

  Add exact-subpath `brushX` as a controlled chart behavior. It resolves against
  the final x scale and plot bounds, owns D3 pointer/touch lifecycle, semantic
  snapping, reverse normalization, cancellation, keyboard slider handles, host
  teardown, and a renderer-neutral static fallback. Applications retain the
  accepted range, fixed-window policy, linked-view layout, and persistence.

  Add exact-subpath `continuousCursor` as a controlled chart behavior for an
  unsnapped numeric or temporal x/y position. It resolves both final scales and
  plot bounds, paints rules, a marker, and optional axis labels, owns transient
  pointer/touch previews, click or tap pinning, leave/cancel cleanup, Escape and
  toggle clearing, host teardown, and a renderer-neutral static fallback.
  Applications retain semantic sliders, status text, formatting policy, and
  persistence.

  Add exact-subpath `zoomX` as a controlled continuous horizontal-window
  behavior. It owns focus-gated pointer-anchored wheel zoom, horizontal-wheel and
  drag pan, touch and pinch gestures, keyboard zoom/pan/reset, final-scale
  inversion, clamping, cancellation, accessibility, and host teardown while D3
  Zoom remains private to the optional subpath. Applications retain the accepted
  semantic window, visible-row and y-domain policy, status, reset controls, and
  persistence.

  Add exact-subpath `handleX` as a controlled, candidate-bound horizontal scale
  handle. It owns final-scale track, rule and handle painting, nearest-candidate
  snapping, pointer and touch capture, preview, commit and cancellation, keyboard
  slider semantics, resize synchronization, and host teardown without a D3
  runtime. Applications retain playback or editing state, controls, validation,
  status, and persistence.

  Tooltip definitions add `visibility: 'pinned'` for focusable charts whose rich
  detail should mount only after activation. Pointer pinning now repaints inline
  pinned mark states, and SVG and Canvas restore base paint when tooltip
  dismissal clears focus completely.

  Facet definitions now preserve the datum type and identity emitted by their
  child marks, type group rows as nonempty, and apply motion to the child datum.
  Facets and the new exact-subpath `viewGrid` definition factory share one
  full-chart scene adoption kernel with stable point and mark namespaces.
  `viewGrid` arranges normal child definitions in named fixed/flexible tracks and
  can align or strictly share resolved plot ranges without reserved-domain
  coordinates or manual scene plotting.

  Add exact-subpath `composeViews` for heterogeneous complete chart definitions.
  Opaque `fill`, `grid`, `layer`, and anchored `inset` utilities compose responsive
  frames, while `shareX`, `shareY`, `alignX`, and `alignY` keep scale coordination
  separate from layout. `viewGrid` remains as concise grid syntax over the same
  composition engine. Child pointer and cursor settings now fail explicitly
  instead of disappearing at the adoption boundary; the outer definition owns
  that lifecycle.

  Controlled brush, cursor, and handle behaviors repaint the application-accepted
  snapshot after a rejected terminal proposal. Continuous cursor axes invert the
  resolved scale by default while retaining explicit value mapping and
  coordinate-only overrides. Keyboard-disabled zoom no longer advertises or
  enters focus for keyboard semantics it does not implement.

  Interrupted motion removes exact stale exit nodes and presentation state while
  preserving live replacements. Composite motion inheritance retains authored
  path timing, including rolling-path policy.

  Axis tick labels now accept per-candidate font size, font weight, opacity,
  anchor, and x/y offset values. Accessors receive the semantic tick value,
  stable pre-thinning index, resolved position, and bandwidth; resolved
  presentation participates in thinning, automatic margins, facets, and motion.

### Patch Changes

- [#58](https://github.com/TanStack/charts/pull/58) [`4134429`](https://github.com/TanStack/charts/commit/4134429b49973cf64df1f36123ba8392571562eb) - Add validated rolling path transforms with dynamic y-domain reprojection,
  continuous translated viewports with stationary guides, and a controlled focus
  controller that follows presentation geometry. Default SVG rendering now
  honors scene clips and gradients.

## 0.6.5

### Patch Changes

- [#59](https://github.com/TanStack/charts/pull/59) [`11ba458`](https://github.com/TanStack/charts/commit/11ba4584e6aee639a58e353b5c828b2f3d207f62) - Publish the complete 109-case conformance catalog as per-case React components
  that render their complete SVG during SSR. Catalog data parsing is compatible
  with runtimes that prohibit string code generation, case-local D3 imports are
  declared runtime dependencies, and bundled datasets include source and license
  notices.

  Add `focus: false` for charts that should omit generated focus geometry and
  native focus work. Responsive definitions now retain outer definition options,
  and catalog descriptors and custom views respond to measured width changes
  after SSR. `d3-scale` is declared as a core runtime dependency.

  Catalog components accept the same responsive `aspectRatio` sizing contract as
  React Charts while retaining deterministic initial dimensions for SSR.
  React chart hosts serialize proportional CSS sizing as a unitless value.
  Legend-heavy preview definitions now dedicate their compact layout to the plot.

## 0.6.4

### Patch Changes

- [#51](https://github.com/TanStack/charts/pull/51) [`3fdff48`](https://github.com/TanStack/charts/commit/3fdff48a76e4f7ff563bc2c0b182c7cb563b5a95) - Accept configured D3 scale instances for union-valued axes.

## 0.6.3

### Patch Changes

- [#49](https://github.com/TanStack/charts/pull/49) [`e4b5249`](https://github.com/TanStack/charts/commit/e4b5249ceca9910d990aefc9f8777a8d28e63921) - Keep the built-in primary focus ring when authored focus marks are present, and
  add `focusRing: false` for charts that replace the indicator explicitly.

## 0.6.2

### Patch Changes

- [#47](https://github.com/TanStack/charts/pull/47) [`0eeec7d`](https://github.com/TanStack/charts/commit/0eeec7dbe62d362839820b953a731ae0596206ee) - Clarify that each chart host has one animation owner: the default SVG renderer
  uses `animate`, while `motion()` ignores it and uses definition-level motion
  declarations.

## 0.6.1

### Patch Changes

- [#44](https://github.com/TanStack/charts/pull/44) [`24e65e7`](https://github.com/TanStack/charts/commit/24e65e743ff2897a78f726c3f07d8a5819bb4c7d) - Correct SVG pointer hit testing when the rendered viewport and chart scene use
  different aspect ratios.

## 0.6.0

### Minor Changes

- [#41](https://github.com/TanStack/charts/pull/41) [`515da25`](https://github.com/TanStack/charts/commit/515da25d87b2c2eb4ded774ce45e4050e03bf5e7) - Add the optional `motion()` SVG renderer with tween and physical spring
  transitions, definition-local chart, mark, datum, guide, and focus timing,
  retained interruption velocity, reduced-motion handling, and aligned
  presentation geometry. Add the standalone `createChartSpring` sampler.

## 0.5.1

### Patch Changes

- [#29](https://github.com/TanStack/charts/pull/29) [`681df8e`](https://github.com/TanStack/charts/commit/681df8eb8a39fdfc68452beb04b3f754d0fa98a8) - Resolve default pointer focus against painted mark geometry before applying a
  mark's natural x, y, or two-dimensional fallback. Interaction metadata now
  lives on the resolved scene primitive, so built-in and custom marks share the
  same rectangle, circle, polygon, line, or area geometry used by renderers after
  layout, facets, transforms, clipping, and inline state resolution.

  Facet-local default markers now stay bound to the primary point even when
  another panel has identical channel values; explicit x/y focus marks remain the
  opt-in synchronized-cursor path. Animated bar inset states also preserve the
  quantitative axis and baseline while changing only categorical width or height.

## 0.5.0

## 0.4.0

### Minor Changes

- [#30](https://github.com/TanStack/charts/pull/30) [`d563eba`](https://github.com/TanStack/charts/commit/d563eba5d295dc3ddf60eecd2d8a9bd418aaf635) - Order grouped tooltip rows by rendered mark position by default: top-to-bottom
  for x groups and left-to-right for y groups. Add `visual` as an explicit sort
  policy while preserving color-domain, focus, and custom comparator ordering.

## 0.3.1

### Patch Changes

- [#25](https://github.com/TanStack/charts/pull/25) [`c422a2c`](https://github.com/TanStack/charts/commit/c422a2ce45799d4edd63fdbde7ecb31daa3dae31) - Remove incidental `d3-array` usage from nearest-point lookup, quantile legend
  thresholds, and compact numeric ticks. These paths now use package-owned
  implementations with D3 parity coverage, and compact scales no longer have a
  production D3 dependency.

  Numeric-bin and stack transforms, polar and curve features, and geo features
  continue to own their tree-shakable `d3-array`, `d3-shape`, or `d3-geo`
  implementations as normal dependencies. No peer dependency, caller-supplied
  capability, or public API migration is required.

## 0.3.0

### Minor Changes

- [#15](https://github.com/TanStack/charts/pull/15) [`d9404fa`](https://github.com/TanStack/charts/commit/d9404fa6143cc199b0e224658dfac45e0a10deb7) - Replace the flat axis guide options with composable axis, grid, tick, and
  responsive label configuration. Add shared focus-layer marks, animated inline
  mark states, coordinate-based tooltip anchoring, and unified stack/group
  layouts with inferred stacking.
  Add data-first group, numeric/calendar/two-dimensional bin, window, cumulative,
  rank, normalize, select, and row-stack transforms. Results use named group
  fields, flat row extension, explicit reducers and ordering, source lineage,
  object-bag callbacks, ordinary-function escape hatches, and granular entry
  points.

- [#16](https://github.com/TanStack/charts/pull/16) [`1cb4167`](https://github.com/TanStack/charts/commit/1cb41675e5bf443f255d66d23b455188cecf9b1f) - Allow `link` marks to resolve stroke width and opacity per datum and configure
  their line caps. This supports proportional D3 Sankey links through native mark
  composition instead of a custom scene renderer.

## 0.2.0

### Minor Changes

- [#20](https://github.com/TanStack/charts/pull/20) [`4a8a256`](https://github.com/TanStack/charts/commit/4a8a256c8f0e8c6149b8710ceb1a8acb72779158) - Rename the environment-safe `/portable` entry from `0.1.0` to `/universal`.
  Replace `@tanstack/charts/portable` imports with `@tanstack/charts/universal`.
  The `/types` entry and browser-oriented root exports remain unchanged. The
  universal type surface now includes generic tooltip-extension token contracts
  for non-DOM hosts.

## 0.1.0

### Minor Changes

- [#8](https://github.com/TanStack/charts/pull/8) [`5d143d9`](https://github.com/TanStack/charts/commit/5d143d9c9ed7c2613f3e1b50a9d794ea3c9616b9) - Add environment-safe `/portable` and `/types` entry points while preserving
  the existing browser-oriented root exports.

- Make native tooltips and tooltip portals explicit extensions. Import `tooltip`
  from `@tanstack/charts/tooltip`; replace `tooltip: true` with `tooltip`, dynamic
  booleans with `enabled ? tooltip : false`, and configured objects with
  `{ use: tooltip, ...options }`. Complete definition values use
  `ChartTooltipInput`; `ChartTooltipOptions` remains the options-only type.

  Import `portal` from `@tanstack/charts/tooltip/portal`; replace `portal: true`
  with `portal`, omit `portal: false`, and replace dynamic booleans with
  `enabled ? portal : undefined` inside the configured tooltip object.

## 0.0.2

### Patch Changes

- [#12](https://github.com/TanStack/charts/pull/12) [`5c36a38`](https://github.com/TanStack/charts/commit/5c36a3866d71ad94cbcc934272e2cd7a868065f3) - Keep long Cartesian axis titles contained on compact charts.
