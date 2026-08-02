---
title: Chart Definition API
description: Reference static and responsive chart definitions, build context, and identity-based updates.
---

## `defineChart`

```ts
import { defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
```

`defineChart` accepts a complete chart spec, a responsive configuration, or an
existing definition plus replacement behavior:

```ts
function defineChart<const TMarks, const TSpec>(
  spec: TSpec,
): StaticChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<const TSpec>(
  chart: (context: ChartBuildContext) => TSpec,
): DynamicChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<const TSpec>(
  config: DynamicChartConfig<TSpec>,
): DynamicChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<TDatum, TXValue, TYValue>(
  definition: ChartDefinition<TDatum, TXValue, TYValue>,
  options: ChartDefinitionOptions<TDatum, TXValue, TYValue>,
): ChartDefinition<TDatum, TXValue, TYValue>
```

## Static definitions

Use a static definition when its data and visual options are already known:

```ts
const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear, nice: true, grid: true },
  focus: 'group-x',
  tooltip: {
    use: tooltip,
    portal,
    anchor: 'group-center',
    placement: ['top', 'right', 'left', 'bottom'],
  },
})
```

## Responsive definitions

Use a configuration object when the spec depends on the resolved chart
surface:

```ts
const definition = defineChart({
  animate: true,
  chart: ({ width }) => ({
    marks: [barY(rows, { x: 'category', y: 'value' })],
    x: { scale: scaleBand },
    y: {
      scale: scaleLinear,
      nice: true,
      axis: { ticks: { count: width < 480 ? 4 : 7 } },
      grid: true,
    },
  }),
})
```

The builder receives:

| Property | Type         | Meaning                         |
| -------- | ------------ | ------------------------------- |
| `width`  | `number`     | Current full surface width      |
| `height` | `number`     | Current full surface height     |
| `theme`  | `ChartTheme` | Default build-time theme tokens |

`width` and `height` are controlled by the host. The builder can read them but
does not return or own them.

## Definition behavior

`ChartDefinitionOptions<TDatum, TXValue, TYValue>` contains `focus`,
`focusRing`, `maxFocusDistance`, `spatialIndex`, `animate`, `keyboard`, and
`tooltip`. These options belong to both static and responsive definitions.
Hosts and framework adapters do not override them.

Tooltip placement policy stays with the definition. Add the `portal` extension
when the surface must escape clipped chart ancestors. Framework-only content
composition remains an adapter prop, slot, snippet, or template.

`DynamicChartConfig<TSpec>` combines those options with the responsive `chart`
builder. The two-argument `defineChart(definition, options)` form creates a new
definition when a reusable base needs a different interaction policy.

## Identity and updates

A definition captures application values. Its identity is the application
update boundary: keep it stable until a captured value changes.

```tsx
const definition = useMemo(() => {
  const ranked = rankRows(rows, metric)

  return defineChart(({ width }) => ({
    marks: [barX(ranked, { x: 'value', y: 'label' })],
    x: {
      scale: scaleLinear,
      nice: true,
      axis: { ticks: { count: width < 480 ? 4 : 7 } },
    },
    y: {
      scale: () => scaleBand().padding(0.1),
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
