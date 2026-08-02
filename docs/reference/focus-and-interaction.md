---
title: Focus and Interaction
description: Configure pointer focus, grouped focus, keyboard navigation, native tooltips, selection, and spatial indexes.
---

The DOM host and framework adapters provide point-level interaction from each
mark's emitted `ChartPoint` values and rendered scene primitives. The defaults
cover geometry-aware pointer focus, linear keyboard navigation, activation,
and an optional native tooltip. Definitions own these policies; adapters only
mount them and report events.

## Default behavior

With no custom focus strategy:

- pointer movement finds the nearest point within `maxFocusDistance`
- pointer leave or cancellation clears unpinned focus
- the SVG uses `tabIndex` (`0` by default) when `keyboard` is enabled
- focusing the SVG selects the first point in the keyboard task order
- arrow keys move through points sorted by pixel x, then pixel y
- `Home` and `End` move to the first and last point
- `Enter` and Space toggle an enabled sticky tooltip and call `onSelect` for
  the focused point
- a click focuses and selects the nearest point, or selects `null`
- the renderer's focus ring follows the primary point

`maxFocusDistance` defaults to `48` scene pixels. Set `tabIndex` to control
normal tab-order participation while keeping keyboard handling enabled. Set
`keyboard: false` to remove keyboard navigation and force tab index `-1`.
Authored `whenFocused` marks compose with the primary-point ring. Set
definition `focusRing: false` only when authored focus geometry replaces that
indicator.

### Interaction geometry

When neither `focus` nor `spatialIndex` is supplied, pointer resolution has two
stages:

1. The topmost interactive scene primitive containing the pointer wins. The
   resolver traverses the final scene in reverse paint order and applies nested
   translations and clips.
2. If no primitive contains the pointer, its `interaction.affinity` ranks the
   fallback. `x` and `y` compare distance from that axis boundary first and use
   complete geometry distance to break ties; `xy` compares complete geometry
   distance; `geometry` has no off-shape fallback.

`maxFocusDistance` applies to that primary boundary distance, not necessarily
to the point used as the tooltip and keyboard anchor. A semantic point that is
not attached to a scene primitive retains anchor-based two-dimensional
distance.

The primitive is the geometry source of truth: `rect` includes its rounded
corners, `dot` uses its radius, `area` uses its polygon, and `polyline` and
`rule` use their stroked paths. Its `interaction` attaches either one semantic
point or the ordered points represented by a continuous primitive. Groups and
labels cannot carry interaction metadata.

Built-in marks attach these natural defaults:

| Mark                     | Scene primitive       | Fallback |
| ------------------------ | --------------------- | -------- |
| `barY`                   | Rounded rectangle     | `x`      |
| `barX`                   | Rounded rectangle     | `y`      |
| `lineY`                  | Stroked polyline      | `x`      |
| `areaY`                  | Filled area           | `x`      |
| `areaX`                  | Filled area           | `y`      |
| `rect`, `dot`, `hexagon` | Rect, circle, polygon | `xy`     |
| `bandX`                  | Rounded rectangle     | `x`      |
| `bandY`                  | Rounded rectangle     | `y`      |

Facet layout rewrites the primitive's attached point references while leaving
the primitive in local coordinates. The resolver therefore observes the same
post-layout translations and clips as SVG and Canvas instead of maintaining a
second geometry copy. Inline mark states similarly return a resolved scene to
the host; during a transition, pointer selection intentionally follows that
destination scene rather than interpolating a second hit-test scene.

For curved `polyline` and `area` nodes, the current resolver uses the
primitive's structured point geometry. Exact picking against an optional
authored SVG path string remains a separate refinement.

An explicit focus preset or custom strategy replaces this default resolver.

## Focus modes

Use a preset for built-in focus behavior:

```ts
import { tooltip } from '@tanstack/charts/tooltip'

const groupedDownloads = defineChart(definition, {
  focus: 'group-x',
  tooltip,
})
```

| Preset      | Pointer resolution                                 | Group returned to callbacks and tooltip                               | Keyboard navigation                     |
| ----------- | -------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| `nearest`   | Nearest point in two dimensions                    | Primary point only                                                    | Every point                             |
| `nearest-x` | Nearest x coordinate, then nearest y               | Primary point only                                                    | Every point                             |
| `nearest-y` | Nearest y coordinate, then nearest x               | Primary point only                                                    | Every point                             |
| `group-x`   | Nearest x coordinate, then nearest y within that x | One point per group sharing the semantic x value; nearest point first | One representative per semantic x value |
| `group-y`   | Nearest y coordinate, then nearest x within that y | One point per group sharing the semantic y value; nearest point first | One representative per semantic y value |

Grouping compares semantic values, including dates by timestamp. Duplicate
points with the same `group` value are reduced to one member in grouped focus.

The equivalent `focusX`, `focusY`, `focusNearestX`, and `focusNearestY`
strategy objects remain available from `@tanstack/charts/focus` for composition
or direct strategy use.

## Disabling chart-owned focus

```ts
import { focusDisabled } from '@tanstack/charts/focus/disabled'
```

`focusDisabled` resolves, groups, and navigates to no points. Use it when an
application owns gestures, selection paint, accessibility, and task semantics
outside the native focus layer. It does not remove the rendered focus node or
other DOM listeners; set definition `keyboard: false` and omit its `tooltip`
as appropriate for the application-owned interaction.

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

`ChartFocusMode` accepts a `ChartFocusPreset` string or a
`ChartFocusStrategy`.

## Tooltips

Import `tooltip` from `@tanstack/charts/tooltip` and place it on the definition
for the native accessible tooltip. The default is a structured label-value
table. Grouped focus adds a shared-axis heading and one color swatch and value
row per series. Visible axis labels are reused. Numbers use browser locale
formatting; dates use stable UTC ISO formatting.

```ts
interface ChartTooltipOptions<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  className?: string
  portal?: ChartTooltipPortalInput
  items?: readonly ChartTooltipItem<TDatum, TXValue, TYValue>[]
  sort?: ChartTooltipSort<TDatum, TXValue, TYValue>
  anchor?: ChartTooltipAnchor<TDatum, TXValue, TYValue>
  placement?: 'auto' | ChartTooltipPlacement | readonly ChartTooltipPlacement[]
  offset?: number
  content?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartTooltipContentContext,
  ) => ChartTooltipContent
  format?: (point: ChartPoint<TDatum, TXValue, TYValue>) => string
  formatGroup?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ) => string
  sticky?: boolean
}
```

| Option        | Default        | Meaning                                              |
| ------------- | -------------- | ---------------------------------------------------- |
| `className`   | None           | Class appended after `ts-chart-tooltip`              |
| `portal`      | None           | Optional top-layer or fixed-position transport       |
| `items`       | Automatic x/y  | Ordered rows for a single focused point              |
| `sort`        | `visual`       | Grouped row order                                    |
| `anchor`      | `point`        | Preset, per-axis coordinates, or coordinate resolver |
| `placement`   | `auto`         | Fixed or ordered fallback box placements             |
| `offset`      | `10`           | Scene-pixel gap between anchor and box               |
| `content`     | Automatic rows | Returns a safe title and structured rows             |
| `format`      | None           | Replaces content with primary-point text             |
| `formatGroup` | None           | Replaces content with focused-group text             |
| `sticky`      | `true`         | Enables activation-to-pin and text selection         |

Formatting precedence is `content`, `formatGroup`, `format`, then the default.
The text formatters do not parse HTML, and newlines are preserved. `className`
is appended to `ts-chart-tooltip`.

### Ordered point items

`items` is an ordered single-point row list. Use `x`, `y`, and `group`
shorthands, a configured channel, a scalar datum field, or derived text:

```ts
const detailedDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    items: [
      {
        channel: 'y',
        label: 'Revenue',
        text: (point) => currency(point.yValue),
      },
      {
        field: 'volume',
        label: 'Volume',
        text: (point) => compact(point.datum.volume),
      },
      {
        id: 'change',
        label: 'Change',
        text: (point) =>
          point.datum.change == null ? null : percent(point.datum.change),
      },
      'x',
      'group',
    ],
  },
})
```

Array order is row order. A nullish datum field or nullish `text` result omits
the row. Adding `group` to `items` renders it as a row instead of the automatic
single-point title. In grouped focus, the shared-axis item supplies the heading
label and text, the opposite-axis item formats values, and the group item
formats series names. `sort` orders those generated series rows. Additional
grouped structure belongs in `content`.

`sort` accepts `visual`, `color-domain`, `focus`, or a typed point comparator.
Visual order follows the marks across the screen: top-to-bottom for an x-group
and left-to-right for a y-group.

### Anchor and placement

`anchor` controls the scene coordinate followed by the box:

- `point` follows the primary focused point.
- `pointer` follows the current pointer and falls back to the point for
  keyboard focus.
- `group-center` uses the center of the focused points' bounding box.
- `{ x, y }` chooses each coordinate from point, pointer, semantic value,
  group center, or a plot edge.
- A resolver receives the focused points plus `{ focus, pointer, plot,
surface, scales }` and returns scene coordinates. A nullish or non-finite
  result falls back to the primary point.

`placement` accepts `auto`, one placement, or an ordered fallback list. The
placements are `top`, `top-right`, `right`, `bottom-right`, `bottom`,
`bottom-left`, `left`, and `top-left`. A single placement is fixed and shifted
inside the surface. A list uses the first placement that fits; if none fits,
it uses the least-overflowing candidate and shifts it inside. `auto` uses
`top`, `bottom`, `right`, then `left`.

```ts
const groupedDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    anchor: { x: 'plot-center', y: 'plot-top' },
    placement: ['top', 'right', 'left', 'bottom'],
    offset: 12,
  },
})
```

Import `portal` from `@tanstack/charts/tooltip/portal` and assign it to the
tooltip's `portal` option when an ancestor clips overflow or creates an
incompatible stacking context. The host opens the tooltip as a manual Popover
in the browser top layer where supported, while retaining its chart DOM
ancestry. If Popover is unavailable or fails, it moves the tooltip directly
under the chart's `ownerDocument` body with fixed high-stack positioning. Both
paths map the scene anchor to viewport coordinates, reposition during scroll,
resize, and content resize, and collide against the viewport instead of the
chart box.

Clicking, Enter, or Space pins the tooltip. The next activation unpins it.
`Escape` unpins and clears focus. Set `sticky: false` to disable pinning. A
display-only tooltip has `role="status"` and `aria-live="polite"`.

`content` supports display-only rows. Every framework adapter can compose
native content around those rows while preserving the definition's ordering,
anchor, placement, portal, and pinning behavior. A pinned custom body has
non-modal dialog semantics.

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

The default lookup scans the cached scene targets linearly. Dense charts can
inject an index:

```ts
type ChartSpatialIndexFactory<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> = (
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  scene: ChartScene<TDatum, TXValue, TYValue>,
) => ChartSpatialIndex<TDatum, TXValue, TYValue>
```

The host rebuilds the index when the scene or definition changes. The index
owns its search algorithm and must apply `maxDistance`. Existing point-only
factories can ignore the second argument; geometry-aware indexes can traverse
the resolved scene and use primitive bounds as their acceleration layer.
Use the granular spatial primitive appropriate to the data; the boundary is
described in [Scales and D3](../concepts/scales-and-d3.md).

Supplying an index also replaces default primitive containment and affinity
ranking; the host does not add a linear safety scan after an indexed query. An
index that wants identical geometry semantics should index scene-primitive
bounds and perform exact shape checks on its candidates.

A custom `focus` strategy takes precedence over `spatialIndex` for pointer
resolution.

## Application-owned gestures

Brushes, zooming, dragging, scrolling, crosshair overlays, and selections can
listen on a wrapper or use `onRender` to attach application behavior to the
live SVG. Keep semantic state outside the scene, update a dynamic definition
by replacing its identity, and clean up listeners before the next attachment
or unmount.
For a completely independent renderer or interaction layer, use the scene and
extension contracts in [Custom extensions](./custom-extensions.md).
