# @tanstack/charts-scales

## 0.1.0

### Minor Changes

- Add compact callable linear, band, point, and ordinal scales through the exact
  `@tanstack/charts-scales/linear`, `/band`, `/point`, and `/ordinal` entries.
  There is no package root export. Compact linear scales are numeric and two-stop;
  use `d3-scale` for time, transformed, piecewise, nonnumeric, locale-aware, and
  other full D3 behavior. Unsupported D3 behavior does not warn or fall back at
  runtime.
