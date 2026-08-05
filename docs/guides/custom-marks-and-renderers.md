---
title: Custom Marks and Renderers
description: Extend the grammar with typed mark channels and keyed scene nodes, or replace the mounted renderer without bypassing chart semantics.
---

Use a custom mark when a visualization fits the shared scene model but is not
expressible as a useful composition of built-in Cartesian, polar, or
geographic marks.

Use a custom renderer when the same chart scene needs a different mounted
surface. Use a custom SVG serializer when only SVG markup or resources differ.

Neither extension should reach into private scene compiler state.

## Start with composition

Before creating a mark, check whether the result is a combination of:

- lines or areas;
- rectangles or cells;
- dots or hexagons;
- rules, links, ticks, arrows, or vectors;
- text or frames;
- facets.
- polar arcs, radial paths, dots, or guides;
- projected GeoJSON.

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
required full `surface` bounds, inner `chart` plot bounds, scales, theme, color
resolver, and text layout tools.
When a custom mark emits data labels, an optional `layoutLabels(context)` can
return those positioned `SceneLabel` nodes before render so unlocked margins
contain them. Keep that method pure because responsive layout may call it more
than once; the final `render` call still happens once.

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

For a large painted mark, create the semantic point once and attach that same
object to the scene primitive that paints it:

```ts
import type { SceneRect } from '@tanstack/charts'

const point = interactionPoint(index)
const node: SceneRect = {
  kind: 'rect',
  key: point.key,
  x,
  y,
  width,
  height,
  interaction: { point, affinity: 'x' },
}

return { nodes: [node], points: [point] }
```

Use `x` for vertically oriented marks, `y` for horizontal marks, `xy` for
ordinary two-dimensional proximity, and `geometry` when only exact
containment should focus the mark. The default resolver checks containment
across every mark before applying any fallback. A continuous `polyline` or
`area` may attach all of the semantic samples it represents with
`interaction: { points, affinity }`; containment selects the closest sample
within that primitive.

Keep primitive coordinates local when returning translated groups. Scene
traversal applies nested translation, clipping, facets, and paint order after
layout. Do not calculate a second set of global hit bounds beside the rendered
node.

Omit points for decorative geometry. Do not invent fake interactive data for a
frame, grid, or threshold that should not receive focus.

## Focus-only anchors

A decorative mark can still support `whenFocused` without becoming a pointer
target. Return `focusAnchors` beside its nodes:

```ts
return {
  nodes: [node],
  focusAnchors: [
    {
      key: node.key,
      markId: id,
      group: null,
      datum,
      datumIndex: index,
      yValue: datum.value,
    },
  ],
}
```

The anchor key must identify the node or keyed group it reveals. Include only
the semantic axes the geometry owns: a horizontal rule supplies `yValue`; a
vertical rule supplies `xValue`. `focusAnchors` are read only when the mark is
wrapped in `whenFocused` and never enter pointer hit testing, tooltip data, or
keyboard navigation.

## Focus-guide marks

A mark that emits only cursor-driven rules, labels, or markers declares that
role explicitly:

```ts
import { resolveCrosshairGuide } from '@tanstack/charts/crosshair'

return {
  id,
  channels: {},
  focusGuideOnly: true,
  render({ chart, surface, scales, theme }) {
    return {
      nodes: [],
      focusGuides: [
        {
          key: id,
          markId: id,
          chart,
          surface,
          x: { style: { stroke: theme.foreground } },
          projectX: (value) => {
            const scale = scales.x
            if (!scale || scale.type === 'none') return undefined
            const position = scale.map(value)
            return Number.isFinite(position) ? position : undefined
          },
          resolve: resolveCrosshairGuide,
        },
      ],
    }
  },
}
```

`focusGuideOnly: true` keeps a guide-only mark from becoming the first ordinary
mark used to divide underlays from overlays. `MarkScene.focusGuides` accepts
`MarkFocusGuide`. Its `placement` is optional: omit it for normal mark-order
placement. An explicit `under` or `over` is reserved for composed nested scenes
that must retain placement already resolved inside that composition. Authors
do not need to invent a placement for an ordinary guide mark.

The required `surface` bounds cover the complete chart surface; `chart` covers
the inner plot. Use `chart` for clipped rules and `surface` for labels that must
remain visible. Each guide's required `resolve` callback receives the final
guide, local focus, pointer, and projected cursor, then returns one transient
scene node or `undefined`. `resolveCrosshairGuide` provides the built-in rule,
band, label, and marker behavior. A custom guide can supply different policy
without adding it to renderer bundles that never use the guide. A custom
renderer receives final `SceneFocusGuide` values after the compiler has filled
in placement. Pass the scene to `resolveFocusPresentation` instead of calling
guide resolvers or resolving mark order inside the renderer.

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
  src="https://tanstack.com/charts/catalog/embed/38-contour-topography/?theme=system&height=480"
  title="Topographic contours rendered through a custom mark"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Custom scales and legends

Configured callable scales are the normal path. `ChartScale`,
`ChartColorScale`, and `ChartColorLegend` exist for context-aware adapters that
need chart range, theme, or responsive legend geometry.

Keep specialized scale dependencies in the module that uses them. A line-only
bundle must not pay for a custom scale registered elsewhere.

See [Scales](../concepts/scales-and-d3.md) and
[Legends and Color](./legends-and-color.md).

## Custom renderer

A full renderer implements `ChartRenderer` and returns a `ChartSurface`:

```ts
import { mountChartRenderer } from '@tanstack/charts/renderer'

const host = mountChartRenderer(container, {
  definition,
  renderer: myRenderer,
  ariaLabel: 'Threshold history',
})
```

The renderer owns server shell markup, its mounted element, scene painting,
focus painting, and cleanup. It can implement `clientToScene` when controlled
pointer gestures need client-coordinate conversion; the interaction controller
returns `null` when that optional capability is absent. The host retains
sizing, runtime, keyboard, tooltip, selection, and focus-strategy behavior.
Keep `prerender` deterministic and make `mount` adopt compatible server markup.

If `paintFocus` resolves and paints inline mark-state geometry, return that
destination `ChartScene`. The host will use it for subsequent pointer hits;
returning nothing preserves base-scene interaction for simpler renderers.
Call `resolveFocusPresentation(scene, focus, pointer, cursor)` to obtain the
authored and crosshair nodes for the renderer's underlay and overlay surfaces.

If the renderer animates point geometry, implement `getPresentationPoints`
and `subscribePresentationPoints`. This keeps stationary pointer focus,
keyboard focus, and tooltip anchors aligned with the painted frame.

Use `ChartRendererRenderContext.surface` instead of assuming `onRender` exposes
an SVG element. Framework consumers pass `renderer` through
`@tanstack/react-charts/core` or `@tanstack/octane-charts/core`.

## Custom SVG serializer

A `ChartSvgRenderer` accepts the complete `ChartScene` and accessible SVG
options:

```ts
const renderSvg: ChartSvgRenderer<Row, Date, number> = (scene, options) => {
  return serializeMySvg(scene, options)
}
```

Pass it through `renderSvg` on the vanilla host or any default SVG framework
adapter. Preserve:

- the accessible label and description;
- stable `data-ts-key` identity when DOM reconciliation should reuse nodes;
- the focus marker contract when native focus remains enabled;
- scoped IDs through `idPrefix`;
- deterministic server output.

The default `renderChartSvg` already emits declared gradients and group clips.
The compatible `renderChartSvgWithResources` export remains available when an
explicit resource serializer name is useful.

Mounted SVG surfaces also call the selected serializer when focus guides are
painted. That call contains a single `focus-guide-layer:under` or
`focus-guide-layer:over` group in `scene.nodes`; preserve its keyed `<g>` and
apply the same paint, clipping, and resource-ID rules as the base scene.

## Custom focus and spatial indexes

A `ChartFocusStrategy` owns pointer resolution, grouping, and keyboard
navigation. Pointer coordinates and the point being grouped arrive through
the second context bag. Its generic types must remain identical to the chart
points it receives.

A `ChartSpatialIndexFactory` builds optional nearest-point acceleration from
scene points and receives the complete resolved scene through
`context.scene`. Return original typed points from the index. Do not erase
them to `unknown` and cast them back in callbacks.

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
