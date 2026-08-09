# @tanstack/charts-scales

## 0.9.0

### Patch Changes

- [#76](https://github.com/TanStack/charts/pull/76) [`667dd4c`](https://github.com/TanStack/charts/commit/667dd4cd5e7949b9dfac864f416d1686395d6dc7) - Install `@tanstack/charts` once and import compact scales and framework adapters
  from exact package subpaths. Existing package names remain supported for
  compatibility.

## 0.8.0

### Minor Changes

- [#73](https://github.com/TanStack/charts/pull/73) [`35832f7`](https://github.com/TanStack/charts/commit/35832f753fd0e17b5215c76529dd7e4bbc222282) - Harmonize the pre-alpha public API: tighten compact scales, rename responsive,
  control, focus, color, SVG animation, export, reducer, and rolling-window
  contracts, standardize transform callbacks, type composable views and
  host-owned tooltip tokens, share DOM/native interaction policy, and add one
  platform-default runtime theme. DOM and React Native definitions now reject
  cross-host tooltip tokens, while synchronous text measurement receives the
  complete host typography and font scale. Every DOM adapter now exposes the
  host-refined definition type at its chart boundary.

## 0.7.2

## 0.7.1

## 0.7.0

## 0.6.5

## 0.6.4

## 0.6.3

## 0.6.2

## 0.6.1

## 0.6.0

## 0.5.1

## 0.5.0

## 0.4.0

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

## 0.2.0

## 0.1.0

### Minor Changes

- Add compact callable linear, band, point, and ordinal scales through the exact
  `@tanstack/charts-scales/linear`, `/band`, `/point`, and `/ordinal` entries.
  There is no package root export. Compact linear scales are numeric and two-stop;
  use `d3-scale` for time, transformed, piecewise, nonnumeric, locale-aware, and
  other full D3 behavior. Unsupported D3 behavior does not warn or fall back at
  runtime.
