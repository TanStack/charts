# @tanstack/charts

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
