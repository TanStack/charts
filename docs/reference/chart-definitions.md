---
title: Chart Definition API
description: Reference static and responsive chart definitions, build context, and identity-based updates.
---

## `defineChart`

```ts
import { defineChart } from '@tanstack/charts'
```

`defineChart` accepts either a complete chart spec or a builder:

```ts
function defineChart<const TMarks, const TSpec>(
  spec: TSpec,
): StaticChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<const TSpec>(
  chart: (context: ChartBuildContext) => TSpec,
): DynamicChartDefinition<InferredDatum, InferredX, InferredY>
```

## Static definitions

Use a static definition when its data and visual options are already known:

```ts
const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value', key: 'id' })],
  x: { scale: scaleUtc().domain(dateDomain) },
  y: { scale: scaleLinear().domain(valueDomain).nice(), grid: true },
})
```

## Responsive definitions

Use a builder when the spec depends on the resolved chart surface:

```ts
const definition = defineChart(({ width }) => ({
  marks: [barY(rows, { x: 'category', y: 'value', key: 'id' })],
  x: { scale: scaleBand().domain(categories) },
  y: {
    scale: scaleLinear().domain(valueDomain).nice(),
    ticks: width < 480 ? 4 : 7,
    grid: true,
  },
}))
```

The builder receives:

| Property | Type         | Meaning                         |
| -------- | ------------ | ------------------------------- |
| `width`  | `number`     | Current full surface width      |
| `height` | `number`     | Current full surface height     |
| `theme`  | `ChartTheme` | Default build-time theme tokens |

`width` and `height` are controlled by the host. The builder can read them but
does not return or own them.

## Identity and updates

A definition captures application values. Its identity is the application
update boundary: keep it stable until a captured value changes.

```tsx
const definition = useMemo(() => {
  const ranked = rankRows(rows, metric)

  return defineChart(({ width }) => ({
    marks: [barX(ranked, { x: 'value', y: 'label', key: 'id' })],
    x: {
      scale: scaleLinear().domain(valueDomain(ranked)).nice(),
      ticks: width < 480 ? 4 : 7,
    },
    y: {
      scale: scaleBand()
        .domain(ranked.map((row) => row.label))
        .padding(0.1),
    },
  }))
}, [rows, metric])
```

Framework adapters use their native memoization primitive. Vanilla code
creates the next definition and passes it to `host.update`.

## Types

```ts
interface ChartBuildContext {
  width: number
  height: number
  theme: ChartTheme
}

type ChartDefinition<TDatum, TXValue, TYValue> =
  | StaticChartDefinition<TDatum, TXValue, TYValue>
  | DynamicChartDefinition<TDatum, TXValue, TYValue>
```

`isDynamicChartDefinition` narrows the union to a builder definition.
