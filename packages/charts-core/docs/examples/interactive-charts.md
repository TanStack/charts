---
title: Interactive Charts
description: Choose native focus or controlled application interactions for pinned detail, scrolling, zooming, and editing.
---

Interaction should help the reader inspect, navigate, select, or edit semantic
data. It should not turn a chart into a second application state system.

TanStack Charts owns nearest-point focus, grouped focus, keyboard point
navigation, point selection callbacks, and native structured tooltips. The
application owns interactions that change a domain, viewport, persistent
selection, or product record.

## Choose the interaction

| Reader task                                                  | Start with                                     |
| ------------------------------------------------------------ | ---------------------------------------------- |
| Inspect one point or a same-x group                          | Native chart focus and tooltip                 |
| Paint a band, rule, or mark only for the active datum/group  | `whenFocused` around an ordinary mark          |
| Resize, recolor, or fade existing marks during focus         | Inline mark `states`                           |
| Keep rich framework detail open, including another chart     | Pinned composed tooltip body                   |
| Navigate a wide schedule without changing its semantic scale | Native horizontal scrolling                    |
| Crop and pan a continuous domain                             | Controlled zoom and viewport state             |
| Edit an interval or record                                   | Controlled direct manipulation plus form input |

[Interactions and Selections](../guides/interactions-and-selections.md) defines
the controlled gesture loop. [Tooltips and Focus](../guides/tooltips-and-focus.md)
defines the native inspection path.

## Compare focus marks

A focused dot can resize and restyle the existing pointer target:

```ts
dot(rows, {
  x: 'Date',
  y: 'Close',
  r: 3,
  fill: '#2563eb',
  states: [
    {
      when: { focus: 'primary' },
      style: { r: 7, stroke: 'Canvas', strokeWidth: 2 },
      transition: { type: 'tween', duration: 140, easing: 'ease-out' },
    },
  ],
})
```

<iframe
  src="https://tanstack.com/charts/catalog/embed/34-pointer-tooltip/?theme=system&height=480"
  title="Focused dot emphasizing the nearest Apple closing price"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

A focused band emphasizes the shared x value for every series. Its position
before the lines places it underneath them:

```ts
marks: [
  whenFocused(
    bandX(dates, {
      x: 'date',
      fill: '#64748b',
      fillOpacity: 0.14,
      inset: 3,
    }),
    { match: 'x' },
  ),
  lineY(rows, { x: 'date', y: 'unemployed', color: 'industry' }),
]
```

[Open the grouped focus example](https://tanstack.com/charts/catalog/35-grouped-tooltip/)
to inspect its live chart and complete source.

## Pin rich nested detail

A rich tooltip can compose the native rows with framework UI, including a
second chart. Hover remains transient; click or keyboard activation pins the
surface before it accepts pointer input.

<iframe
  src="https://tanstack.com/charts/catalog/embed/84-pinned-nested-chart-tooltip/?theme=system&height=500"
  title="Pinned rich tooltip containing a nested detail chart"
  loading="lazy"
  width="100%"
  height="500"
  style="width:100%;height:500px;border:0;"
></iframe>

The embedded framework-neutral case uses a fully application-owned surface.
Use the adapter's tooltip-body composition surface and include `defaultBody`
to retain native rows and swatches. A grouped parent can pass `points`
directly into a pie definition, placing the series comparison beside the rows
in both transient and pinned states. The transient body is inert; gate controls
on `pinned`. The nested chart receives its own accessible label, definition,
runtime, and framework cleanup.

Add the `portal` extension to the definition's tooltip options to escape
clipped ancestors and use viewport collision handling. Move focus intentionally
when the body contains controls, preserve Escape, and wire a close button to
`dismiss`.

## Scroll a wide schedule

Native horizontal scrolling is often better than zoom for resource lanes. It
preserves a stable time scale and gives the browser proven wheel, touch, and
keyboard behavior.

<iframe
  src="https://tanstack.com/charts/catalog/embed/85-scrollable-resource-lanes/?theme=system&height=480"
  title="Horizontally scrollable resource timeline with fixed lane labels"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Keep lane labels in a fixed rail and place the timeline in the scroll region.
Preserve lane order, task keys, scroll position, and viewport-relative geometry
across data updates. Do not capture vertical page scrolling when the timeline
only needs horizontal movement.

Use [Layout, Axes, and Coordinates](../concepts/layout-axes-and-coordinates.md)
to align labels and the plotted region.

## Zoom and pan a time domain

Zooming changes an explicit semantic domain. Wheel, drag, touch, keyboard, and
reset controls should all update the same start and end values.

<iframe
  src="https://tanstack.com/charts/catalog/embed/90-zoomable-time-window/?theme=system&height=480"
  title="Controlled time-domain wheel zoom and pan with keyboard and reset controls"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

Define:

- Full-domain limits
- Minimum and maximum span
- Pointer anchor behavior
- Pan increments
- Wheel activation and normalization
- Touch cancellation
- Keyboard equivalents
- Reset behavior

Store the resulting domain in application state and pass it into the chart's
configured scale. Preserve that domain when data values update unless product
policy explicitly follows the latest point.

## Edit an interval

An editable timeline combines direct manipulation with native semantic
controls. The chart renders the current record; application validation decides
which edit can commit.

<iframe
  src="https://tanstack.com/charts/catalog/embed/92-editable-event-range/?theme=system&height=500"
  title="Editable scheduled event range with drag, keyboard, and date controls"
  loading="lazy"
  width="100%"
  height="500"
  style="width:100%;height:500px;border:0;"
></iframe>

A complete editor should:

- Preserve the event's stable ID, start, and lane while its end changes.
- Clamp the end after the start.
- Support pointer cancellation and rollback.
- Offer keyboard-adjustable handles with adequate hit targets.
- Provide a native date or range input.
- Announce the current duration and validation state.
- Keep color-independent event labels visible.

Do not mutate a rectangle and treat that painted geometry as the saved record.
Update application state, validate it, and let the next definition produce the
scene.

## State and lifecycle

Application-owned interaction state should be semantic:

- Date or numeric domain
- Selected row ID
- Start and end values
- Scroll offset
- Playback index
- Pinned datum key

Pixel geometry is derived from `scene.chart` and copied configured scales on
each render. This keeps state valid after responsive layout, font changes, and
server hydration.

Controllers and overlays may install pointer capture, event listeners,
observers, nested hosts, and animation frames. Tear down every resource when
the chart unmounts or ownership changes.

## Production checks

- Pointer, keyboard, and touch reach equivalent semantic outcomes.
- Focus indicators and controls remain visible and contained.
- Wheel handling does not unexpectedly trap page scrolling.
- Dragging has commit, cancel, clamp, and out-of-bounds behavior.
- Selection and viewport survive data and size updates.
- Reset behavior is explicit.
- Native chart focus is disabled only when another complete interaction owns
  the surface.
- Rich overlays and nested charts have independent accessibility and cleanup.
- Interaction state is tested as values, not only screenshots or DOM order.

Use [Testing and Debugging](../guides/testing-and-debugging.md) for behavior
scenarios and [Accessibility](../guides/accessibility.md) for equivalent
input paths.
