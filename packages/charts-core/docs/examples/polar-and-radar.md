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
`radialArc` renders the intervals. A zero inner radius is a pie; a responsive
nonzero inner radius is a donut.

<!-- docs-example: polar-pie-donut typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import {
  pie,
  polar,
  radialArc,
  radialRule,
  radialText,
} from '@tanstack/charts/polar'
import { scaleLinear } from 'd3-scale'

interface AlphabetRow {
  letter: string
  frequency: number
}

const alphabet: readonly AlphabetRow[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
]

const partColors = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f97316']
const letters = alphabet.slice(0, 5)

function ring(innerRatio: number) {
  const slices = pie(letters, { value: 'frequency' })
  return polar({
    inset: 8,
    radiusRatio: 0.82,
    marks: [
      radialArc(slices, {
        innerRadius: ({ radius }) => radius * innerRatio,
        cornerRadius: 4,
        color: 'letter',
        key: 'letter',
      }),
    ],
  })
}

const pieChart = defineChart({
  marks: [ring(0)],
  color: { domain: letters.map((row) => row.letter), range: partColors },
})

const donutChart = defineChart({
  marks: [ring(0.58)],
  color: { domain: letters.map((row) => row.letter), range: partColors },
})

const labeledSlices = pie(letters, { value: 'frequency' })
const labeledPie = defineChart({
  marks: [
    polar({
      radiusRatio: 0.72,
      angle: { scale: scaleLinear().domain([0, Math.PI * 2]) },
      radius: { scale: scaleLinear().domain([0, 1]) },
      marks: [
        radialArc(labeledSlices, {
          color: 'letter',
          key: 'letter',
        }),
        radialRule(labeledSlices, {
          angle: 'angle',
          radius1: 1,
          radius2: 1,
          radius2Offset: 20,
          key: 'letter',
        }),
        radialText(labeledSlices, {
          angle: 'angle',
          radius: 1,
          radiusOffset: 20,
          text: 'letter',
          color: 'letter',
          key: 'letter',
          anchor: 'outside',
        }),
      ],
    }),
  ],
  color: { domain: letters.map((row) => row.letter), range: partColors },
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/76-pie/?theme=system&height=480"
  title="English letter-frequency pie chart built from native pie intervals and radial arcs"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/77-donut/?theme=system&height=480"
  title="English letter-frequency donut chart built from native pie intervals and radial arcs"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

The same primitives cover labels, center content, padding, rounded corners,
and concentric rings. Radial offsets are signed pixels applied after scale
mapping. They do not change the radius domain or reserve outer margin; leave
space with `radiusRatio`, `inset`, or chart margins.

<iframe
  src="https://tanstack.com/charts/catalog/embed/93-labeled-pie/?theme=system&height=480"
  title="English letter-frequency pie chart with native radial labels and leader rules"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/94-center-donut/?theme=system&height=480"
  title="English letter-frequency donut chart with native center value"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/95-rounded-donut/?theme=system&height=480"
  title="Rounded English letter-frequency donut chart with angular gaps and rounded arcs"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/96-nested-donut/?theme=system&height=480"
  title="Nested Flare package-size donut chart"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Source order is the default. Use `orderBy` and `order` only for an explicit
angular sort. Stable arc keys must come from the original row, not the
generated slice index.

Each allocated row keeps the original fields plus direct `source` and
`sourceIndexes` lineage. Fixed allocation fields overwrite source fields with
the same names. `gapAngle` materializes direct empty space; the returned
`padAngle: 0` prevents `radialArc` from padding that interval again.

## Partial-circle gauge

A gauge is the same composition over a restricted pie interval. It is not
a separate geometry implementation.

<!-- docs-example: polar-partial-gauge typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'

interface SurveyRow {
  Question: string
  ID: number
  Response: string
}

const survey: readonly SurveyRow[] = [
  { Question: 'Q1', ID: 1, Response: 'Strongly Agree' },
  { Question: 'Q1', ID: 2, Response: 'Agree' },
  { Question: 'Q1', ID: 3, Response: 'Agree' },
  { Question: 'Q1', ID: 4, Response: 'Neutral' },
  { Question: 'Q1', ID: 5, Response: 'Disagree' },
  { Question: 'Q2', ID: 1, Response: 'Neutral' },
]

interface GaugePart {
  id: 'agreement' | 'other'
  value: number
}

function agreementPercent(rows: readonly SurveyRow[], question: string) {
  const responses = rows.filter((row) => row.Question === question)
  const agreements = responses.filter(
    (row) => row.Response === 'Agree' || row.Response === 'Strongly Agree',
  )
  return responses.length === 0
    ? 0
    : Math.round((agreements.length / responses.length) * 100)
}

const agreement = agreementPercent(survey, 'Q1')
const gaugeParts: GaugePart[] = [
  { id: 'agreement', value: agreement },
  { id: 'other', value: 100 - agreement },
]
const gaugeSlices = pie(gaugeParts, {
  value: 'value',
  startAngle: -Math.PI * 0.75,
  endAngle: Math.PI * 0.75,
})

const gauge = defineChart({
  marks: [
    polar({
      radiusRatio: 0.84,
      marks: [
        radialArc(gaugeSlices, {
          innerRadius: ({ radius }) => radius * 0.72,
          cornerRadius: 999,
          color: 'id',
          key: 'id',
        }),
      ],
    }),
  ],
  color: {
    domain: ['agreement', 'other'],
    range: ['#ef4444', '#e2e8f0'],
  },
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/78-gauge/?theme=system&height=480"
  title="Survey agreement gauge composed from native pie intervals and TanStack radial arcs"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/98-needle-gauge/?theme=system&height=480"
  title="County unemployment gauge with radial ticks, needle, hub, and value label"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Bound the input before layout and expose the exact value outside the arc. Arc
length is useful for a compact status summary, not fine comparison.

## Radar profile

Radar combines an inferred angle factory and a fixed radius instance with
polar guides and radial marks. TanStack supplies both responsive ranges.

<!-- docs-example: polar-radar typecheck -->

```ts
import { defineChart, normalize, select } from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'
import {
  angleGrid,
  polar,
  radialArea,
  radialDot,
  radialGrid,
  radialLine,
} from '@tanstack/charts/polar'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveLinearClosed } from 'd3-shape'

interface DecathlonRow {
  Country: string
  '100 Meters': number
  'Long Jump': number
  'High Jump': number
  '100 Meter Hurdles': number
}

const decathlon: readonly DecathlonRow[] = [
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

const events = [
  '100 Meters',
  'Long Jump',
  'High Jump',
  '100 Meter Hurdles',
] as const
type RadarEvent = (typeof events)[number]

const timedEvents = new Set<RadarEvent>(['100 Meters', '100 Meter Hurdles'])
const folded = fold(decathlon, {
  fields: events,
  as: { key: 'event', value: 'result' },
})
const normalized = normalize(folded, {
  by: 'event',
  value: ({ datum }) =>
    timedEvents.has(datum.event) ? -datum.result : datum.result,
  basis: 'extent',
  as: 'relativePerformance',
})
const profile = select(normalized, { by: 'event', select: 'first' })
const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const radar = defineChart({
  marks: [
    polar({
      radiusRatio: 0.72,
      angle: { scale: scalePoint<string>().domain(events), wrap: true },
      radius: { scale: scaleLinear().domain([0, 1]) },
      guides: [
        radialGrid({
          values: [0.25, 0.5, 0.75, 1],
          shape: 'polygon',
          labels: true,
          format: (value) => percent.format(Number(value)),
        }),
        angleGrid({
          labels: true,
          labelDx: ({ x }) => (x < -1 ? -3 : x > 1 ? 3 : 0),
          labelDy: ({ y }) => (y < -1 ? -2 : y > 1 ? 2 : 0),
        }),
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
        radialDot(profile, {
          angle: 'event',
          radius: 'relativePerformance',
          key: 'event',
          r: 3,
          fill: '#8b5cf6',
        }),
      ],
    }),
  ],
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/75-radar/?theme=system&height=480"
  title="Normalized decathlon radar profile with polygon guides built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/99-comparative-radar/?theme=system&height=480"
  title="Normalized USA and Great Britain decathlon radar profiles"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Use radar for a small, fixed set of compatible dimensions. Keep every domain
and direction explicit, and do not rank profiles by apparent filled area.

## Numeric polar line and scatter

Continuous D3 scales map numeric angle and radius values without changing the
mark API. A visible transform can derive angle and radius from existing source
measurements without renaming those measurements into chart fields.

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

interface WeatherRow {
  location: string
  date: Date
  temp_max: number
}

const weather: readonly WeatherRow[] = [
  {
    location: 'Seattle',
    date: new Date('2012-01-15T00:00:00Z'),
    temp_max: 8.3,
  },
  {
    location: 'Seattle',
    date: new Date('2012-03-15T00:00:00Z'),
    temp_max: 12.2,
  },
  {
    location: 'Seattle',
    date: new Date('2012-05-15T00:00:00Z'),
    temp_max: 18.9,
  },
  {
    location: 'Seattle',
    date: new Date('2012-07-15T00:00:00Z'),
    temp_max: 25.6,
  },
  {
    location: 'Seattle',
    date: new Date('2012-09-15T00:00:00Z'),
    temp_max: 21.1,
  },
  {
    location: 'Seattle',
    date: new Date('2012-11-15T00:00:00Z'),
    temp_max: 11.7,
  },
]

interface WindRow {
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

const seattle2012 = weather.filter(
  (row) => row.location === 'Seattle' && row.date.getUTCFullYear() === 2012,
)
const latitudeBand = wind.filter((row) => row.latitude === 48.125)

function dayOfYearAngle(row: WeatherRow) {
  const year = row.date.getUTCFullYear()
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  return ((row.date.getTime() - start) / (end - start)) * 360
}

function windDirection(row: WindRow) {
  return (Math.atan2(row.v, row.u) * (180 / Math.PI) + 360) % 360
}

function windSpeed(row: WindRow) {
  return Math.hypot(row.u, row.v)
}

const polarLineChart = defineChart({
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

const polarScatterChart = defineChart({
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

<iframe
  src="https://tanstack.com/charts/catalog/embed/106-polar-line/?theme=system&height=480"
  title="Seattle daily high temperatures through 2012 on a polar line"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/107-polar-scatter/?theme=system&height=480"
  title="Surface wind observations by derived direction and speed"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Radial bars

Choose the mark by the quantitative direction. A rose extends one bar through
radius for each angle band. Concentric radial bars extend through angle for
each radius band. D3 band padding controls the categorical occupancy.

<!-- docs-example: polar-radial-bars typecheck -->

```ts
import { defineChart } from '@tanstack/charts'
import { polar, radialBarAngle, radialBarRadius } from '@tanstack/charts/polar'
import { scaleBand, scaleLinear } from 'd3-scale'

interface FrequencyRow {
  letter: string
  frequency: number
}

const frequencies: readonly FrequencyRow[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
]
const letters = frequencies.map((row) => row.letter)
const maximum = Math.max(...frequencies.map((row) => row.frequency))
const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a']

const rose = defineChart({
  marks: [
    polar({
      radiusRatio: 0.8,
      angle: { scale: () => scaleBand<string>() },
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
  color: { domain: letters, range: colors },
})

const concentricBars = defineChart({
  marks: [
    polar({
      radiusRatio: 0.84,
      angle: { scale: scaleLinear().domain([0, maximum]) },
      radius: {
        scale: () => scaleBand<string>().paddingInner(0.38).paddingOuter(0.19),
        range: [({ radius }) => radius * 0.2, ({ radius }) => radius],
      },
      marks: [
        radialBarAngle(frequencies, {
          angle: 'frequency',
          radius: 'letter',
          color: 'letter',
          cornerRadius: 'full',
          key: 'letter',
        }),
      ],
    }),
  ],
  color: { domain: letters, range: colors },
})
```

An omitted radius baseline in `radialBarRadius` starts at the physical center;
the responsive radius range controls the quantitative endpoints. Supply
`radius1` when both endpoints are semantic values. Signed radius data should
use `radius1: 0` so semantic zero maps through the scale. `radialBarAngle` maps
its default angle baseline from semantic zero.

<iframe
  src="https://tanstack.com/charts/catalog/embed/97-rose/?theme=system&height=480"
  title="English letter-frequency rose with equal angles and variable radii"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

<iframe
  src="https://tanstack.com/charts/catalog/embed/100-radial-bars/?theme=system&height=480"
  title="Concentric English letter-frequency radial bars"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Polar hierarchy

The optional `sunburst` mark accepts flat hierarchy rows and owns value
aggregation, partitioning, responsive rings, and sector geometry:

```ts
import { defineChart } from '@tanstack/charts'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import { polar } from '@tanstack/charts/polar'

const chart = defineChart({
  marks: [
    polar({
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
})
```

Use `nodeId` and `parentId` for explicit parent-reference rows. Responsive
`innerRadius` and `outerRadius` callbacks receive the final polar radius;
`ringPadding` remains a fixed pixel gap. Every `SunburstNode` retains its
direct row and source index, while `branchId` gives descendants the color of
their first ancestor below the root. See the
[Sunburst Mark reference](../reference/marks/sunburst.md).

<iframe
  src="https://tanstack.com/charts/catalog/embed/101-sunburst/?theme=system&height=480"
  title="Flare analytics hierarchy sunburst rendered with native sectors"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## Coordinate and bundle boundary

`polar()` is a positionless container mark. It resolves one center and radius,
copies configured angle/radius scales, paints guide backgrounds, child marks,
then guide foreground labels, and emits ordinary scene nodes and focus points.
The outer chart therefore omits both Cartesian axes.

The polar entry uses D3 arc and radial path generators internally. Application
source imports configured scales and curve factories directly from `d3-shape`
or `d3-scale`; value allocation comes from the polar entry. See
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
