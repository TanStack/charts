---
title: View Composition
description: Compose complete chart definitions with deterministic grid, layer, fill, and inset layouts.
---

Import view composition from the exact subpath:

```ts
import {
  alignX,
  alignY,
  composeViews,
  fill,
  grid,
  inset,
  layer,
  shareX,
  shareY,
  viewGrid,
} from '@tanstack/charts/view'
```

`composeViews(options)` combines named static chart definitions into one static
chart definition. Each child remains a complete chart with its own marks,
scales, guides, margins, color, clipping, and static legends.

The public types are `ComposeViewsOptions`, `ViewDefinitions`, `ViewLayout`,
`ViewAnchor`, `ViewInsetOptions`, `ViewGridCell`, `ViewAxis`,
`ViewScaleLinkMode`, `ViewScaleLink`, `ViewTrack`, `ViewLink`, `ViewGridItem`,
and `ViewGridOptions`.

## Overlay a donut summary

`fill`, `layer`, and `inset` can place a polar chart over a Cartesian chart:

```ts
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { composeViews, fill, inset, layer } from '@tanstack/charts/view'

const summaryRows = [
  { status: 'Complete', count: 72 },
  { status: 'Remaining', count: 28 },
]

const slices = pie(summaryRows, { value: 'count' })
const summaryDefinition = defineChart({
  marks: [
    polar({
      inset: 8,
      marks: [
        radialArc(slices, {
          innerRadius: ({ radius }) => radius * 0.58,
          color: 'status',
          key: 'status',
        }),
      ],
    }),
  ],
  guides: false,
  margin: 0,
})

const definition = composeViews({
  views: {
    detail: scatterDefinition,
    summary: summaryDefinition,
  },
  layout: layer(
    fill('detail'),
    inset('summary', {
      relativeTo: 'detail',
      anchor: 'top-right',
      width: 160,
      height: 160,
      offset: 12,
    }),
  ),
})
```

`layer` resolves children in paint order, so the summary paints after the
detail chart. Every child is clipped to its resolved frame. Transparent summary
space and the donut hole add no interaction target, leaving detail geometry
behind them eligible for outer-chart focus.

An inset is relative to the complete resolved frame named by `relativeTo`, not
that child's inner plot rectangle. Its preferred width, height, and offset
shrink proportionally when the referenced frame is too small. The referenced
view must appear earlier in paint order.

## Layout primitives

- `fill(view)` gives one view all available bounds.
- `grid(options)` places views in non-overlapping named tracks.
- `layer(...layouts)` resolves layouts against the same bounds in paint order.
- `inset(view, options)` anchors a view inside an earlier resolved view frame.

Every key in `views` must be placed exactly once. Unknown, missing, and
duplicate view placements fail instead of producing a partial scene.

`grid` accepts fixed and flexible tracks:

- `{ id, size }` requests a fixed pixel size.
- `{ id, grow, min?, max? }` divides remaining space by `grow`.

Fixed sizes and minimums shrink deterministically when the host is smaller
than their preferred total. One view may occupy each row-and-column cell.

```ts
const definition = composeViews({
  views: {
    main: scatterDefinition,
    top: xHistogramDefinition,
    right: yHistogramDefinition,
  },
  layout: grid({
    rows: [
      { id: 'top', size: 72 },
      { id: 'main', grow: 1 },
    ],
    columns: [
      { id: 'main', grow: 1 },
      { id: 'right', size: 72 },
    ],
    gap: 8,
    cells: {
      main: { row: 'main', column: 'main' },
      top: { row: 'top', column: 'main' },
      right: { row: 'main', column: 'right' },
    },
  }),
  links: [shareX('top', 'main'), shareY('right', 'main')],
})
```

## Shared and aligned ranges

Scale links are separate from layout:

- `shareX(source, target)` and `shareY(source, target)` require equal resolved
  scale domains, order, direction, bandwidth, and mapping.
- `alignX(source, target)` and `alignY(source, target)` align plot endpoints
  while keeping each scale domain independent.

Linked views must have equal allocated frames along the linked axis. For
example, x-linked views must have the same frame x position and width.

Sharing does not copy or infer another view's domain. Configure the intended
domain on both child definitions so a mismatch fails visibly.

## Scene and interaction ownership

The composed definition has one chart host, accessible chart label, tooltip,
keyboard model, focus strategy, and animation lifecycle. Child points keep
their datum identity and receive stable view-prefixed keys and mark IDs. One
outer default focus layer covers every child; explicit child focus and
mark-state layers remain part of their child scenes.

Apply host options to the composed definition:

```ts
const interactiveDefinition = defineChart(definition, {
  keyboard: true,
  maxFocusDistance: 40,
})
```

Children must be static definitions. Child-owned host behavior and resources
that cannot be adopted into the outer scene are rejected, including selection,
behaviors, interactive controls, tooltips, keyboard options, definition-level
motion, gradients, scene backgrounds, and guide motion. Mark-local motion and
static legends remain supported. Use an ordinary mark for a child background.

Use separate chart hosts when panels need independent host behavior or
independent accessible labels.

## `viewGrid` convenience syntax

`viewGrid` remains an ergonomic wrapper for a non-overlapping grid. It lowers
to the same composition, layout, and scale-link machinery:

```ts
const definition = viewGrid({
  rows: [
    { id: 'top', size: 72 },
    { id: 'main', grow: 1 },
  ],
  columns: [{ id: 'main', grow: 1 }],
  gap: 8,
  views: [
    {
      id: 'top',
      row: 'top',
      column: 'main',
      share: { x: 'main' },
      chart: xHistogramDefinition,
    },
    {
      id: 'main',
      row: 'main',
      column: 'main',
      chart: scatterDefinition,
    },
  ],
})
```

Use `composeViews` when the layout combines grids, layers, or insets. Use
`viewGrid` when one named view per grid cell is the clearest expression.
