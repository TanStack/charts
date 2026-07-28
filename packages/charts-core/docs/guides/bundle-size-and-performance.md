---
title: Bundle Size and Performance
description: Keep each chart proportional to the marks, D3 modules, host capabilities, and data representation it actually uses.
---

TanStack Charts is split around capability boundaries. A chart should pay for
its marks and the specific analytical or spatial primitives it imports, not a
universal chart catalog.

## Import the narrow path

The package root is the ergonomic path for ordinary charts:

```ts
import { defineChart, lineY } from '@tanstack/charts'
```

Capability subpaths make optional boundaries explicit:

```ts
import { mountChart } from '@tanstack/charts/dom'
import { renderChartImage } from '@tanstack/charts/export'
import { focusX } from '@tanstack/charts/focus'
import { d3Curve } from '@tanstack/charts/d3/shape'
```

Your bundler must honor ESM exports and tree shaking. Avoid namespace imports
when a named or subpath import communicates the real dependency.

## Import D3 by capability

TanStack Charts does not bundle a hidden analytical runtime. Import only the D3
modules that own the scale, shape, transform, or spatial behavior a chart
needs. A basic bar chart can use `d3-scale`; a stacked area may add
`d3-shape`; a large nearest-point interaction may add a spatial index.

The canonical dependency map and official references live in
[Scales and D3](../concepts/scales-and-d3.md).

## Measure the complete feature

Compare production bundles that render the same behavior:

- the same chart family and curve;
- the same number and kind of guides;
- the same tooltip and keyboard behavior;
- the same framework adapter;
- the same data preparation;
- the same export or spatial capability, when used.

Report raw, gzip, and Brotli sizes. Record the package manager lockfile,
bundler, minifier, target, and entry source. A root package tarball size or an
unminified source count is not a user bundle measurement.

The repository's bundle gates use isolated entries so adding a complex mark
cannot silently increase the smallest chart.

## Separate preparation, scene, and paint

Measure three layers independently:

1. Data preparation: sorting, grouping, binning, stacking, or layout.
2. Scene build: channels, scales, guides, marks, and focus points.
3. DOM paint: SVG serialization, keyed reconciliation, and optional animation.

This separation reveals whether an expensive chart needs a better encoding, a
cached transform, fewer scene nodes, or a different renderer.

`prepareEqual` can prevent repeat analytical work while still rebuilding a
responsive or restyled scene. See
[Dynamic Data and Animation](./dynamic-data-and-animation.md).

## Choose a sane representation

The fastest way to render too much data is to avoid rendering it:

- bin dense distributions;
- aggregate repeated categories;
- use an envelope or sampled line when individual points are not readable;
- restrict a time chart to a controlled visible window;
- use facets only when each panel remains interpretable;
- virtualize application chrome and lanes when only a subset is visible.

Every visible SVG node carries paint, memory, hit-testing, and accessibility
cost. More nodes are justified only when they communicate more information.

See [Large Data](./large-data.md) for representation thresholds and
interaction policies.

## Update efficiently

- Keep definitions at module scope.
- Reuse input references when data is unchanged.
- Give every mutable visual entity a stable key.
- Separate visual-only fields with `prepareEqual`.
- Bound streaming windows.
- Build a spatial index only when a measurement justifies it.
- Disable animation for high-frequency updates or reduced-motion users.

The host reconciles nodes by key and starts interrupted animation from the
currently painted geometry. Stable identity helps both correctness and
performance; it does not reduce the cost of an unnecessarily large scene.

## Performance acceptance

For each supported feature, keep a reproducible gate for:

- cold render time;
- warm update and reorder time;
- resize time;
- node count;
- interaction latency;
- retained heap after repeated mount/update/destroy;
- smallest relevant production bundle.

Compare at multiple data sizes and identify the first size where the
representation itself stops being sensible. Performance claims should name
the fixture and percentile, not imply one universal winner.

See [Testing and Debugging](./testing-and-debugging.md) for correctness gates
that must accompany performance results.
