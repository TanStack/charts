---
title: Interactions and Selections
description: Build controlled cursors, linked selections, brushes, zooming, scrolling, timelines, and editors around semantic chart state.
---

TanStack Charts owns datum focus, crosshair presentation, and optional cursor
bindings. The application owns shared cursor-controller identity and gestures
that change a domain, range, viewport, or product record.

This boundary keeps the default host small and lets applications use
battle-tested interaction controllers only when needed.

## Choose the owner

Use native chart focus for:

- nearest-point inspection;
- grouped axis tooltips;
- snapped crosshairs;
- synchronized focus cursors;
- keyboard point navigation;
- point activation.

Use controlled application state for:

- free cursor values and programmatic cursor control;
- brushes;
- zoom and pan;
- focus-and-context windows;
- synchronized views;
- scrollable resource lanes;
- playback scrubbers;
- editable intervals;
- rich pinned tooltips.

See [Tooltips and Focus](./tooltips-and-focus.md) for the native path.

## Cursors and crosshairs

`crosshair` is presentation; `createChartCursor` is state. A crosshair without
a cursor binding follows the chart's local `ChartFocusState`:

```ts
import { crosshair } from '@tanstack/charts/crosshair'

const definition = defineChart({
  marks: [
    lineY(rows, { x: 'date', y: 'value' }),
    crosshair({ x: { label: true }, y: false }),
  ],
  x: { scale: scaleUtc },
  y: { scale: scaleLinear },
  focus: 'group-x',
  maxFocusDistance: Number.POSITIVE_INFINITY,
})
```

This gives pointer and keyboard users one snapped vertical guide. It does not
create a point, change the focus strategy, or require an SVG overlay.

On a categorical axis, `x: { band: true }` or `y: { band: true }` replaces
that axis rule with a cursor band sized from the resolved scale bandwidth. A
band options object controls inset, radius, fill, stroke, and opacity. Use
separate crosshair marks when the band should paint below the data and the
other axis rule should paint above it. Zero-bandwidth axes emit no band.

### Synchronize focus by value

Share one controller between definitions when several browser or React Native
charts should resolve the same semantic value through their own scales:

```ts
import { createChartCursor } from '@tanstack/charts/cursor'

const sharedDate = createChartCursor<Date, number>()
const cursor = {
  controller: sharedDate,
  mode: 'focus' as const,
  match: 'x' as const,
  pin: true,
}

const throughputDefinition = defineChart(throughputSpec, { cursor })
const errorsDefinition = defineChart(errorsSpec, { cursor })
```

Focus mode publishes `anchor: 'value'`. Each chart resolves that date to its
own local point and focus group; no chart copies another chart's pixels.
Pointer, keyboard, restored, and programmatic sources remain visible in the
shared state. `match` defaults to `xy` and can be `x` or `y`. Focus state may
also carry an optional local `origin` point identity to break ties between
repeated equal values, including facets. A stable `key` plus `markId` survives
data reordering; `datumIndex` disambiguates duplicate keys. A chart ignores the
origin when its key and mark do not exist locally and resolves from the
portable semantic `value` and preferred `group`.

### Track free coordinates

Free mode updates without selecting a datum. The host stores normalized plot
coordinates and can derive semantic values through `valueAt`:

```ts
const freeCursor = createChartCursor<Date, number>()
const xScale = scaleUtc().domain([start, end])
const yScale = scaleLinear().domain([0, maximum])

const definition = defineChart({
  marks: [
    dot(rows, { x: 'date', y: 'value' }),
    crosshair({
      x: { label: true },
      y: { label: true },
      marker: true,
    }),
  ],
  x: { scale: xScale },
  y: { scale: yScale },
  cursor: {
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

The configured scale remains the owner of inversion, clamping, and rounding.
Set semantic state directly when another control owns the cursor:

```ts
freeCursor.setState({
  anchor: 'value',
  value: { x: selectedDate, y: selectedValue },
  source: 'programmatic',
  pinned: true,
})

freeCursor.setState(null)
```

With `pin: true`, click or tap pins the current cursor and another activation
dismisses it. Browser focus mode also supports Enter, Space, and Escape. React
Native focus mode exposes equivalent activate and escape accessibility
actions. Free mode has no invented keyboard or accessibility point order; pair
it with labeled date/number inputs, a range control, or textual status when
arbitrary values are part of the reader's task. The crosshair itself is visual
and `aria-hidden`.

Browser renderer hosts and React Native `Chart` both bind focus and free
cursors. They share controller state, semantic focus resolution, coordinate
projection, and crosshair presentation; only their event plumbing differs.
React Native uses responder gestures and accessibility actions instead of DOM
pointer and key events.

Application code imports `createChartCursor` and its state types from
`@tanstack/charts/cursor`. The adapter-facing
`@tanstack/charts/cursor/host` entry contains the platform-neutral projection
and focus helpers used to implement a host; ordinary chart definitions do not
need it.

## Controlled interaction loop

Every application-owned gesture follows the same loop:

1. Render the definition from semantic state.
2. Read `scene.chart` and resolved scales in `onRender`.
3. Convert pointer geometry into semantic values.
4. Clamp, snap, or validate those values as product policy.
5. Update application state.
6. Let the next definition produce the scene.

Do not mutate SVG geometry directly and then attempt to reconcile application
state afterward.

## Controlled point inspection

Use the chart's interaction controller when the application owns pointer
timing but still wants the definition's focus strategy, focus marks, and
tooltip. Long-press inspection is one example:

```tsx
let interaction: ChartInteractionController<Row, Date, number> | undefined

const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value', key: 'id' })],
  x: { scale: scaleUtc() },
  y: { scale: scaleLinear() },
  focus: 'nearest-x',
  pointer: false,
  tooltip,
})

const chart = (
  <Chart
    definition={definition}
    ariaLabel="Portfolio history"
    onRender={(context) => {
      interaction = context.interaction
    }}
  />
)

function inspect(clientX: number, clientY: number) {
  interaction?.setControlledFocus(interaction.resolvePointer(clientX, clientY))
}

function stopInspecting() {
  interaction?.setControlledFocus(null)
}
```

`resolvePointer` uses the current renderer presentation, including an active
motion or viewport transform, and returns the scene position, primary point,
and complete focus group. `setControlledFocus` paints the same definition-owned
focus and tooltip as native pointer input. Pass `{ pinned: true }` when the
configured sticky tooltip should accept interaction.

For a drag that does not require a nearby datum, use
`interaction.clientToScene(clientX, clientY)`. It applies the renderer's full
client-to-scene transform without coupling viewport movement to point focus.

`pointer: false` disables automatic pointer move, leave, and click handling. It
does not disable keyboard navigation. Controlled focus has separate ownership,
so unrelated mouse-leave and focus-out events cannot clear it. The stable
controller is available as `host.interaction` and in every `onRender` context.

## Invert configured scales

Copy the same configured continuous scale onto the resolved plot range:

```ts
const interactionX = xScale
  .copy()
  .range([scene.chart.x, scene.chart.x + scene.chart.width])

const date = interactionX.invert(pointerX)
```

For y, reverse the range:

```ts
const interactionY = yScale
  .copy()
  .range([scene.chart.y + scene.chart.height, scene.chart.y])
```

Apply UTC month snapping, numeric rounding, minimum ranges, and domain clamps
after inversion. Those policies are application semantics, not scale math.
This date example uses a D3 time scale; the lightweight linear scale supports
the same copy, range, and inversion flow for numeric gestures.
The same scale-copy pattern belongs in a free cursor binding's `valueAt`
callback.

The [Scales](../concepts/scales-and-d3.md) page is the sole source for
D3 ownership and official interaction-module links.

## Disable competing datum focus

When a gesture has no datum inspection at all, disable native focus explicitly:

```ts
import { focusDisabled } from '@tanstack/charts/focus/disabled'

const gestureDefinition = defineChart(definition, {
  focus: focusDisabled,
  keyboard: false,
})

mountChart(element, {
  definition: gestureDefinition,
  ariaLabel: 'Selectable monthly range',
  onRender: mountBrushOverlay,
})
```

This prevents a brush from competing with the host's point marker and tooltip.
Use `pointer: false` plus the interaction controller when the application owns
the gesture but the chart should still own datum focus. `focusDisabled` does
not remove keyboard accessibility from application-owned controls.
A definition `cursor` in `free` mode already owns the host pointer path and
does not require `pointer: false` or `focusDisabled`.

## Brush selection

A complete brush owns:

- drag start, move, end, and cancellation;
- reverse dragging normalization;
- semantic snapping;
- a visible selected range;
- focusable handles or equivalent range inputs;
- current-range text;
- reset behavior;
- selection preservation after data updates.

Use `d3-brush` and `d3-selection` as optional direct dependencies when their
controller semantics fit. The chart library does not bundle them.

<iframe
  src="https://tanstack.com/charts/catalog/embed/89-brush-range-selection/?theme=system&height=480"
  title="Monthly-snapped brush with pointer and keyboard range selection"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Zoom and pan

Zoom state should be a semantic domain, not an opaque transform trapped in a
DOM behavior. Decide:

- minimum and maximum span;
- full-domain limits;
- pointer anchor behavior;
- vertical versus horizontal wheel capture;
- when page scrolling remains available;
- keyboard zoom and pan increments;
- touch pinch and cancellation;
- reset and follow-latest behavior.

Use `d3-zoom` and `d3-selection` when they improve modality handling. Store the
resulting domain in application state and rebuild the definition with a
configured scale.

## Linked views

Store one semantic cursor, selection, or domain and derive every view from it.
For focus cursors, share a `createChartCursor` controller with `match: 'x'` or
`match: 'y'`. Each view can have an independent opposite-axis scale while
sharing a date or category.

Validate outgoing events by semantic value, not matching pixel positions.
Different chart sizes and margins should still resolve the same selection.

## Timelines and editors

Scrubbers and editable ranges should pair direct manipulation with native
controls:

- range input for a playhead;
- two range inputs or date inputs for an interval;
- Play/Pause and Reset buttons;
- visible duration or current-frame text;
- Escape or Cancel for reversible edits;
- live announcements for committed changes.

The chart renders the controlled state. It does not become the form control.

## Scrollable lanes

For resource timelines, native horizontal overflow is often better than
capturing the wheel:

- keep the lane label rail fixed;
- let the timeline region scroll;
- preserve viewport-relative geometry after updates;
- keep task details reachable by keyboard;
- avoid clipping axis labels at the scroll boundary.

## Lifecycle

An interaction controller may install pointer capture, event listeners,
observers, nested chart hosts, or animation frames. `onRender` can update an
existing controller, but the application surface must destroy every resource
when the chart unmounts or ownership changes. `createChartCursor` itself owns
no platform resources; hosts unsubscribe when destroyed. A host clears only
the exact unpinned state object that it most recently published. If the
application or another host has replaced the controller state, cancellation,
rebinding, or unmount leaves that newer state intact. Pinned state also
survives lifecycle cleanup until an explicit dismissal or programmatic clear.

## Interaction checklist

- State is semantic and controlled.
- Crosshair presentation is derived from focus or a cursor binding instead of
  DOM mutation.
- Geometry comes from `scene.chart` and configured scale copies.
- Native focus is disabled only when another complete interaction owns the
  surface.
- Pointer, keyboard, and touch reach equivalent outcomes.
- Wheel capture does not unexpectedly trap page scrolling.
- Dragging survives out-of-bounds movement and cancellation.
- Range limits, snapping, and reset are explicit.
- State remains valid after data and size updates.
- External listeners, overlays, and nested hosts are destroyed.
