---
title: Bundle Size and Performance
description: Keep each chart proportional to the marks, scales, host capabilities, and data representation it actually uses.
---

TanStack Charts is split around capability boundaries. A chart should pay for
its marks and the specific analytical or spatial primitives it imports, not a
universal chart catalog.

## Import the narrow path

The package root is the ergonomic path for ordinary charts:

```ts
import { defineChart, lineY } from '@tanstack/charts'
```

The same package provides exact scale subpaths for common numeric and
categorical mappings:

```sh
pnpm add @tanstack/charts
```

```ts
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { scalePoint } from '@tanstack/charts/scales/point'
```

There is no aggregate `/scales` export. Each exact entry retains only its
family and has no production D3 dependency.

Capability subpaths make optional boundaries explicit:

```ts
import { mountChart } from '@tanstack/charts/dom'
import { mountCanvasChart } from '@tanstack/charts/canvas'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { createChartSpring } from '@tanstack/charts/spring'
import { renderChartImage } from '@tanstack/charts/export'
import { focusGroupX } from '@tanstack/charts/focus'
import { focusGuideX } from '@tanstack/charts/focus/guide'
import { brushX } from '@tanstack/charts/interaction/brush'
import { continuousCursor } from '@tanstack/charts/interaction/cursor'
import { handleX } from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { zoomX } from '@tanstack/charts/interaction/zoom'
import { interactiveColorLegend } from '@tanstack/charts/legend'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { groupBy } from '@tanstack/charts/transform/group'
import { rollingWindow } from '@tanstack/charts/transform/rolling-window'
```

Canvas is opt-in. The default core and every default framework entry remain
SVG-based. Canvas enters the module graph only through
`@tanstack/charts/canvas`, `@tanstack/charts/react/canvas`, or
`@tanstack/charts/octane/canvas`. The React and Octane `/core` entries accept
an application-supplied renderer without importing Canvas.

Non-cartesian geometry is subpath-only:

```ts
import { pie, polar, radialArc, radialBarRadius } from '@tanstack/charts/polar'
import { geoShape } from '@tanstack/charts/geo'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'
```

The root entry does not re-export those capabilities. Polar brings in its
`d3-shape` geometry only when the polar subpath is imported; geography does
the same for `d3-geo`. The exact sunburst entry adds its `d3-hierarchy`
partition only when imported and reuses the sector geometry shared by ordinary
polar marks. It does not add hierarchy or sunburst code to ordinary polar
charts. Polar value allocation comes from its native `pie` transform.
The exact Sankey entry adds `d3-sankey` and resolved child-mark composition
only to Sankey consumers; it does not change root, universal, static force, or
ordinary link bundles.
Import configured scales, projections, and curve factories from their granular
D3 modules as the chart requires them. Political boundary data and
`topojson-client` remain application dependencies; importing `geoShape` does
not bundle an atlas.

Tween and spring SVG motion is one optional renderer entry. Importing
`@tanstack/charts/motion` includes both transition models, retained geometry,
and the SVG reconciler. There is no separate tween-only adapter. The scalar
physics sampler remains available independently from `@tanstack/charts/spring`.
Core definitions can contain inert `motion` policy without importing either
runtime.

Focus guides are also exact-subpath marks. Importing
`@tanstack/charts/focus/guide` adds renderer-neutral candidate and label
construction, but no DOM host, tooltip, motion runtime, spring solver, React,
or D3 geometry package.

The controlled-signal snapshot is 0.09 KiB gzip in isolation. The interactive
categorical legend, including native DOM controls, adds 2.55 KiB gzip over the
ordinary DOM host. Neither implementation enters root or universal consumers.

Controlled keyed selection is also exact-subpath-only. Its semantic-key
controller and post-domain mark filter enter through
`@tanstack/charts/selection`; `whenSelected` reuses the ordinary authored mark
instead of importing another geometry or renderer implementation. The root and
universal value entries do not re-export the selection implementation.

The continuous cursor is exact-subpath-only through
`@tanstack/charts/interaction/cursor`. It reuses the controlled signal, scale
interaction axis, and renderer-neutral guide-node kernel without importing the
datum focus guide, tooltip, brush, or a D3 package. Its incremental DOM-host
fixture adds 3.75 KiB gzip under a 5 KiB cap.

The horizontal scale handle is exact-subpath-only through
`@tanstack/charts/interaction/handle`. It reuses the controlled signal,
candidate interaction axis, and value-cloning range kernel without importing
cursor, brush, zoom, guide, or D3 code. Its incremental DOM-host fixture adds
3.65 KiB gzip under a 5 KiB cap.

Horizontal brushing is exact-subpath-only through
`@tanstack/charts/interaction/brush`. It includes the one-dimensional
scale/snap kernel, DOM host control, `d3-brush`, and `d3-selection` only for a
consumer that imports it. Root, universal, ordinary DOM, legend, and selection
consumers retain none of those modules.

Horizontal zoom is exact-subpath-only through
`@tanstack/charts/interaction/zoom`. It includes the controlled semantic-window
behavior, final-scale interaction axis, DOM host control, `d3-zoom`, and
`d3-selection` only for a consumer that imports it. Root, universal, ordinary
DOM, brush, cursor, legend, and selection consumers retain none of those
modules. Its incremental DOM-host fixture adds 20.28 KiB gzip under a 20.35 KiB
cap.

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

The locked compact React line consumer must remain at or below 26.6 KiB gzip.
Its retained-module gate rejects tooltip, portal, `d3-scale`, `d3-format`,
`d3-interpolate`, `d3-color`, transforms, and sibling compact-scale entries.
Separate incremental gates limit tooltip and portal growth.

The current locked fixtures measure the compact line scene at 10,526 gzip bytes
versus 17,646 with D3 linear scales. The equivalent React consumers measure
27,114 and 34,171 gzip bytes with React and React DOM external. These are
fixture measurements, not universal savings claims; they show why the compact
subset is the normal starting point.

Transforms are root exports for convenience, but their granular subpaths are
the smallest contract for reusable preparation code. Ordinary line, compact-
scale, and tooltip-only bundle fixtures reject every transform module. Each
transform family has its own gzip ceiling and rejects unrelated families.
Numeric and 2D bins intentionally use `d3-array`; row stacking uses `d3-shape`;
grouping, calendar bins, windows, cumulative values, ranks, normalization,
selection, and advanced reducers do not retain either dependency.

## Add D3 by capability

Start with compact scales, then import a granular D3 module when its full
semantics fit the chart. Typical upgrade triggers are continuous time or UTC,
logarithmic and other transformed scales, piecewise or nonnumeric
interpolation, continuous color, curves, specialized transforms, and spatial
indexes.

The upgrade is per scale. A calendar x axis can use D3 while its numeric y axis
stays compact:

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleUtc } from 'd3-scale'

const x = { scale: scaleUtc, nice: true }
const y = { scale: scaleLinear, nice: true }
```

Declare `d3-scale` and `@types/d3-scale` directly when application source uses
that import. A stacked area may add `d3-shape`; a large nearest-point
interaction may add a spatial index. Do not install the `d3` umbrella for one
capability.

The canonical dependency map and official references live in
[Scales](../concepts/scales-and-d3.md).

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
cannot silently increase the smallest chart. Polar has separate arc-only, pie
allocation, radial-label, radial-bar, gauge, and scale-backed line/scatter
ceilings; sunburst has an incremental ceiling over the equivalent D3 partition
kernel; geography has its own projected-shape ceiling. The ordinary line,
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
