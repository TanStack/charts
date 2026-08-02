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
import { mountCanvasChart } from '@tanstack/charts/canvas'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { createChartSpring } from '@tanstack/charts/spring'
import { renderChartImage } from '@tanstack/charts/export'
import { focusX } from '@tanstack/charts/focus'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from '@tanstack/charts-scales/linear'
import { groupBy } from '@tanstack/charts/transform/group'
import { window } from '@tanstack/charts/transform/window'
```

Canvas is opt-in. The default core and every default framework entry remain
SVG-based. Canvas enters the module graph only through
`@tanstack/charts/canvas`, `@tanstack/react-charts/canvas`, or
`@tanstack/octane-charts/canvas`. The React and Octane `/core` entries accept
an application-supplied renderer without importing Canvas.

Non-cartesian geometry is subpath-only:

```ts
import { polar, radialArc } from '@tanstack/charts/polar'
import { geoShape } from '@tanstack/charts/geo'
```

The root entry does not re-export those capabilities. Polar brings in its
`d3-shape` geometry only when the polar subpath is imported; geography does
the same for `d3-geo`. Import `pie`, configured scales, projections, and curve
factories from their granular D3 modules as the chart requires them. Political
boundary data and `topojson-client` remain application dependencies; importing
`geoShape` does not bundle an atlas.

Tween and spring SVG motion is one optional renderer entry. Importing
`@tanstack/charts/motion` includes both transition models, retained geometry,
and the SVG reconciler. There is no separate tween-only adapter. The scalar
physics sampler remains available independently from `@tanstack/charts/spring`.
Core definitions can contain inert `motion` policy without importing either
runtime.

Your bundler must honor ESM exports and tree shaking. Avoid namespace imports
when a named or subpath import communicates the real dependency.

Tooltip rendering is also opt-in. A definition imports `tooltip`; viewport
layering additionally imports `portal` and nests it under the tooltip options:

```ts
const interactive = defineChart(definition, {
  tooltip: {
    use: tooltip,
    portal,
  },
})
```

The locked compact React line consumer must remain at or below 18.6 KiB gzip.
Its retained-module gate rejects tooltip, portal, `d3-scale`, `d3-format`,
`d3-interpolate`, `d3-color`, transforms, and sibling compact-scale entries.
Separate incremental gates limit tooltip and portal growth.

Transforms are root exports for convenience, but their granular subpaths are
the smallest contract for reusable preparation code. Ordinary line, compact-
scale, and tooltip-only bundle fixtures reject every transform module. Each
transform family has its own gzip ceiling and rejects unrelated families.
Numeric and 2D bins intentionally use `d3-array`; row stacking uses `d3-shape`;
grouping, calendar bins, windows, cumulative values, ranks, normalization,
selection, and advanced reducers do not retain either dependency.

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

The [library comparison](../comparison.md) publishes the current pinned
four-chart, three-tier bundle snapshot and its limits.

The repository's bundle gates use isolated entries so adding a complex mark
cannot silently increase the smallest chart. Polar has separate arc-only and
D3-pie consumer ceilings plus a complete scale-backed line/scatter ceiling;
geography has its own projected-shape ceiling. The ordinary line,
representative-mark, DOM, and framework entries remain exact byte locks.

## Separate preparation, scene, and paint

Measure three layers independently:

1. Data preparation: sorting, grouping, binning, stacking, or layout.
2. Scene build: channels, scales, guides, marks, and focus points.
3. Surface paint: SVG serialization and keyed reconciliation, or Canvas draw
   calls, plus optional animation.

This separation reveals whether an expensive chart needs a better encoding, a
framework-memoized transform, fewer scene nodes, or a different renderer.

## Choose a sane representation

The fastest way to render too much data is to avoid rendering it:

- bin dense distributions;
- aggregate repeated categories;
- use an envelope or sampled line when individual points are not readable;
- restrict a time chart to a controlled visible window;
- use facets only when each panel remains interpretable;
- virtualize application chrome and lanes when only a subset is visible.

Every visible SVG node carries DOM and paint cost. Canvas removes the
per-element DOM cost, but not scene construction, draw work, interaction-point
memory, or visual overplotting. More marks are justified only when they
communicate more information.

See [Large Data](./large-data.md) for representation thresholds and
interaction policies.

## Update efficiently

- Keep fixed definitions at module scope.
- Memoize captured-data definitions until their application values change.
- Reuse derived data references when source data is unchanged.
- Let marks infer identity from IDs or unique positions; supply `key` only when
  that identity is unavailable or can change.
- Memoize expensive derived data in the application.
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
