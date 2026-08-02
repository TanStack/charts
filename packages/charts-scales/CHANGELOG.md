# @tanstack/charts-scales

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
