---
title: Interactions and Selections
description: Build controlled cursors, linked selections, brushes, zooming, scrolling, timelines, and editors around semantic chart state.
---

TanStack Charts owns datum focus, selection, and the mechanics of an explicitly
imported chart behavior. The application owns the accepted semantic value and
product policy.

This boundary keeps the default host small and lets applications use
battle-tested interaction controllers only when needed.

## Choose the owner

Use native chart focus for:

- nearest-point inspection;
- grouped axis tooltips;
- keyboard point navigation;
- point activation.

Use a first-party controlled behavior for:

- categorical series visibility through `interactiveColorLegend`;
- semantic point selection through `keyedSelection`;
- an unsnapped numeric or temporal plot position through `continuousCursor`;
- one ordered scale value through `handleX`;
- a scale-bound horizontal range through `brushX`;
- a controlled numeric or temporal x window through `zoomX`;
- other behaviors that explicitly accept a `ControlledSignal`.

Use controlled application state for:

- linked-view layout and domain policy;
- scrollable resource lanes;
- playback timing and play/pause controls;
- editable intervals;
- rich pinned tooltips.

See [Tooltips and Focus](./tooltips-and-focus.md) for the native path.

## Controlled signals

A controlled signal is the boundary between application-owned semantic state
and a chart-owned behavior:

```ts
import { controlledSignal } from '@tanstack/charts/interaction/signal'

const visible = controlledSignal(visibleSeries, (next, reason) => {
  setVisibleSeries(next)
})
```

It is only a typed snapshot and callback. It does not create a chart store,
subscription, or second lifecycle. Rebuild the definition with the accepted
value, as with a controlled form input. The behavior owns interaction details;
the application owns persistence and policy.

## Controlled keyed selection

Use `keyedSelection` when chart activation and application UI share one stable
datum key:

```ts
import { defineChart, dot } from '@tanstack/charts'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { keyedSelection, whenSelected } from '@tanstack/charts/selection'

const selection = keyedSelection<Observation, string, number, number>({
  selected: controlledSignal(selectedId, (next, reason) => {
    setSelectedId(next)
  }),
  key: (datum) => datum.id,
})

const definition = defineChart({
  marks: [
    dot(observations, {
      id: 'observations',
      x: 'flipperLength',
      y: 'bodyMass',
      key: 'id',
    }),
    whenSelected(
      dot(observations, {
        id: 'selected-observation',
        x: 'flipperLength',
        y: 'bodyMass',
        key: 'id',
        r: 7,
        strokeWidth: 2,
      }),
      selection,
    ),
  ],
  selection,
})
```

Click, Enter, and Space propose the selected key through the controlled signal.
A blank-surface click proposes `null` when a selection exists. The change
reason distinguishes `select` from `clear` and records whether activation came
from `pointer` or `keyboard`. A nullish key makes that point non-selectable.

`whenSelected` is an ordinary authored mark filtered after scale domains
resolve. Its complete data and channels still contribute to the domains, but
only geometry whose point matches the selected key is painted. The filtered
overlay is decorative: it emits no second focus or activation point. If one
logical point owns several scene fragments, every matching fragment remains.

Focus and selection are independent. Focus can move without changing the
controlled key, and a selected overlay does not replace the normal focus ring.
Keep semantic tables, status announcements, clear buttons, persistence, and
product-specific key policy in application UI. Those controls can update the
same selected value used to rebuild the definition.

## Continuous cursor

Use `continuousCursor` for an arbitrary x/y plot position that must not snap to
a datum:

```ts
import { defineChart, dot } from '@tanstack/charts'
import {
  continuousCursor,
  type ContinuousCursorChange,
  type ContinuousCursorPosition,
} from '@tanstack/charts/interaction/cursor'
import { controlledSignal } from '@tanstack/charts/interaction/signal'

type Position = ContinuousCursorPosition<number, number>

const definition = defineChart({
  marks: [dot(rows, { x: 'horsepower', y: 'economy' })],
  x: { scale: horsepowerScale },
  y: { scale: economyScale },
  behaviors: [
    continuousCursor({
      position: controlledSignal<
        Position | null,
        ContinuousCursorChange<number, number>
      >(cursorPosition, (next, reason) => {
        if (reason.type === 'commit' || reason.type === 'clear') {
          setCursorPosition(next)
        }
      }),
      xLabel: { format: (value) => `HP ${value.toFixed(1)}` },
      yLabel: { format: (value) => `MPG ${value.toFixed(1)}` },
    }),
  ],
})
```

Both scales must be invertible numeric or temporal scales. The behavior uses
their final resolved ranges, including a reversed y range, and clamps values to
the plot. Rules and the marker are enabled by default. Axis labels are opt-in.

A `null` controlled position leaves pointer previews transient. Click or tap
proposes a `commit`; accepting its non-null position pins the cursor. A second
activation or Escape proposes `clear`. Pointer leave and cancellation clear an
unpinned preview. `ContinuousCursorChange` distinguishes `preview`, `commit`,
and `clear`, records pointer, touch, or keyboard source, and preserves the
origin position.

The SVG and Canvas DOM hosts replace the static scene fallback with a host
overlay, so pointer movement repaints the guide without rebuilding the chart
scene. Static SVG and React Native paint an accepted non-null position but do
not provide pointer input. Pair the cursor with semantic sliders or inputs and
visible status text for keyboard and nonvisual operation. Those controls can
write the same application-owned position.

## Custom interaction loop

Use this lower-level loop when no first-party behavior owns the gesture:

1. Render the definition from semantic state.
2. Read `scene.chart` and resolved scales in `onRender`.
3. Convert pointer geometry into semantic values.
4. Clamp, snap, or validate those values as product policy.
5. update application state.
6. Let the next definition produce the scene.

Do not mutate SVG geometry directly and then attempt to reconcile application
state afterward.

## Invert resolved scales

First-party behaviors use the final resolved scale. A custom gesture can read
the same optional inverse from the scene:

```ts
const invertX = scene.scales.x.invert
if (!invertX) throw new Error('This interaction requires an invertible x scale')

const date = invertX(pointerX)
```

The resolved y scale already owns its reversed pixel range:

```ts
const invertY = scene.scales.y.invert
if (!invertY) throw new Error('This interaction requires an invertible y scale')

const value = invertY(pointerY)
```

Apply UTC month snapping, numeric rounding, minimum ranges, and domain clamps
after inversion. Those policies are application semantics, not scale math.

The [Scales and D3](../concepts/scales-and-d3.md) page is the sole source for
D3 ownership and official interaction-module links.

## Disable competing datum focus

When a gesture owns the chart surface, disable native focus explicitly:

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

This prevents an application-owned gesture from competing with the host's
point marker and tooltip. First-party host controls such as `brushX` and
`zoomX` isolate their own events. Disabling native chart focus does not remove
keyboard accessibility from application-owned controls.

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

Import the optional first-party behavior and bind it to application state:

```ts
import { defineChart, lineY } from '@tanstack/charts'
import {
  brushX,
  type BrushRange,
  type BrushXChange,
} from '@tanstack/charts/interaction/brush'
import { controlledSignal } from '@tanstack/charts/interaction/signal'

const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
  x: { scale: utcScale },
  behaviors: [
    brushX({
      range: controlledSignal<BrushRange<Date>, BrushXChange<Date>>(
        visibleRange,
        (next, reason) => {
          if (reason.type === 'commit') setVisibleRange(next)
        },
      ),
      values: observedMonths,
      format: (date) => monthFormat(date),
    }),
  ],
})
```

`values` defines semantic order, snapping, and keyboard steps. It is required
for strings and for keyboard handles. Number and Date brushes may omit it only
with `keyboard: false` and an invertible scale. The range remains non-null: a
blank click proposes a snapped zero-width range, which application policy can
expand into a fixed focus window.

Change reasons distinguish pointer previews, commits, and cancellation from
keyboard commits and cancellation. Rebuild the definition with the accepted
range. The behavior retains active controlled echoes, cancels divergent
external updates, normalizes reverse drags, clamps to the final plot, and
ignores synthetic D3 move events.

SVG and Canvas DOM hosts replace the static scene fallback with one accessible
brush overlay. Static SVG and React Native retain the visual selection only;
native applications must supply their own semantic range control. Import
`d3-brush` and `d3-selection` directly only for a different application-owned
gesture.

<iframe
  src="https://tanstack.com/charts/catalog/embed/89-brush-range-selection/?theme=system&height=480"
  title="Monthly-snapped brush with pointer and keyboard range selection"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Scale-bound handle

Use `handleX` for one ordered value that the reader can drag or move with a
keyboard, such as a playback position:

```ts
import { defineChart, lineY } from '@tanstack/charts'
import {
  handleX,
  type HandleXChange,
} from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'

const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
  x: { scale: utcScale },
  behaviors: [
    handleX({
      value: controlledSignal<Date, HandleXChange<Date>>(currentDate, (next) =>
        setCurrentDate(next),
      ),
      values: observedDates,
      cross: { edge: 'bottom', offset: 8 },
      ariaLabel: 'Playback position',
      format: (date) => dayFormat(date),
    }),
  ],
})
```

`values` is the ordered snapping and keyboard domain. The controlled value
must be one of those candidates. `cross` places the track above or below the
plot, or at a semantic y value with `{ value }`. The default vertical rule
connects the track and plot; set `ruleStyle: false` to omit it.

Pointer and touch movement proposes `preview` changes. Release proposes a
`commit`; cancellation proposes the gesture origin. Arrow keys move one
candidate and Home or End selects an endpoint. Every keyboard move commits
immediately. The SVG and Canvas DOM hosts provide one named horizontal slider
with a 44-pixel hit target by default. Static SVG and React Native paint the
accepted track, rule, and handle but require an application-owned semantic
control for input.

Charts owns final-scale positioning, nearest-candidate snapping, pointer
capture, cancellation, keyboard movement, painting, and host teardown. The
application owns playback clocks, play/pause controls, status text, and
persistence.

## Zoom and pan

Keep zoom state as a semantic window, not an opaque DOM transform. Import the
optional first-party behavior and bind it to the same window used by the x
scale:

```ts
import { defineChart, lineY } from '@tanstack/charts'
import {
  zoomX,
  type ZoomXChange,
  type ZoomXWindow,
} from '@tanstack/charts/interaction/zoom'
import { controlledSignal } from '@tanstack/charts/interaction/signal'

const definition = defineChart({
  marks: [lineY(rows, { x: 'date', y: 'value' })],
  x: { scale: utcScale.copy().domain([window.start, window.end]) },
  behaviors: [
    zoomX({
      window: controlledSignal<ZoomXWindow<Date>, ZoomXChange<Date>>(
        window,
        (next) => setWindow(next),
      ),
      extent: fullExtent,
      scaleExtent: [1, 8],
      ariaLabel: 'Zoomable revenue window',
      format: (date) => dayFormat(date),
    }),
  ],
})
```

`extent` is the complete allowed x domain. `scaleExtent` is `[1, maximum]` and
defaults to `[1, Infinity]`. The behavior owns final-scale inversion,
pointer-anchored wheel zoom, drag and horizontal-wheel pan, touch input,
keyboard zoom and pan, clamping, cancellation, and teardown. It captures the
wheel only after its plot surface receives focus, so normal page scrolling
remains available beforehand.

Every proposal is a complete number or Date window. `ZoomXChange` distinguishes
gesture `preview`, `commit`, and `cancel` events, includes the gesture origin,
and records its action and source. Rebuild the definition with every accepted
preview for live movement; a cancel proposes the origin. Keyboard changes
commit immediately.

Keep visible-row filtering or clipping, y-domain policy, status, reset and
recovery controls, follow-latest behavior, and persistence in the application.
A reset updates the same controlled window. Import `d3-zoom` directly only
when the application needs a different gesture policy.

## Linked views

Store one semantic cursor, selection, or domain and derive every view from it.
Each view can have an independent y scale while sharing a date or category.

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
when the chart unmounts or ownership changes.

## Interaction checklist

- State is semantic and controlled.
- Geometry comes from `scene.chart` and configured scale copies.
- Native focus is disabled only when another complete interaction owns the
  surface.
- Pointer, keyboard, and touch reach equivalent outcomes.
- Wheel capture does not unexpectedly trap page scrolling.
- Dragging survives out-of-bounds movement and cancellation.
- Range limits, snapping, and reset are explicit.
- State remains valid after data and size updates.
- External listeners, overlays, and nested hosts are destroyed.
