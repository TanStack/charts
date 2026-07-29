---
title: Polar and Radar Charts
description: Build D3-backed pie, donut, gauge, radar, line, scatter, radial bar, rose, and sunburst charts through the opt-in polar coordinate entry.
---

Polar geometry is available only from `@tanstack/charts/polar`. The container
owns responsive center, angle, and radius ranges; granular D3 modules still
own pie layout, configured scales, and curve factories.

```ts
import {
  angleGrid,
  polar,
  radialArc,
  radialArea,
  radialDot,
  radialGrid,
  radialLine,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
```

The package root stays Cartesian-sized when this subpath is not imported.

## Pie and donut

Use `d3-shape`'s `pie` transform to turn totals into angular intervals.
`radialArc` renders the intervals. A zero inner radius is a pie; a responsive
nonzero inner radius is a donut.

<!-- docs-example: polar-pie-donut typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'

interface Part {
  id: string
  value: number
  fill: string
}

const parts: Part[] = [
  { id: 'ingest', value: 42, fill: '#2563eb' },
  { id: 'query', value: 28, fill: '#7c3aed' },
  { id: 'alerts', value: 18, fill: '#db2777' },
  { id: 'other', value: 12, fill: '#f59e0b' },
]

const slices = pie<Part>()
  .sort(null)
  .value((part) => part.value)(parts)

function ring(innerRatio: number) {
  return polar({
    inset: 8,
    radiusRatio: 0.82,
    marks: [
      radialArc(slices, {
        key: (slice) => slice.data.id,
        startAngle: 'startAngle',
        endAngle: 'endAngle',
        padAngle: 'padAngle',
        innerRadius: ({ radius }) => radius * innerRatio,
        cornerRadius: 4,
        fill: (slice) => slice.data.fill,
      }),
    ],
  })
}

const pieChart = defineChart({
  marks: [ring(0)],
  guides: false,
  x: null,
  y: null,
})

const donutChart = defineChart({
  marks: [ring(0.58)],
  guides: false,
  x: null,
  y: null,
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/76-pie/?theme=system&height=420"
  title="Categorical pie chart built from D3 pie intervals and TanStack radial arcs"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/77-donut/?theme=system&height=420"
  title="Responsive donut chart built from D3 pie intervals and TanStack radial arcs"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

The same primitives cover labels, center content, padding, rounded corners,
and concentric rings:

<iframe
  src="https://tanstack.com/charts/catalog/embed/93-labeled-pie/?theme=system&height=380"
  title="Pie chart with native radial labels and leader rules"
  loading="lazy"
  width="100%"
  height="380"
  style="width:100%;height:380px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/94-center-donut/?theme=system&height=380"
  title="Donut chart with native center value"
  loading="lazy"
  width="100%"
  height="380"
  style="width:100%;height:380px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/95-rounded-donut/?theme=system&height=380"
  title="Rounded donut chart with padded arcs"
  loading="lazy"
  width="100%"
  height="380"
  style="width:100%;height:380px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/96-nested-donut/?theme=system&height=400"
  title="Nested concentric donut chart"
  loading="lazy"
  width="100%"
  height="400"
  style="width:100%;height:400px;border:0;"
></iframe>

Keep `pie().sort(null)` when source order is semantic. Stable arc keys must
come from the original row, not the generated slice index.

## Partial-circle gauge

A gauge is the same composition over a restricted D3 pie interval. It is not
a separate geometry implementation.

<!-- docs-example: polar-partial-gauge typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'

const value = 72
const gaugeParts = [
  { id: 'value', value, fill: '#ef4444' },
  { id: 'remainder', value: 100 - value, fill: '#e2e8f0' },
]
const gaugeSlices = pie<(typeof gaugeParts)[number]>()
  .sort(null)
  .value((part) => part.value)
  .startAngle(-Math.PI * 0.75)
  .endAngle(Math.PI * 0.75)(gaugeParts)

const gauge = defineChart({
  marks: [
    polar({
      radiusRatio: 0.84,
      marks: [
        radialArc(gaugeSlices, {
          key: (slice) => slice.data.id,
          startAngle: 'startAngle',
          endAngle: 'endAngle',
          innerRadius: ({ radius }) => radius * 0.72,
          cornerRadius: 999,
          fill: (slice) => slice.data.fill,
        }),
      ],
    }),
  ],
  guides: false,
  x: null,
  y: null,
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/78-gauge/?theme=system&height=420"
  title="Partial-circle gauge composed from D3 pie intervals and TanStack radial arcs"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/98-needle-gauge/?theme=system&height=420"
  title="Threshold gauge with radial ticks, needle, hub, and value label"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

Bound the input before layout and expose the exact value outside the arc. Arc
length is useful for a compact status summary, not fine comparison.

## Radar profile

Radar combines configured angle and radius scales with polar guides and radial
marks. TanStack copies both scales and supplies responsive ranges; the source
scales keep their semantic domains.

<!-- docs-example: polar-radar typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialArea,
  radialDot,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'

const metrics = [
  'Latency',
  'Errors',
  'Traffic',
  'Saturation',
  'Availability',
] as const
const profile = metrics.map((metric, index) => ({
  metric,
  score: [74, 46, 88, 61, 93][index] ?? 0,
}))

const radar = defineChart({
  marks: [
    polar({
      radiusRatio: 0.72,
      angle: { scale: scaleBand<string>().domain(metrics) },
      radius: { scale: scaleLinear().domain([0, 100]).nice(4) },
      guides: [
        radialGrid({ ticks: 4, shape: 'polygon', labels: false }),
        angleGrid({
          labels: true,
          labelDx: ({ x }) => (x < -1 ? -3 : x > 1 ? 3 : 0),
          labelDy: ({ y }) => (y < -1 ? -2 : y > 1 ? 2 : 0),
        }),
      ],
      marks: [
        radialArea(profile, {
          angle: 'metric',
          radius: 'score',
          curve: curveLinearClosed,
          fill: '#7c3aed',
          fillOpacity: 0.22,
        }),
        radialLine(profile, {
          angle: 'metric',
          radius: 'score',
          curve: curveLinearClosed,
          stroke: '#8b5cf6',
          strokeWidth: 2,
        }),
        radialDot(profile, {
          angle: 'metric',
          radius: 'score',
          key: 'metric',
          r: 3,
          fill: '#8b5cf6',
        }),
      ],
    }),
  ],
  guides: false,
  x: null,
  y: null,
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/75-radar/?theme=system&height=440"
  title="Radar profile with polygon rings, spokes, labels, area, line, and points built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="440"
  style="width:100%;height:440px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/99-comparative-radar/?theme=system&height=440"
  title="Comparative radar chart with two native radial series"
  loading="lazy"
  width="100%"
  height="440"
  style="width:100%;height:440px;border:0;"
></iframe>

Use radar for a small, fixed set of compatible dimensions. Keep every domain
and direction explicit, and do not rank profiles by apparent filled area.

## Numeric polar line and scatter

Continuous D3 scales map numeric angle and radius values without changing the
mark API. Repeat the first row at the angular endpoint when a line should close;
independent scatter observations need no seam row.

<!-- docs-example: polar-line-scatter typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialDot,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'

const trajectory = [
  { id: '0', angle: 0, radius: 52 },
  { id: '90', angle: 90, radius: 76 },
  { id: '180', angle: 180, radius: 43 },
  { id: '270', angle: 270, radius: 68 },
  { id: '360', angle: 360, radius: 52 },
]
const observations = [
  { id: 'a', angle: 34, radius: 61 },
  { id: 'b', angle: 142, radius: 82 },
  { id: 'c', angle: 248, radius: 47 },
]

const numericPolar = defineChart({
  marks: [
    polar({
      angle: { scale: scaleLinear().domain([0, 360]) },
      radius: { scale: scaleLinear().domain([0, 100]) },
      guides: [
        radialGrid({ values: [25, 50, 75, 100] }),
        angleGrid({ values: [0, 90, 180, 270], labels: false }),
      ],
      marks: [
        radialLine(trajectory, {
          angle: 'angle',
          radius: 'radius',
          key: 'id',
          stroke: '#0f766e',
        }),
        radialDot(observations, {
          angle: 'angle',
          radius: 'radius',
          key: 'id',
          r: 4.5,
          fill: '#e11d48',
        }),
      ],
    }),
  ],
  guides: false,
  x: null,
  y: null,
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/106-polar-line/?theme=system&height=420"
  title="Continuous numeric polar line chart"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/107-polar-scatter/?theme=system&height=420"
  title="Continuous numeric polar scatter chart"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

## Radial magnitude and hierarchy

`radialArc.generator` accepts responsive D3 arc accessors, so variable-radius
sectors, concentric radial bars, and hierarchy rings remain one primitive.

<iframe
  src="https://tanstack.com/charts/catalog/embed/97-rose/?theme=system&height=420"
  title="Polar area rose chart with equal angles and variable radii"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/100-radial-bars/?theme=system&height=420"
  title="Concentric radial bar chart"
  loading="lazy"
  width="100%"
  height="420"
  style="width:100%;height:420px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/101-sunburst/?theme=system&height=440"
  title="D3 hierarchy sunburst rendered with native radial arcs"
  loading="lazy"
  width="100%"
  height="440"
  style="width:100%;height:440px;border:0;"
></iframe>

## Coordinate and bundle boundary

`polar()` is a positionless container mark. It resolves one center and radius,
copies configured angle/radius scales, paints guide backgrounds, child marks,
then guide foreground labels, and emits ordinary scene nodes and focus points.
The outer chart therefore uses `x: null`, `y: null`, and `guides: false`.

The polar entry uses D3 arc and radial path generators internally. Application
source imports `pie`, configured scales, and curve factories directly from
`d3-shape` or `d3-scale`. See
[Polar Marks](../reference/marks/polar.md) for the complete API and
[Bundle Size and Performance](../guides/bundle-size-and-performance.md) for
the isolated consumer budgets.

## Production checks

- Keep angle for cyclic order or part-to-whole intervals.
- Use D3 pie output rather than reimplementing angle accumulation.
- Give every mutable arc and point a stable source key.
- Preserve original values for tooltips and accessible summaries.
- Keep radar dimension domains, directions, and units explicit.
- Verify labels around the full circumference at narrow widths.
- Prefer aligned bars or dots when precise comparison is the primary task.
