---
title: Polar and Radar Charts
description: Build native pie, donut, gauge, radar, line, scatter, radial bar, rose, and sunburst charts through the opt-in polar coordinate entry.
---

Polar geometry is available only from `@tanstack/charts/polar`. The container
owns responsive center, angle, and radius ranges. Its eager `pie` transform
owns value allocation; granular D3 modules still own configured scales, curve
factories, and final arc/path geometry.

```ts
import {
  angleGrid,
  pie,
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

Use `pie` to turn totals into flat source-linked angular intervals.
`radialArc` renders the intervals. This example uses a responsive inner radius
for a donut; return `0` instead for a pie.

```ts group=polar-pie-donut env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { alphabet } from './data'

const slices = pie(alphabet, { value: 'frequency' })
const letters = alphabet.map((row) => row.letter)

export default defineChart({
  marks: [
    polar({
      inset: 8,
      radiusRatio: 0.82,
      marks: [
        radialArc(slices, {
          innerRadius: ({ radius }) => radius * 0.58,
          cornerRadius: 4,
          color: 'letter',
          key: 'letter',
        }),
      ],
    }),
  ],
  color: {
    domain: letters,
    range: ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316', '#94a3b8'],
  },
})
```

```ts group=polar-pie-donut file=/src/data.ts collapsed
export interface AlphabetRow {
  letter: string
  frequency: number
}

export const alphabet: readonly AlphabetRow[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
  { letter: 'Other', frequency: 0.55602 },
]
```

The same primitives cover labels, center content, padding, rounded corners,
and concentric rings. See the catalog examples for a
[labeled pie](https://tanstack.com/charts/catalog/93-labeled-pie/),
[center-content donut](https://tanstack.com/charts/catalog/94-center-donut/),
[rounded donut](https://tanstack.com/charts/catalog/95-rounded-donut/), and
[nested donut](https://tanstack.com/charts/catalog/96-nested-donut/).

Radial offsets are signed pixels applied after scale mapping. They do not
change the radius domain or reserve outer margin; leave space with
`radiusRatio`, `inset`, or chart margins.

Source order is the default. Use `orderBy` and `order` only for an explicit
angular sort. Stable arc keys must come from the original row, not the
generated slice index.

Each allocated row keeps the original fields plus direct `source` and
`sourceIndexes` lineage. Fixed allocation fields overwrite source fields with
the same names. `gapAngle` materializes direct empty space; the returned
`padAngle: 0` prevents `radialArc` from padding that interval again.

## Partial-circle gauge

A gauge is the same composition over a restricted pie interval. It is not a
separate geometry implementation.

```ts group=polar-partial-gauge env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc, radialText } from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const value = Math.max(0, Math.min(100, 72))
const reading = { id: 'complete', value } as const
const parts = [reading, { id: 'remaining', value: 100 - value }] as const
const slices = pie(parts, {
  value: 'value',
  startAngle: -Math.PI * 0.75,
  endAngle: Math.PI * 0.75,
})

export default defineChart({
  marks: [
    polar({
      radiusRatio: 0.84,
      angle: { scale: scaleLinear().domain([0, 1]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialArc(slices, {
          innerRadius: ({ radius }) => radius * 0.72,
          cornerRadius: 999,
          color: 'id',
          key: 'id',
        }),
        radialText([reading], {
          angle: 0,
          radius: 0,
          text: (row) => `${row.value}%`,
          key: 'id',
          fill: 'currentColor',
          fontSize: 20,
          fontWeight: 700,
        }),
      ],
    }),
  ],
  color: {
    domain: ['complete', 'remaining'],
    range: ['#ef4444', '#e2e8f0'],
  },
})
```

Bound the input before layout and expose the exact value outside the arc. Arc
length is useful for a compact status summary, not fine comparison. Add ticks,
a needle, and a center label only when they carry meaning; see the
[needle gauge](https://tanstack.com/charts/catalog/98-needle-gauge/) for that
composition.

## Radar profile

Radar combines an inferred angle factory and a fixed radius instance with
polar guides and radial marks. TanStack supplies both responsive ranges. The
normalization remains visible in a separate source file because it determines
the meaning of every radius.

```ts group=polar-radar env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialArea,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { curveLinearClosed } from 'd3-shape'
import { events } from './data'
import { profile } from './normalize'

export default defineChart({
  marks: [
    polar({
      radiusRatio: 0.72,
      angle: { scale: scalePoint<string>().domain(events), wrap: true },
      radius: { scale: scaleLinear().domain([0, 1]) },
      guides: [
        radialGrid({
          values: [0.25, 0.5, 0.75, 1],
          shape: 'polygon',
        }),
        angleGrid({ labels: true }),
      ],
      marks: [
        radialArea(profile, {
          angle: 'event',
          radius: 'relativePerformance',
          curve: curveLinearClosed,
          fill: '#7c3aed',
          fillOpacity: 0.22,
        }),
        radialLine(profile, {
          angle: 'event',
          radius: 'relativePerformance',
          curve: curveLinearClosed,
          stroke: '#8b5cf6',
          strokeWidth: 2,
        }),
      ],
    }),
  ],
})
```

```ts group=polar-radar file=/src/data.ts collapsed
export interface DecathlonRow {
  Country: string
  '100 Meters': number
  'Long Jump': number
  'High Jump': number
  '100 Meter Hurdles': number
}

export const decathlon: readonly DecathlonRow[] = [
  {
    Country: 'United States',
    '100 Meters': 10.35,
    'Long Jump': 7.96,
    'High Jump': 2.05,
    '100 Meter Hurdles': 13.61,
  },
  {
    Country: 'Great Britain',
    '100 Meters': 10.44,
    'Long Jump': 7.74,
    'High Jump': 2.11,
    '100 Meter Hurdles': 13.75,
  },
  {
    Country: 'Germany',
    '100 Meters': 10.67,
    'Long Jump': 7.62,
    'High Jump': 2.08,
    '100 Meter Hurdles': 14.02,
  },
  {
    Country: 'France',
    '100 Meters': 10.58,
    'Long Jump': 7.81,
    'High Jump': 1.99,
    '100 Meter Hurdles': 13.88,
  },
]

export const events = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const

export type RadarEvent = (typeof events)[number]
```

```ts group=polar-radar file=/src/normalize.ts collapsed
import { normalize, select } from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'
import { decathlon, events } from './data'
import type { RadarEvent } from './data'

const timedEvents = new Set<RadarEvent>(['100 Meters', '100 Meter Hurdles'])
const folded = fold(decathlon, {
  fields: events,
  as: { key: 'event', value: 'result' },
})
const normalized = normalize(folded, {
  by: 'event',
  value: (datum) =>
    timedEvents.has(datum.event) ? -datum.result : datum.result,
  basis: 'extent',
  as: 'relativePerformance',
})

export const profile = select(normalized, {
  by: 'event',
  select: 'first',
})
```

Use radar for a small, fixed set of compatible dimensions. Keep every domain
and direction explicit, and do not rank profiles by apparent filled area. See
the [comparative radar](https://tanstack.com/charts/catalog/99-comparative-radar/)
when multiple profiles are the point of the chart.

## Numeric polar line

Lightweight linear scales map numeric angle and radius values without changing
the mark API. Here a visible transform maps observation dates to angles while
preserving the source temperature field.

```ts group=polar-line env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import {
  angleGrid,
  polar,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { dayOfYearAngle, seattle2012 } from './weather'

export default defineChart({
  marks: [
    polar({
      angle: { scale: scaleLinear().domain([0, 360]) },
      radius: { scale: scaleLinear().domain([-10, 40]) },
      guides: [
        radialGrid({ values: [0, 10, 20, 30, 40] }),
        angleGrid({ values: [0, 90, 180, 270], labels: false }),
      ],
      marks: [
        radialLine(seattle2012, {
          angle: dayOfYearAngle,
          radius: 'temp_max',
          stroke: '#0f766e',
        }),
      ],
    }),
  ],
})
```

```ts group=polar-line file=/src/weather.ts collapsed
export interface WeatherRow {
  location: string
  date: Date
  temp_max: number
}

const weather: readonly WeatherRow[] = [
  { location: 'Seattle', date: new Date('2012-01-15'), temp_max: 8.3 },
  { location: 'Seattle', date: new Date('2012-03-15'), temp_max: 12.2 },
  { location: 'Seattle', date: new Date('2012-05-15'), temp_max: 18.9 },
  { location: 'Seattle', date: new Date('2012-07-15'), temp_max: 25.6 },
  { location: 'Seattle', date: new Date('2012-09-15'), temp_max: 21.1 },
  { location: 'Seattle', date: new Date('2012-11-15'), temp_max: 11.7 },
]

export const seattle2012 = weather.filter(
  (row) => row.location === 'Seattle' && row.date.getUTCFullYear() === 2012,
)

export function dayOfYearAngle(row: WeatherRow) {
  const year = row.date.getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  return ((row.date.getTime() - start) / (end - start)) * 360
}
```

The [full-year polar line](https://tanstack.com/charts/catalog/106-polar-line/)
uses the same transform with the complete weather series.

## Numeric polar scatter

The same coordinate accepts independent points. Wind direction and speed stay
as explicit transforms over source `u` and `v` measurements.

```ts group=polar-scatter env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import { angleGrid, polar, radialDot, radialGrid } from '@tanstack/charts/polar'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { latitudeBand, windDirection, windSpeed } from './wind'

export default defineChart({
  marks: [
    polar({
      angle: { scale: scaleLinear().domain([0, 360]) },
      radius: { scale: scaleLinear().domain([0, 13]) },
      guides: [
        radialGrid({ values: [3, 6, 9, 12] }),
        angleGrid({ values: [0, 90, 180, 270], labels: false }),
      ],
      marks: [
        radialDot(latitudeBand, {
          angle: windDirection,
          radius: windSpeed,
          r: 4.5,
          fill: '#e11d48',
        }),
      ],
    }),
  ],
})
```

```ts group=polar-scatter file=/src/wind.ts collapsed
export interface WindRow {
  latitude: number
  u: number
  v: number
}

const wind: readonly WindRow[] = [
  { latitude: 48.125, u: 4.2, v: 1.6 },
  { latitude: 48.125, u: 2.1, v: 5.8 },
  { latitude: 48.125, u: -3.4, v: 6.2 },
  { latitude: 48.125, u: -5.1, v: -2.3 },
  { latitude: 48.125, u: 1.8, v: -4.7 },
]

export const latitudeBand = wind.filter((row) => row.latitude === 48.125)

export function windDirection(row: WindRow) {
  return (Math.atan2(row.v, row.u) * (180 / Math.PI) + 360) % 360
}

export function windSpeed(row: WindRow) {
  return Math.hypot(row.u, row.v)
}
```

The [catalog polar scatter](https://tanstack.com/charts/catalog/107-polar-scatter/)
uses a denser sample from the same latitude band.

## Radial bars

Choose the mark by the quantitative direction. A rose extends one bar through
radius for each angle band. Concentric radial bars extend through angle for
each radius band. Band padding controls categorical occupancy.

```ts group=polar-radial-bars env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import { polar, radialBarRadius } from '@tanstack/charts/polar'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { frequencies } from './data'

const letters = frequencies.map((row) => row.letter)
const maximum = Math.max(...frequencies.map((row) => row.frequency))

export default defineChart({
  marks: [
    polar({
      radiusRatio: 0.8,
      angle: { scale: () => scaleBand<string>().padding(0.12) },
      radius: {
        scale: scaleLinear().domain([0, maximum]),
        range: [({ radius }) => radius * 0.3, ({ radius }) => radius],
      },
      marks: [
        radialBarRadius(frequencies, {
          angle: 'letter',
          radius: 'frequency',
          color: 'letter',
          key: 'letter',
        }),
      ],
    }),
  ],
  color: {
    domain: letters,
    range: ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a'],
  },
})
```

```ts group=polar-radial-bars file=/src/data.ts collapsed
export interface FrequencyRow {
  letter: string
  frequency: number
}

export const frequencies: readonly FrequencyRow[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
]
```

An omitted radius baseline in `radialBarRadius` starts at the physical center;
the responsive radius range controls the quantitative endpoints. Supply
`radius1` when both endpoints are semantic values. Signed radius data should
use `radius1: 0` so semantic zero maps through the scale.

Use `radialBarAngle` when values should extend around the circle instead. See
the [concentric radial-bar example](https://tanstack.com/charts/catalog/100-radial-bars/).

## Polar hierarchy

The optional `sunburst` mark accepts flat hierarchy rows and owns value
aggregation, partitioning, responsive rings, and sector geometry.

```ts group=polar-sunburst env=charts file=/src/chart.ts entry
import { defineChart } from '@tanstack/charts'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { polar } from '@tanstack/charts/polar'
import { rows } from './data'

export default defineChart({
  marks: [
    polar({
      radiusRatio: 0.88,
      startAngle: Math.PI / 2,
      endAngle: Math.PI / 2 - Math.PI * 2,
      marks: [
        sunburst(rows, {
          path: 'name',
          delimiter: '.',
          value: 'size',
          innerRadius: ({ radius }) => radius * 0.14,
          ringPadding: 2,
          color: 'branchId',
          stroke: '#fff',
        }),
      ],
    }),
  ],
  color: { range: ['#7c3aed', '#0ea5e9', '#14b8a6'] },
})
```

```ts group=polar-sunburst file=/src/data.ts collapsed
export interface PackageRow {
  name: string
  size: number | null
}

export const rows: readonly PackageRow[] = [
  { name: 'app', size: null },
  { name: 'app.ui', size: null },
  { name: 'app.ui.button', size: 8 },
  { name: 'app.ui.dialog', size: 5 },
  { name: 'app.data', size: null },
  { name: 'app.data.cache', size: 6 },
  { name: 'app.data.client', size: 11 },
]
```

Use `nodeId` and `parentId` for explicit parent-reference rows. Responsive
`innerRadius` and `outerRadius` callbacks receive the final polar radius;
`ringPadding` remains a fixed pixel gap. Every `SunburstNode` retains its
direct row and source index, while `branchId` gives descendants the color of
their first ancestor below the root. See the
[Sunburst Mark reference](../reference/marks/sunburst.md) and the
[full Flare hierarchy](https://tanstack.com/charts/catalog/101-sunburst/).

## Coordinate and bundle boundary

`polar()` is a positionless container mark. It resolves one center and radius,
copies configured angle/radius scales, paints guide backgrounds, child marks,
then guide foreground labels, and emits ordinary scene nodes and focus points.
The outer chart therefore omits both Cartesian axes.

The polar entry uses D3 arc and radial path generators internally. Application
source can use compact angle and radius scales or upgrade either one to
`d3-scale`; curve factories and application-owned pie layout can come directly
from `d3-shape`. See
[Polar Marks](../reference/marks/polar.md) for the complete API and
[Bundle Size and Performance](../guides/bundle-size-and-performance.md) for
the isolated consumer budgets.

`radialArc` also accepts existing D3 pie DTOs as interoperability input; native
`pie` is preferred when flat fields, transform lineage, and direct gap
semantics are wanted.

## Production checks

- Keep angle for cyclic order or part-to-whole intervals.
- Use native `pie` output rather than reimplementing angle accumulation.
- Let marks infer identity from source IDs or unique positions; supply a key
  when neither is available.
- Preserve original values for tooltips and accessible summaries.
- Keep radar dimension domains, directions, and units explicit.
- Verify labels around the full circumference at narrow widths.
- Prefer aligned bars or dots when precise comparison is the primary task.
