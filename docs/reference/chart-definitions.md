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
): ResponsiveChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<const TSpec>(
  config: ResponsiveChartConfig<TSpec>,
): ResponsiveChartDefinition<InferredDatum, InferredX, InferredY>

function defineChart<TDefinition, TOptions>(
  definition: TDefinition,
  options: TOptions,
): Omit<TDefinition, keyof TOptions> & TOptions
```

## Static definitions

Use a static definition when its data and visual options are already known:

```ts
import { scaleUtc } from 'd3-scale'
import { scaleLinear } from '@tanstack/charts/scales/linear'

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
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const definition = defineChart({
  svgAnimation: true,
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

| Property       | Type         | Meaning                                                      |
| -------------- | ------------ | ------------------------------------------------------------ |
| `width`        | `number`     | Current full surface width                                   |
| `height`       | `number`     | Current full surface height                                  |
| `defaultTheme` | `ChartTheme` | Platform defaults before the returned spec applies its theme |

`width` and `height` are controlled by the host. The builder can read them but
does not return or own them.

## Definition behavior

`ChartDefinitionOptions<TDatum, TXValue, TYValue>` contains `focus`,
`focusRing`, `selection`, `controls`, `cursor`, `maxFocusDistance`,
`spatialIndex`, `svgAnimation`, `pointer`, `keyboard`, and `tooltip`. These options
belong to both static and responsive definitions. Hosts and framework adapters
do not override them.

Each `ChartControl` resolves after final scales and plot bounds exist. It can
provide renderer-neutral fallback nodes and an optional host control. Control
IDs and host-control identities must be unique. Browser hosts remove a
control's fallback before painting and own its update, renderer replacement,
event containment, and teardown lifecycle. Static renderers keep the fallback.

`cursor` binds an application-owned controller in focus-snapped or free mode.
It is behavior, not a mark; add `crosshair(...)` when the cursor should have a
renderer-native visual guide. See
[Focus and Interaction](./focus-and-interaction.md#controlled-cursors).

Tooltip placement policy stays with the definition. Add the `portal` extension
when the surface must escape clipped chart ancestors. Framework-only content
composition remains an adapter prop, slot, snippet, or template.

`ResponsiveChartConfig<TSpec>` combines those options with the responsive `chart`
builder. The two-argument `defineChart(definition, options)` form creates a new
definition when a reusable base needs a different interaction policy.

Definitions carry an optional fourth tooltip-host type parameter:
`ChartDefinition<TDatum, TXValue, TYValue, TTooltipHost>`. `DomChartDefinition`
fixes that host to `"dom"`; DOM adapter exports expose it as their local
`ChartDefinition`. Adding a DOM or React Native tooltip therefore makes that
definition host-specific. A definition without a tooltip remains assignable to
either host. Deliberately widening it to the generic three-parameter
`ChartDefinition` erases that proof and is rejected by strict host props.

## Identity and updates

A definition captures application values. Its identity is the application
update boundary: keep it stable until a captured value changes.

```tsx
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'

const definition = useMemo(() => {
  const ranked = rows
    .map((row) => ({ label: row.label, value: row[metric] }))
    .sort((left, right) => right.value - left.value)

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
  defaultTheme: ChartTheme
}

type ChartDefinition<TDatum, TXValue, TYValue> =
  | StaticChartDefinition<TDatum, TXValue, TYValue>
  | ResponsiveChartDefinition<TDatum, TXValue, TYValue>
```

`isResponsiveChartDefinition` narrows the union to a builder definition.
