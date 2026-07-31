---
title: Interactions and Selections
description: Build controlled cursors, linked selections, brushes, zooming, scrolling, timelines, and editors around semantic chart state.
---

TanStack Charts owns datum focus and selection. The application owns gestures
that change a domain, range, viewport, or product record.

This boundary keeps the default host small and lets applications use
battle-tested interaction controllers only when needed.

## Choose the owner

Use native chart focus for:

- nearest-point inspection;
- grouped axis tooltips;
- keyboard point navigation;
- point activation.

Use controlled application state for:

- free cursors;
- brushes;
- zoom and pan;
- focus-and-context windows;
- synchronized views;
- scrollable resource lanes;
- playback scrubbers;
- editable intervals;
- rich pinned tooltips.

See [Tooltips and Focus](./tooltips-and-focus.md) for the native path.

## Controlled interaction loop

Every application-owned gesture follows the same loop:

1. Render the definition from semantic state.
2. Read `scene.chart` and resolved scales in `onRender`.
3. Convert pointer geometry into semantic values.
4. Clamp, snap, or validate those values as product policy.
5. update application state.
6. Let the next definition produce the scene.

Do not mutate SVG geometry directly and then attempt to reconcile application
state afterward.

## Invert configured scales

Copy the same configured D3 scale onto the resolved plot range:

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

This prevents a brush or free cursor from competing with the host's point
marker and tooltip. It does not remove keyboard accessibility from the
application-owned controls.

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
