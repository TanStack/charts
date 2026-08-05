# @tanstack/charts

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
