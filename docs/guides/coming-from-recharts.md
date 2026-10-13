---
title: Coming from Recharts
description: Map common Recharts options to chart definitions, marks, scales, focus, and responsive sizing.
---

Use one `defineChart()` value for marks, scales, guides, and focus. A positional
scale is an object such as `y: { scale: scaleLinear }`, not `y: scaleLinear`.
Memoize definitions that capture React props. In Next.js, build them inside
your [client component](../framework/react/adapter.md#nextjs-app-router).

## Common options

| Recharts option       | TanStack Charts equivalent                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `ResponsiveContainer` | `Chart` observes its container; supply `height` or `aspectRatio`, and `initialWidth` for SSR.                                         |
| `tickLine={false}`    | `axis: { ticks: { size: 0 } }` keeps labels. `ticks: false` removes both stubs and labels.                                            |
| `axisLine={false}`    | `axis: { line: false }` hides only the baseline.                                                                                      |
| `tickCount`           | `axis: { ticks: { count } }` is a hint to the scale. Use `values` for exact tick candidates.                                          |
| `activeDot`           | Add a dot mark wrapped in `whenFocused(mark, { match: 'x' })`.                                                                        |
| `barGap` / `barSize`  | `barY` and `barX` use pixel `inset` and `maxThickness`; grouped band padding is a ratio.                                              |
| `baseValue`           | Set `areaY`'s `y1` or `areaX`'s `x1` explicitly. The default baseline is zero.                                                        |
| Shared tooltip        | Set `focus: 'group-x'` and add `tooltip`; use `maxFocusDistance: Number.POSITIVE_INFINITY` to focus sparse columns at any x distance. |

See [Bar and Rect](../reference/marks/bar-and-rect.md),
[Line and Area](../reference/marks/line-and-area.md),
[Tooltips and Focus](./tooltips-and-focus.md), and
[Responsive Charts](./responsive-charts.md) for complete examples.

## Defaults to compare with your existing charts

Grid lines use `strokeOpacity: 0.11`, and axis baselines use `0.28`. Set `grid`
and `axis.line` styles explicitly when matching existing paint. An `areaY`
mark's default `fillOpacity` is `0.2`, set the mark's own opacity when needed.

The default focus distance is 48 scene pixels. Axis focus modes measure that
distance along their axis, so sparse charts can have gaps where nothing takes
focus. Keep this default when empty space should clear a tooltip, or choose
an explicit larger distance.

`nice: true` rounds the domain using the responsive or authored tick count,
even with a hidden axis. On a small sparkline, use a number such as `nice: 5`
to keep the rounding policy independent of its dimensions.

## Rows without visible values

Focus points come from mark geometry. To make a missing-value row available
to a tooltip, add a zero-radius dot with one point per row and make the
visible series `decorative()`. The dot's y value must be valid within your
authored domain:

```ts
dot(rows, {
  id: 'row-focus',
  x: 'gameNumber',
  y: () => yDomain[0],
  r: 0,
})
```

With `nearest-x` or `group-x`, this mark supplies the row's semantic x value
without painting a dot. Use the normal keyed rows for keyboard and tooltip
content, and apply `whenFocused(..., { match: 'x' })` to decorative focus-only
geometry. This does not invent a value for the visible series.

## Motion and tooltips

Tooltip motion can inherit chart motion. Give `tooltip({ motion: ... })` its
own shorter policy or `motion: false` when a long data transition should not
control the tooltip. See [Tooltip motion](../reference/motion.md).
