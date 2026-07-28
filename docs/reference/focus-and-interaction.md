---
title: Focus and Interaction
description: Configure pointer focus, grouped focus, keyboard navigation, native tooltips, selection, and spatial indexes.
---

The DOM host and framework adapters provide point-level interaction from each
mark's emitted `ChartPoint` values. The defaults cover nearest-point pointer
focus, linear keyboard navigation, activation, and an optional native tooltip.
Applications can replace each policy without replacing chart rendering.

## Default behavior

With no custom focus strategy:

- pointer movement finds the nearest point within `maxFocusDistance`
- pointer leave or cancellation clears unpinned focus
- the SVG uses `tabIndex` (`0` by default) when `keyboard` is enabled
- focusing the SVG selects the first point in the keyboard task order
- arrow keys move through points sorted by pixel x, then pixel y
- `Home` and `End` move to the first and last point
- `Enter` and Space call `onSelect` for the focused point
- a click focuses and selects the nearest point, or selects `null`
- the renderer's focus ring follows the primary point

`maxFocusDistance` defaults to `48` scene pixels. Set `tabIndex` to control
normal tab-order participation while keeping keyboard handling enabled. Set
`keyboard: false` to remove keyboard navigation and force tab index `-1`.

## Focus helpers

Import optional axis strategies from their granular subpath:

```ts
import {
  focusNearestX,
  focusNearestY,
  focusX,
  focusY,
} from '@tanstack/charts/focus'
import { mountChart } from '@tanstack/charts/dom'
```

| Strategy        | Pointer resolution                                 | Group returned to callbacks and tooltip                               | Keyboard navigation                     |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| `focusX`        | Nearest x coordinate, then nearest y within that x | One point per group sharing the semantic x value; nearest point first | One representative per semantic x value |
| `focusNearestX` | Nearest x coordinate, then nearest y               | Primary point only                                                    | Every point                             |
| `focusY`        | Nearest y coordinate, then nearest x within that y | One point per group sharing the semantic y value; nearest point first | One representative per semantic y value |
| `focusNearestY` | Nearest y coordinate, then nearest x               | Primary point only                                                    | Every point                             |

Grouping compares semantic values, including dates by timestamp. Duplicate
points with the same `group` value are reduced to one member in grouped focus.

```ts
mountChart(container, {
  definition,
  ariaLabel: 'Package downloads',
  focus: focusX,
  tooltip: {
    formatGroup: (points) =>
      points.map((point) => `${point.groupLabel}: ${point.yValue}`).join('\n'),
  },
})
```

## Disabling chart-owned focus

```ts
import { focusDisabled } from '@tanstack/charts/focus/disabled'
```

`focusDisabled` resolves, groups, and navigates to no points. Use it when an
application owns gestures, selection paint, accessibility, and task semantics
outside the native focus layer. It does not remove the rendered focus node or
other DOM listeners; disable `keyboard` and omit `tooltip` as appropriate for
the application-owned interaction.

## Custom focus strategies

```ts
interface ChartFocusStrategy<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  resolve(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    x: number,
    y: number,
    maxDistance: number,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[]

  group(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    point: ChartPoint<TDatum, TXValue, TYValue>,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[]

  navigation(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[]
}
```

`resolve` receives scene-pixel pointer coordinates and returns primary point
first. `group` is called when an existing point is restored or reached through
keyboard navigation. `navigation` returns the ordered keyboard task set.

`ChartFocusMode` is an alias of `ChartFocusStrategy`.

## Tooltips

Set `tooltip: true` for the native accessible tooltip. Its default line is:

```text
group label · x value · y value
```

Numbers and dates use the browser's locale formatting. Grouped focus produces
one line per point.

```ts
interface ChartTooltipOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  className?: string
  format?: (point: ChartPoint<TDatum, TXValue, TYValue>) => string
  formatGroup?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => string
  sticky?: boolean
}
```

| Option        | Default       | Meaning                                    |
| ------------- | ------------- | ------------------------------------------ |
| `className`   | None          | Class appended after `ts-chart-tooltip`    |
| `format`      | Built-in line | Formats the primary point as text          |
| `formatGroup` | None          | Formats the complete focused group as text |
| `sticky`      | `false`       | Enables click-to-pin behavior              |

Formatting precedence is `formatGroup`, then `format`, then the default. The
tooltip content is text, not HTML. Newlines are preserved. `className` is
appended to `ts-chart-tooltip`.

With `sticky: true`, clicking a point pins the tooltip and a later click
unpins it. `Escape` unpins and clears focus. The tooltip has `role="status"`
and `aria-live="polite"`.

The built-in tooltip is intentionally one layer. For rich or nested UI, omit
it and render application content from `onFocusChange` or
`onFocusGroupChange`.

## Callbacks

```ts
interface ChartInteractionCallbacks {
  onFocusChange?: (point: ChartPoint | null) => void
  onFocusGroupChange?: (points: readonly ChartPoint[]) => void
  onSelect?: (point: ChartPoint | null) => void
}
```

Definitions infer callback datum and semantic x/y value types without adapter
generics. Focus callbacks run only when the primary focus key changes, except
that a scene rebuild with an existing focused key reports the point with its
new coordinates and datum.

`onSelect` reports mouse clicks and keyboard activation. A click with no point
reports `null`; Enter and Space do nothing until a point is focused.

## Spatial indexes

The default nearest-point lookup scans all interaction points. Dense charts can
inject an index:

```ts
type ChartSpatialIndexFactory<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = (
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
) => ChartSpatialIndex<TDatum, TXValue, TYValue>
```

The host rebuilds the index when the scene changes and when the factory
changes. The index owns its search algorithm and must apply `maxDistance`.
Use the granular spatial primitive appropriate to the data; the boundary is
described in [Scales and D3](../concepts/scales-and-d3.md).

A custom `focus` strategy takes precedence over `spatialIndex` for pointer
resolution.

## Application-owned gestures

Brushes, zooming, dragging, scrolling, crosshair overlays, and selections can
listen on a wrapper or use `onRender` to attach application behavior to the
live SVG. Keep semantic state outside the scene, update a dynamic definition
through input, and clean up listeners before the next attachment or unmount.
For a completely independent renderer or interaction layer, use the scene and
extension contracts in [Custom extensions](./custom-extensions.md).
