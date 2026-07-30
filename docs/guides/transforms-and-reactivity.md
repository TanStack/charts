---
title: Transforms and Reactivity
description: Transform raw observations beside a memoized chart definition using each framework's native reactivity.
---

Keep raw observations in their application shape. Put grouping, binning,
stacking, ranking, rolling statistics, and interval construction beside the
chart definition so the analytical path remains visible.

## Choose the execution boundary

| Work                                           | Location                               |
| ---------------------------------------------- | -------------------------------------- |
| A value derived from one row                   | Channel accessor                       |
| A chart-specific cross-row transform           | Ordinary function beside `defineChart` |
| Reused or expensive derived data               | Framework memo or computed state       |
| A surface-responsive transform                 | Definition builder using surface size  |
| Exact plot-pixel collision or placement        | Custom mark render phase               |
| Querying, permissions, or business aggregation | Application or server                  |

## Transform and memoize together

```tsx
function LatencyChart({ observations }: Props) {
  const definition = useMemo(() => {
    const histogram = binLatency(observations)

    return defineChart({
      marks: [
        rect(histogram, {
          x1: 'x1',
          x2: 'x2',
          y1: () => 0,
          y2: 'count',
          key: 'id',
          inset: 1,
        }),
      ],
      x: { scale: scaleLinear().domain(histogramDomain(histogram)) },
      y: { scale: scaleLinear().domain(countDomain(histogram)) },
    })
  }, [observations])

  return <Chart definition={definition} ariaLabel="Request latency" />
}
```

The imported data remains raw. The adjacent transform defines thresholds,
empty-input behavior, derived row shape, and source observations retained for
interaction.

## Responsive transforms

Keep surface-dependent layout inside the builder. Captured data remains stable
while Charts rebuilds for a new size:

```ts
const definition = useMemo(
  () =>
    defineChart(({ width, height }) => {
      const columns = Math.max(
        1,
        Math.floor(Math.sqrt((total * width) / Math.max(1, height))),
      )
      return buildWaffleSpec(layoutWaffleCells(segments, columns), columns)
    }),
  [segments, total],
)
```

Exact inner plot bounds are not available until guides are measured; use a
custom mark when an algorithm requires them.

Derived rows should preserve source observations needed by tooltips and
selection. Drop or explicitly handle incomplete reducer output instead of
casting it.

TanStack Charts accepts D3 output directly and does not require a
library-owned series shape. Install each granular `d3-*` module imported by
application source.
