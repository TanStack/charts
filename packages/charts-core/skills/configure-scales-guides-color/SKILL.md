---
name: configure-scales-guides-color
description: >
  Configure TanStack Charts domains, scale factories, axes, margins,
  legends, grouping, and paint without taking ownership of responsive ranges.
  Load for blank geometry, scale inference, color semantics, shared domains,
  ticks, labels, or guide layout.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/concepts/scales-and-d3.md'
  - 'TanStack/charts:docs/reference/scales-guides-and-color.md'
  - 'TanStack/charts:docs/guides/legends-and-color.md'
  - 'TanStack/charts:docs/guides/responsive-charts.md'
---

# Configure Scales, Guides, and Color

Use **trigger → inspect → decide → build → verify**. The application owns semantic domains and color policy; TanStack Charts owns inferred domains, responsive positional ranges, guide measurement, and final paint resolution.

## Setup

Use factories for inferred domains and configured instances for fixed semantic domains:

```ts
import { colorLegend, defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleOrdinal } from '@tanstack/charts/scales/ordinal'
import { scalePoint } from '@tanstack/charts/scales/point'

const rows = [
  { week: 'May 4', package: 'core', downloads: 820 },
  { week: 'May 11', package: 'core', downloads: 960 },
  { week: 'May 4', package: 'react', downloads: 610 },
  { week: 'May 11', package: 'react', downloads: 730 },
]

const color = scaleOrdinal<string, string>()
  .domain(['core', 'react'])
  .range(['#2563eb', '#f97316'])

export const chart = defineChart({
  marks: [lineY(rows, { x: 'week', y: 'downloads', z: 'package' })],
  x: { scale: () => scalePoint<string>().padding(0.2) },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Downloads' },
  },
  color: { scale: color, legend: colorLegend({ label: 'Package' }) },
})
```

## Core Patterns

### Choose a scale by semantics

- Numeric position → compact `scaleLinear`.
- Categories with width → compact `scaleBand`.
- Categories without width → compact `scalePoint`.
- Stable categorical paint → compact `scaleOrdinal`.
- Elapsed time, nonlinear transforms, radial mapping, statistical bins, or continuous color → exact `d3-scale` family.

Read [the ownership matrix](references/scale-guide-ownership.md) before configuring a D3 instance.

### Share domains intentionally

```ts
import { scaleLinear } from '@tanstack/charts/scales/linear'

export const percentScale = scaleLinear().domain([0, 1])

export const sharedPercentAxis = {
  scale: percentScale,
  axis: {
    label: 'Conversion rate',
    ticks: { format: (value: number) => `${Math.round(value * 100)}%` },
  },
}
```

A configured instance keeps the domain stable across filtering, facets, or linked views. Charts copies it and assigns the current range.

### Keep series identity separate from paint

```ts
import { lineY } from '@tanstack/charts'

const rows = [
  { date: '2026-08-01', series: 'api', status: 'healthy', value: 91 },
  { date: '2026-08-01', series: 'worker', status: 'healthy', value: 84 },
]

export const mark = lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'series',
  color: 'status',
})
```

Use `z` for geometry groups, `color` for semantic scale values, and `fill`/`stroke` for final local paint overrides.

### Separate tick candidates from label collision

Tick count, spacing, or values chooses candidates. Label thinning, rotation, formatting, and priority decide which candidate labels remain readable. Automatic margins contain guides; they do not make every label legible.

## Common Mistakes

### CRITICAL Assigning positional pixel ranges

Wrong:

```ts
x: {
  scale: scaleLinear().range([0, 640])
}
```

Correct:

```ts
x: {
  scale: scaleLinear
}
```

The final plot range changes after container measurement and guide margins resolve.

Source: `API-FRICTION.md` F-002; `docs/concepts/scales-and-d3.md`

### CRITICAL Using a default instance for inference

Wrong:

```ts
y: {
  scale: scaleLinear()
}
```

Correct:

```ts
y: {
  scale: scaleLinear
}
```

A scale instance owns its domain; the factory delegates domain inference to chart channels.

Source: `CHANGELOG.md` 0.0.1 migration; `docs/concepts/scales-and-d3.md`

### HIGH Using color as geometry identity accidentally

Wrong:

```ts
lineY(rows, { x: 'date', y: 'value', color: 'status' })
```

Correct:

```ts
lineY(rows, {
  x: 'date',
  y: 'value',
  z: 'series',
  color: 'status',
})
```

When `z` is absent, a discrete color channel can also partition connected geometry.

Source: `API-FRICTION.md` F-009, F-013; `docs/concepts/data-and-channels.md`

### HIGH Treating containment as collision avoidance

Wrong: rely on automatic margins to solve dense tick labels.

Correct: define candidate spacing, thinning priority, rotation, abbreviation, or a different responsive composition.

Margins keep guides inside the surface; they do not guarantee labels avoid each other.

Source: `API-FRICTION.md` F-023, F-160; `docs/guides/responsive-charts.md`

### HIGH Tension: responsive adaptation versus comparison stability

Reduce labels or change composition at narrow widths, but do not silently change a shared domain, threshold, or category-color assignment to make the chart fit.

See also: `design-responsive-charts/SKILL.md` § Common Mistakes

## References

- [Scale, guide, grouping, and color ownership](references/scale-guide-ownership.md)

See also: `design-responsive-charts/SKILL.md` and `debug-and-verify-charts/SKILL.md` — final ranges depend on layout, and blank charts often expose scale-contract failures.
