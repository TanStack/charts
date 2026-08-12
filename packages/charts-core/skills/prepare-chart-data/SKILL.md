---
name: prepare-chart-data
description: >
  Order, aggregate, derive, and transform application rows for TanStack
  Charts while preserving semantic units and lineage. Load for stacks, bins,
  groups, rolling windows, ranks, regression, hierarchy, missing values, or
  reactive transform work.
metadata:
  type: core
  library: '@tanstack/charts'
  library_version: '0.9.0'
sources:
  - 'TanStack/charts:docs/guides/transforms-and-reactivity.md'
  - 'TanStack/charts:docs/reference/transforms.md'
  - 'TanStack/charts:docs/reference/marks/line-and-area.md'
---

# Prepare Chart Data

Use **trigger → inspect → decide → build → verify**. Keep analytical preparation outside responsive layout and preserve the row lineage needed by tooltips, selection, tables, and drill-down.

## Setup

Prepare semantic rows once, then pass them to marks:

```ts
import { groupBy, lineY, rollingWindow } from '@tanstack/charts'

interface Order {
  day: string
  region: string
  amount: number
}

export function prepareRevenue(orders: readonly Order[]) {
  const daily = groupBy(orders, {
    by: { region: 'region', day: 'day' },
    outputs: {
      revenue: { value: 'amount', reduce: 'sum' },
      orders: { reduce: 'count' },
    },
  })

  return rollingWindow(daily, {
    by: 'region',
    orderBy: 'day',
    size: 7,
    partial: false,
    outputs: { revenue7d: { value: 'revenue', reduce: 'sum' } },
  })
}

const prepared = prepareRevenue([
  { day: '2026-08-01', region: 'West', amount: 120 },
  { day: '2026-08-02', region: 'West', amount: 160 },
])

export const revenueMark = lineY(prepared, {
  x: 'day',
  y: 'revenue7d',
  z: 'region',
})
```

## Core Patterns

### Choose the owner by scope

| Work                                     | Owner                                      |
| ---------------------------------------- | ------------------------------------------ |
| Calculation from one row                 | channel accessor                           |
| Reusable cross-row result                | eager data transform                       |
| Geometry meaningful only inside one mark | `layout: stack()` or `layout: group()`     |
| Product-specific enrichment or filtering | ordinary application function              |
| Pixel-space work after margins resolve   | resolved-layout mark, not a data transform |

### Compose structural and analytical transforms

```ts
import { normalize, select } from '@tanstack/charts'
import { fold } from '@tanstack/charts/transform/fold'

const services = [
  { service: 'api', latency: 180, throughput: 820 },
  { service: 'worker', latency: 240, throughput: 510 },
]

const folded = fold(services, {
  fields: ['latency', 'throughput'] as const,
  as: { key: 'metric', value: 'measurement' },
})

const normalized = normalize(folded, {
  by: 'metric',
  value: 'measurement',
  basis: 'extent',
  as: 'relativeMeasurement',
})

export const baselines = select(normalized, {
  by: 'metric',
  select: 'first',
})
```

Each stage should have one semantic responsibility and a named output.

### Order path data before mark construction

```ts
import { lineY } from '@tanstack/charts'

const rows = [
  { date: new Date('2026-08-03'), value: 14 },
  { date: new Date('2026-08-01'), value: 10 },
  { date: new Date('2026-08-02'), value: 12 },
]

const ordered = [...rows].sort((left, right) => +left.date - +right.date)

export const trend = lineY(ordered, { x: 'date', y: 'value' })
```

Scale domains do not reorder line or area topology.

### Preserve direct lineage

TanStack transforms record their immediate input in `source`. If application code creates additional derived rows, preserve equivalent references when focus, drill-down, or audit must reach the original observations.

Read [the transform decision table](references/transforms.md) before combining transform families.

## Common Mistakes

### CRITICAL Sorting after creating the mark

Wrong:

```ts
const mark = lineY(rows, { x: 'date', y: 'value' })
rows.sort((left, right) => +left.date - +right.date)
```

Correct:

```ts
const ordered = [...rows].sort((left, right) => +left.date - +right.date)
const mark = lineY(ordered, { x: 'date', y: 'value' })
```

Line and area marks capture input order as path order.

Source: `docs/reference/marks/line-and-area.md`

### HIGH Running eager transforms in responsive builders

Wrong:

```ts
defineChart(({ width }) => ({
  marks: [lineY(rollingWindow(rows, options), channels)],
}))
```

Correct:

```ts
const prepared = rollingWindow(rows, options)
defineChart(({ width }) => ({ marks: [lineY(prepared, channels)] }))
```

Responsive builders may rerun for size and layout changes while source rows remain unchanged.

Source: `docs/guides/transforms-and-reactivity.md`; `API-FRICTION.md` F-128

### HIGH Manually accumulating ordinary stacks

Wrong: maintain application running totals for each x value and series.

Correct:

```ts
barY(rows, {
  x: 'quarter',
  y: 'revenue',
  z: 'product',
  layout: stack(),
})
```

Native stack layout owns missing series, negative values, order, and updates. Fixed in the current API, but agents trained on early examples may still generate manual accumulation.

Source: GitHub issue 9; `API-FRICTION.md` F-163

### HIGH Flattening derived rows without lineage

Wrong: replace aggregated rows with unlabeled numeric tuples.

Correct: keep named outputs, grouping fields, and direct source references through each application-owned step.

Tooltips, selection, and drill-down otherwise lose the records that contributed to the value.

Source: `docs/reference/transforms.md`; `docs/guides/transforms-and-reactivity.md`

### HIGH Tension: analytical honesty versus visual simplicity

Aggregation and normalization reduce visual noise but can hide denominators, sample sizes, uncertainty, and missing-value policy. Prepare the evidence required by `design-a-chart` before reducing row detail.

See also: `design-a-chart/SKILL.md` § Common Mistakes

## References

- [Transform selection and output contracts](references/transforms.md)

See also: `configure-scales-guides-color/SKILL.md`, `build-chart-interactions/SKILL.md`, and `coordinate-charts-with-tanstack/SKILL.md` — derived values determine domains, legends, tooltip content, available lineage, and shared chart-grid projections.
