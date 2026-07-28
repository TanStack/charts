---
title: Custom Marks and Renderers
description: Extend the grammar with typed mark channels and keyed scene nodes, or replace SVG serialization without bypassing chart semantics.
---

Use a custom mark when a visualization fits the chart's cartesian scale and
scene model but is not expressible as a useful composition of built-in marks.

Use a custom renderer when the same chart scene needs different SVG
serialization or resources.

Neither extension should reach into private scene compiler state.

## Start with composition

Before creating a mark, check whether the result is a combination of:

- lines or areas;
- rectangles or cells;
- dots or hexagons;
- rules, links, ticks, arrows, or vectors;
- text or frames;
- facets.

Composition retains built-in type inference, focus metadata, animation, and
subpath bundle boundaries. The [chart examples](../examples/index.md) show
boxplots, candlesticks, networks, and annotations built this way.

## Create a mark

`createMark` is the normal extension boundary:

<!-- docs-example: custom-mark typecheck -->

```ts
import { createMark } from '@tanstack/charts'

interface ThresholdDatum {
  id: string
  value: number
}

const threshold = createMark<ThresholdDatum, never, number>(({ markIndex }) => {
  const id = `threshold-${markIndex}`
  const datum: ThresholdDatum = { id: 'target', value: 75 }

  return {
    id,
    channels: {
      y: {
        scale: 'y',
        values: [datum.value],
      },
    },
    render({ chart, scales, theme }) {
      const y = scales.y.map(datum.value)
      return {
        nodes: [
          {
            kind: 'rule',
            key: datum.id,
            x1: chart.x,
            x2: chart.x + chart.width,
            y1: y,
            y2: y,
            style: {
              stroke: theme.foreground,
              strokeOpacity: 0.55,
            },
          },
        ],
      }
    },
  }
})
```

`initialize` materializes channels for one scene build. `render` receives the
resolved plot bounds, scales, theme, color resolver, and text layout tools.

Available scene nodes:

- `group`;
- `rule`;
- `polyline`;
- `area`;
- `dot`;
- `rect`;
- `label`.

Every node requires a deterministic key.

## Interaction points

The threshold above is decorative, so it emits no points. Return `ChartPoint`
records when custom geometry should participate in focus, tooltips, keyboard
navigation, or selection.

Each point should retain:

- its original datum;
- a stable key;
- semantic x and y values;
- resolved pixel coordinates;
- group identity and color.

Omit points for decorative geometry. Do not invent fake interactive data for a
frame, grid, or threshold that should not receive focus.

## Separate point and scale values

Most marks use the same value type for interaction and scale domains. When
they intentionally differ, import the advanced factory:

```ts
import { createMarkWithScaleValues } from '@tanstack/charts/mark/scale-values'

createMarkWithScaleValues<Datum, PointX, PointY, ScaleX, ScaleY>(initialize)
```

This is useful for interval endpoints or custom layouts whose interactive
anchor is not the complete set of values materialized on an axis.

Use `ChartMarkPointX` and `ChartMarkPointY` for the interaction contract and
`ChartMarkScaleX` and `ChartMarkScaleY` for the positional contract. Ordinary
chart code should rely on definition inference instead.

<iframe
  src="https://tanstack.com/charts/catalog/embed/38-contour-topography/?theme=system&height=400"
  title="Topographic contours rendered through a custom mark"
  loading="lazy"
  style="width: 100%; height: 400px; border: 0;"
></iframe>

## Custom scales and legends

Configured callable D3 scales are the normal path. `ChartScale`,
`ChartColorScale`, and `ChartColorLegend` exist for context-aware adapters that
need chart range, theme, or responsive legend geometry.

Keep specialized scale dependencies in the module that uses them. A line-only
bundle must not pay for a custom scale registered elsewhere.

See [Scales and D3](../concepts/scales-and-d3.md) and
[Legends and Color](./legends-and-color.md).

## Custom SVG renderer

A `ChartSvgRenderer` accepts the complete `ChartScene` and accessible SVG
options:

```ts
const renderSvg: ChartSvgRenderer<Row, Date, number> = (scene, options) => {
  return serializeMySvg(scene, options)
}
```

Pass it through `renderSvg` on the vanilla, React, or Octane host. Preserve:

- the accessible label and description;
- stable `data-ts-key` identity when DOM reconciliation should reuse nodes;
- the focus marker contract when native focus remains enabled;
- scoped IDs through `idPrefix`;
- deterministic server output.

Use `renderChartSvgWithResources` from
`@tanstack/charts/svg/resources` when the only missing behavior is gradients or
clipping.

## Custom focus and spatial indexes

A `ChartFocusStrategy` owns pointer resolution, grouping, and keyboard
navigation. Its generic types must remain identical to the chart points it
receives.

A `ChartSpatialIndexFactory` builds optional nearest-point acceleration from
scene points. Return original typed points from the index. Do not erase them to
`unknown` and cast them back in callbacks.

## Extension checklist

- Built-in composition was considered first.
- Channel values fully declare positional domain inputs.
- Scene generation is deterministic and DOM-free.
- Keys survive reorder and updates.
- Interactive points retain original data and exact coordinate types.
- Decorative geometry emits no fake points.
- Optional dependencies remain behind the extension import.
- Custom rendering preserves accessibility, identity, and SSR.
- No cast, private import, or suppression is needed at the public boundary.
