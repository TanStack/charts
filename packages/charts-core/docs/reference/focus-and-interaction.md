---
title: Focus and Interaction
description: Configure pointer focus, grouped focus, crosshairs, controlled cursors, keyboard navigation, native tooltips, selection, and spatial indexes.
---

The DOM hosts, framework adapters, and React Native `Chart` provide point-level
interaction from each mark's emitted `ChartPoint` values and rendered scene
primitives. The defaults cover geometry-aware pointer or responder focus,
linear keyboard or accessibility navigation, activation, and an optional
native tooltip. Definitions own these policies; adapters mount them and report
events.

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

Set `pointer: false` when the application owns the pointer gesture but still
wants chart focus, focus marks, and tooltips. Automatic pointer move, leave,
and click handling stops; keyboard navigation remains independent. Resolve and
paint application-owned focus through `host.interaction` or the interaction
controller reported by `onRender`.

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

With an active axis viewport, the host calls
`viewportInteractionPoints(scene, presentationPoints)` before pointer,
keyboard, custom-focus, or spatial-index resolution. Off-window anchors from
clipped viewport content remain in `scene.points` but are not focus candidates;
fixed-ownership mark points remain eligible. Direct scene consumers can pass
that filtered list as the optional final argument to
`findNearestPoint(scene, x, y, maxDistance, points)` so primitive hit testing
uses the same candidate set.

For curved `polyline` and `area` nodes, the current resolver uses the
primitive's structured point geometry. Exact picking against an optional
authored SVG path string remains a separate refinement.

Built-in axis focus modes compose painted containment with axis snapping. When
the pointer is inside an interactive primitive, the topmost painted mark seeds
the primary point. Outside painted geometry, the configured axis mode uses its
normal nearest-axis fallback. A custom strategy replaces this host behavior.

## Focus modes

Use a preset for built-in focus behavior:

```ts
import { tooltip } from '@tanstack/charts/tooltip'

const groupedDownloads = defineChart(definition, {
  focus: 'group-x',
  tooltip,
})
```

| Preset      | Pointer resolution                                                     | Group returned to callbacks and tooltip                               | Keyboard navigation                     |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| `nearest`   | Nearest painted geometry or point in two dimensions                    | Primary point only                                                    | Every point                             |
| `nearest-x` | Containing painted mark; otherwise nearest x, then nearest y           | Primary point only                                                    | Every point                             |
| `nearest-y` | Containing painted mark; otherwise nearest y, then nearest x           | Primary point only                                                    | Every point                             |
| `group-x`   | Containing painted mark; otherwise nearest x, then nearest y at that x | One point per group sharing the semantic x value; primary point first | One representative per semantic x value |
| `group-y`   | Containing painted mark; otherwise nearest y, then nearest x at that y | One point per group sharing the semantic y value; primary point first | One representative per semantic y value |

Grouping compares semantic values, including dates by timestamp. Duplicate
points with the same `group` value are reduced to one member in grouped focus.

The equivalent `focusX`, `focusY`, `focusNearestX`, and `focusNearestY`
strategy objects remain available from `@tanstack/charts/focus` for composition
or direct strategy use. The exact exported objects receive the same host-level
containment behavior as their presets. A strategy that wraps or copies one of
them is custom and owns its complete pointer resolution.

## Crosshair guides

`crosshair` is a data-less presentation mark. It follows the chart's resolved
focus state without adding scale values or pointer targets:

```ts
import { crosshair, defineChart, lineY } from '@tanstack/charts'

const definition = defineChart({
  marks: [
    lineY(rows, { x: 'date', y: 'value', color: 'series' }),
    crosshair({
      x: { label: true },
      y: false,
      strokeDasharray: '4 4',
    }),
  ],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
  focus: 'group-x',
  maxFocusDistance: Number.POSITIVE_INFINITY,
})
```

The x guide is vertical and the y guide is horizontal. Both default to
enabled; labels and the intersection marker default to disabled. Shared rule
options apply to both axes, and an axis object can override them. A label uses
the matching resolved tick label when available, falls back to the semantic
value, and accepts a `format` callback. Labels are clamped to the chart surface
and rendered with a configurable halo. Rules and the optional marker are
clipped to the plot. For difference intervals such as stacked bars and areas,
the label formats the plotted `x2` or `y2` endpoint so it matches the guide;
tooltip formatting still reports the interval difference.

`crosshair<TXValue, TYValue>(options = {})` accepts these top-level options:

| Option   | Default                   | Meaning                                      |
| -------- | ------------------------- | -------------------------------------------- |
| `id`     | `crosshair-${markIndex}`  | Stable mark and guide identity               |
| `x`      | `true`                    | Vertical rule or categorical band            |
| `y`      | `true`                    | Horizontal rule or categorical band          |
| `marker` | `false`                   | Marker at the resolved x/y intersection      |
| `motion` | No mark-specific override | Optional guide spring or tween configuration |

The shared rule options apply to both axes. The same fields on an axis object
override the shared value for that axis:

| Rule option       | Default          | Meaning                            |
| ----------------- | ---------------- | ---------------------------------- |
| `stroke`          | Chart foreground | Rule color                         |
| `strokeOpacity`   | `0.35`           | Rule stroke opacity                |
| `strokeWidth`     | `1`              | Nonnegative rule width             |
| `strokeDasharray` | None             | SVG-compatible stroke dash pattern |

An x or y axis object adds two options:

| Axis option | Default | Meaning                                       |
| ----------- | ------- | --------------------------------------------- |
| `label`     | `false` | `true` for defaults or a label options object |
| `band`      | `false` | `true` for defaults or a band options object  |

On a categorical axis, `band` replaces that axis rule with a plot-spanning
cursor band centered on the focused value:

```ts
marks: [
  crosshair({
    x: {
      band: {
        inset: 0,
        radius: 3,
        fill: '#64748b',
        fillOpacity: 0.16,
      },
      label: true,
    },
    y: false,
  }),
  barY(rows, {
    x: 'period',
    y: 'value',
    color: 'series',
    inset: 4,
  }),
  crosshair({
    x: false,
    y: { strokeDasharray: '4 4', label: true },
  }),
]
```

The first guide is an underlay because it precedes the bars; the second is an
overlay. With a bar inset of 4 and band inset of 0, the cursor extends exactly
4 pixels beyond each bar edge. Its x label shows the focused period; the y rule
label shows the focused stack endpoint. Use separate crosshair marks whenever
axes need different placement.

| Band option     | Default          | Meaning                                                                  |
| --------------- | ---------------- | ------------------------------------------------------------------------ |
| `inset`         | `0`              | Pixels removed from both scale-band edges; negative values create outset |
| `radius`        | None             | Corner radius                                                            |
| `fill`          | Chart foreground | Fill color                                                               |
| `fillOpacity`   | `0.12`           | Fill opacity                                                             |
| `stroke`        | None             | Optional outline color                                                   |
| `strokeOpacity` | None             | Optional outline opacity                                                 |
| `strokeWidth`   | None             | Optional nonnegative outline width                                       |
| `opacity`       | None             | Opacity applied to the complete band                                     |

`band: true` uses those defaults. Band geometry uses the resolved scale
bandwidth, spans the plot in the other direction, and remains clipped to the
plot. A continuous scale or any other axis with zero bandwidth emits no band.
The axis label can still be enabled because `band` replaces only the rule.

Label options control formatting and paint outside the plot:

| Label option    | Default                                        |
| --------------- | ---------------------------------------------- |
| `format`        | Matching scale tick label, then semantic value |
| `offset`        | `8`                                            |
| `fill`          | Chart foreground                               |
| `fillOpacity`   | None                                           |
| `stroke`        | `var(--ts-chart-crosshair-label-halo, Canvas)` |
| `strokeOpacity` | None                                           |
| `strokeWidth`   | `3`                                            |
| `opacity`       | None                                           |
| `fontSize`      | `11`                                           |
| `fontWeight`    | None                                           |

Marker options control the resolved x/y intersection marker:

| Marker option   | Default                                         |
| --------------- | ----------------------------------------------- |
| `radius`        | `4`                                             |
| `fill`          | `var(--ts-chart-crosshair-marker-fill, Canvas)` |
| `fillOpacity`   | None                                            |
| `stroke`        | Focused point color, then guide or theme color  |
| `strokeOpacity` | None                                            |
| `strokeWidth`   | `2`                                             |
| `opacity`       | None                                            |

Pass semantic axis types to `crosshair` when TypeScript should check label
formatters independently from the surrounding definition:

```ts
crosshair<Date, number>({
  x: { label: { format: (value) => value.toISOString() } },
  y: { label: { format: (value) => value.toFixed(1) } },
})
```

Mark order controls placement. Put `crosshair(...)` before the first ordinary
mark for an underlay, or after it for an overlay. The default primary focus
ring still composes with the crosshair; set `focusRing: false` only when the
crosshair marker or other authored geometry deliberately replaces it.

The guide is `aria-hidden`. Pointer and keyboard users reach the same focus
state through the chart root, callbacks, and optional tooltip. `motion` on the
crosshair controls its keyed rules, bands, labels, and marker when the
definition is mounted with the optional motion renderer. Active guide
placements remain visible through keyed scene updates so restored focus
animates from the previous geometry.

## Controlled cursors

Import the controller and host extension from the isolated cursor entry when
interaction state must be shared or set programmatically:

```ts
import { createChartCursor, cursorHost } from '@tanstack/charts/cursor'

const sharedDate = createChartCursor<Date, number>()

const definition = defineChart({
  marks: [
    lineY(rows, { x: 'date', y: 'value' }),
    crosshair({ x: { label: true }, y: false }),
  ],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
  focus: 'group-x',
  cursor: {
    use: cursorHost,
    controller: sharedDate,
    mode: 'focus',
    match: 'x',
    pin: true,
  },
})
```

```ts
function createChartCursor<
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
>(
  initialState: ChartCursorState<TXValue, TYValue> | null = null,
): ChartCursorController<TXValue, TYValue>
```

Every definition cursor binding accepts these common fields:

| Option       | Default  | Meaning                                      |
| ------------ | -------- | -------------------------------------------- |
| `use`        | Required | Cursor host extension, normally `cursorHost` |
| `controller` | Required | Observable structural cursor controller      |
| `mode`       | Required | `focus` or `free` binding discriminator      |
| `pin`        | `false`  | Enables activation to pin and dismiss        |

Mode-specific fields are:

| Mode    | Option  | Default | Meaning                                    |
| ------- | ------- | ------- | ------------------------------------------ |
| `focus` | `match` | `xy`    | Semantic axes shared between hosts         |
| `free`  | `x`     | None    | Optional x-axis `valueAt` semantic mapping |
| `free`  | `y`     | None    | Optional y-axis `valueAt` semantic mapping |

Each free-axis object accepts an optional `valueAt(context)` callback. Without
it, the cursor still shares scene and normalized coordinates but has no
semantic value for that axis.

`createChartCursor` remains a three-method structural store. `cursorHost` opts
the binding into platform-neutral cursor policy without adding that policy to
charts that do not use cursors. Adapter and renderer authors can import the
projection, focus, presentation, and session helpers from
`@tanstack/charts/cursor/host`; application code normally uses the token from
`@tanstack/charts/cursor`.

`ChartCursorExtensionToken` is the environment-neutral binding contract.
`cursorHost` implements it as a `ChartCursorHostExtension`. Adapter authors
call `createChartCursorHostSession(binding)` to create an ownership-safe
`ChartCursorHostSession` for one mounted binding.

That host entry uses `createFocusChartCursorState` and
`createFreeChartCursorState` to publish state, then
`resolveChartCursorPresentation` and `resolveChartCursorFocus` to project it
into each scene. `resolveChartPointerFocus` composes built-in axis focus with
painted containment and returns `undefined` for default nearest focus so a host
can apply its spatial index or renderer geometry. `resolveChartFocusStrategy`
converts a built-in focus name to its grouping strategy.
`resolveFocusPresentation` finally produces renderer-neutral underlay and
overlay nodes. An empty array from `resolveChartPointerFocus` means an explicit
strategy found no target. Pass `scene.points` (the default) as its final
argument to enable painted containment. A distinct array explicitly signals
active renderer presentation points and preserves anchor resolution while
those interpolated points are authoritative.

Use the same controller in several browser or React Native definitions to
synchronize by semantic value rather than pixel position. In `focus` mode,
pointer, responder, keyboard, or accessibility focus publishes a
value-anchored cursor. Each subscribing host maps the value through its own
scales, resolves its own local point and focus group, and paints its crosshair
and tooltip. `match` defaults to `xy`; choose `x` or `y` for an axis cursor.
The originating point's group is retained as the preferred series when more
than one local point matches. Optional `ChartCursorState.origin` carries
`{ key, markId, datumIndex }` to retain the local point when equal values
repeat, including across facets. A unique `key` plus `markId` survives data
reordering; `datumIndex` disambiguates duplicate keys. A consuming scene
ignores the tie-breaker when its key and mark do not exist, then resolves from
the portable semantic `value` and preferred `group`.

`free` mode follows plot coordinates without resolving a datum:

```ts
const freeCursor = createChartCursor<Date, number>()

const definition = defineChart(baseDefinition, {
  cursor: {
    use: cursorHost,
    controller: freeCursor,
    mode: 'free',
    pin: true,
    x: {
      valueAt: ({ scene, position }) =>
        xScale
          .copy()
          .range([scene.chart.x, scene.chart.x + scene.chart.width])
          .invert(position),
    },
    y: {
      valueAt: ({ scene, position }) =>
        yScale
          .copy()
          .range([scene.chart.y + scene.chart.height, scene.chart.y])
          .invert(position),
    },
  },
})
```

The host publishes normalized plot coordinates so the free cursor survives a
responsive relayout. `valueAt` optionally adds semantic values for labels and
application state; inversion and precision remain owned by the configured
scale. Programmatic state may instead use `anchor: 'value'`,
`anchor: 'normalized'`, or `anchor: 'scene'`. Only the anchor's coordinate
space is authoritative; the other fields are diagnostics from the host that
last emitted the state.

`createChartCursor` returns `getState`, `setState`, and `subscribe`. Passing
`null` clears the cursor, and `setState` accepts a previous-state updater.
Unpinned host-owned state clears on pointer or responder cancellation, leave,
and blur. Cleanup is ownership-safe: a host clears only the exact unpinned
state object it most recently published to that controller. State replaced by
the application or another host, and pinned state, survives that host's
cleanup, rebinding, and unmount.

With `pin: true`, click or tap pins. Browser focus cursors toggle through Enter
or Space and dismiss through Escape; React Native focus cursors expose the
equivalent activate and escape accessibility actions. A pinned free cursor can
be toggled by another click or tap, or cleared programmatically.

Free mode deliberately does not invent keyboard datum navigation. When its
values are part of the reader's task, pair it with a labeled semantic control
or status output. A focus-mode cursor inherits the chart's existing keyboard
navigation and accessible tooltip behavior.

Definition cursor bindings have browser and React Native host parity. DOM
renderer hosts publish pointer and keyboard interaction. React Native `Chart`
publishes responder gestures and, for focus mode, accessibility navigation,
activation, and dismissal. Both hosts subscribe to programmatic updates and
shared controllers. Free mode deliberately remains a coordinate gesture with
no invented keyboard or accessibility datum order.

## Disabling chart-owned focus

Set `focus: false` to disable native pointer and keyboard point focus. The
scene keeps its semantic points but omits the generated default focus layer,
and the DOM host forces the chart surface out of the tab order. Explicit
focus-only marks remain available to custom renderers and programmatic paint.

```ts
import { focusDisabled } from '@tanstack/charts/focus/disabled'
```

`focusDisabled` resolves, groups, and navigates to no points. Use it when an
application owns gestures, selection paint, accessibility, and task semantics
outside the native resolver but still needs the rendered focus layer. Set
definition `keyboard: false` and omit its `tooltip` as appropriate for that
application-owned interaction.

## Custom focus strategies

```ts
interface ChartFocusStrategy<
  TDatum = unknown,
  TXValue extends ChartValue = ChartValue,
  TYValue extends ChartValue = ChartValue,
> {
  resolve(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusResolveContext,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[]

  group(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartFocusGroupContext<TDatum, TXValue, TYValue>,
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[]

  navigation(
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
  ): readonly ChartPoint<TDatum, TXValue, TYValue>[]
}
```

`ChartFocusResolveContext` contains scene-pixel `x`, `y`, and `maxDistance`.
`resolve` returns the primary point first. `ChartFocusGroupContext` contains
the point restored or reached through keyboard navigation. `navigation`
returns the ordered keyboard task set.

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
  format?: (
    point: ChartPoint<TDatum, TXValue, TYValue>,
    context: ChartTooltipContentContext,
  ) => string
  formatGroup?: (
    points: readonly ChartPoint<TDatum, TXValue, TYValue>[],
    context: ChartTooltipContentContext,
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

`ChartTooltipContentContext.pinned` is `false` during transient inspection and
`true` after activation. `content`, `format`, `formatGroup`, and item `text`
receive the same context, so either structured or plaintext content can reveal
additional detail when pinned.

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
  context: ChartSpatialIndexFactoryContext<TDatum, TXValue, TYValue>,
) => ChartSpatialIndex<TDatum, TXValue, TYValue>
```

The host rebuilds the index when the scene or definition changes. The index
owns its search algorithm and must apply `maxDistance`. Point-only factories
can ignore the second argument; geometry-aware indexes can traverse
`context.scene` and use primitive bounds as their acceleration layer.
Use the granular spatial primitive appropriate to the data; the boundary is
described in [Scales](../concepts/scales-and-d3.md).

Supplying an index also replaces default primitive containment and affinity
ranking; the host does not add a linear safety scan after an indexed query. An
index that wants identical geometry semantics should index scene-primitive
bounds and perform exact shape checks on its candidates.

A custom `focus` strategy takes precedence over `spatialIndex` for pointer
resolution.

## Application-owned gestures

Brushes, zooming, dragging, scrolling, and selections can listen on a wrapper
or use `onRender` to attach application behavior. Keep semantic state outside
the scene and update a dynamic definition by replacing its identity.

Use a definition cursor binding for snapped or free crosshairs. Keep other
semantic state outside the scene and update a dynamic definition by replacing
its identity.

For application-timed datum inspection, use the stable controller instead of
reimplementing coordinate conversion and focus:

```ts
const position = interaction.clientToScene(event.clientX, event.clientY)
const target = interaction.resolvePointer(event.clientX, event.clientY)
interaction.setControlledFocus(target)
interaction.setControlledFocus(null)
```

The resolution contains the scene position, primary point, and focus group.
Passing that resolution to `setControlledFocus` infers `source: 'pointer'` and
re-resolves its held position after scene and presentation updates. Passing a
raw `ChartPoint` defaults to `source: 'programmatic'`; either source can be
overridden explicitly. Controlled focus is not cleared by unrelated
pointer-leave or focus-out events. Pass `{ pinned: true }` to make an enabled
sticky tooltip interactive.

Clean up application listeners before the next attachment or unmount.
For a completely independent renderer or interaction layer, use the scene and
extension contracts in [Custom extensions](./custom-extensions.md).
