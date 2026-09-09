---
title: Interactive Charts
description: Choose chart-owned focus or controlled application interactions for pinned detail, scrolling, zooming, and editing.
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
| Follow focus with one rule or crosshair                      | Data-less `crosshair` mark                     |
| Paint existing geometry for the active datum/group           | `whenFocused` around an ordinary mark          |
| Synchronize focus or free coordinates between charts         | Shared `createChartCursor` controller          |
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

The same definition can make the built-in indicator smaller while retaining
its series-colored outline:

```ts
const definition = defineChart({
  marks,
  scales,
  focusRing: {
    radius: 4,
    strokeWidth: 2,
    fill: '#ffffff',
  },
})
```

<!-- ::chart-example id=34-pointer-tooltip height=480 -->

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

## Follow focus with a crosshair

A crosshair is one dynamic guide driven by the existing focus state. It is not
one hidden rule per datum:

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
  barY(rows, { x: 'period', y: 'value', color: 'series', inset: 4 }),
  crosshair({
    x: false,
    y: { strokeDasharray: '4 4', label: true },
  }),
]
```

It follows pointer and keyboard focus, stays out of hit testing, and renders
through SVG, Canvas, motion, and chart-owned focus presentation. The first guide
uses categorical bandwidth to paint below the bars; with bar inset 4 and band
inset 0, it extends 4 pixels past each bar edge. Its x label shows the focused
period. The second guide paints the dotted y rule above the bars and labels the
focused stack endpoint. Set `maxFocusDistance` to
`Number.POSITIVE_INFINITY` only when the guides should remain snapped across
the complete plot.

[Open the stacked cursor-band example](https://tanstack.com/charts/catalog/119-stacked-bar-band-cursor/)
to inspect the live chart and complete source.

For synchronized charts or a free two-dimensional cursor, create one
controller from `@tanstack/charts/cursor` and bind it through definition
`cursor`. Focus mode shares semantic x/y values and local charts map them to
their own pixels. Free mode shares controlled coordinates without selecting a
datum. The complete state and inversion examples are in
[Interactions and Selections](../guides/interactions-and-selections.md#cursors-and-crosshairs).

## Pin and expand rich detail

This energy tooltip stays compact on hover or keyboard focus. Click, Enter, or
Space pins the same surface, adds solar coverage to its native rows, and
smoothly reveals the detailed consumption and generation breakdown, including
an ordinary nested chart. Hover remains chart focus only; framework detail
mounts after click or keyboard activation.

<!-- ::chart-example id=84-pinned-nested-chart-tooltip height=500 -->

The definition owns stable point identity, the pinned mark state,
`visibility: 'pinned'`, placement, portaling, Escape, and focus return. The
adapter body receives the pinned point and mounts an ordinary nested chart.
The application retains only the same-species cohort policy, close-button
presentation, and child-chart content.

The definition's `content` callback receives `pinned`, so it can keep the
transient summary short and add structured rows only after activation. The
React `renderTooltipBody` callback receives that updated `defaultBody` and the
same pinned state:

```tsx
<TooltipChart
  definition={definition}
  renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
    <EnergyTooltip
      month={points[0].datum}
      summary={defaultBody}
      expanded={pinned}
      onClose={dismiss}
    />
  )}
/>
```

The detail wrapper stays mounted and transitions from
`grid-template-rows: 0fr` to `1fr`; its direct child uses `min-height: 0` and
`overflow: hidden`. This animates intrinsic height without measuring content.
The transient body remains inert, controls render only while pinned, and the
nested consumption chart has its own accessible label and lifecycle.

Add the `portal` extension to escape clipped ancestors and use viewport
collision handling. Wire the close button to `dismiss`; the shared host also
owns Escape, focus return, and non-modal dialog semantics.

## Scroll a wide schedule

Native horizontal scrolling is often better than zoom for resource lanes. It
preserves a stable time scale and gives the browser proven wheel, touch, and
keyboard behavior.

<!-- ::chart-example id=85-scrollable-resource-lanes height=480 -->

Keep lane labels in a fixed rail and place the timeline in the scroll region.
Preserve lane order, task keys, scroll position, and viewport-relative geometry
across data updates. Do not capture vertical page scrolling when the timeline
only needs horizontal movement.

Position the external rail from `onRender` with `scene.scales.y.map`. Do not
construct a second band scale to reproduce chart-space label centers.

Use [Layout, Axes, and Coordinates](../concepts/layout-axes-and-coordinates.md)
to align labels and the plotted region.

## Zoom and pan a time domain

`zoomX` changes a controlled semantic window through the normal definition.
The x scale, wheel, drag, touch, keyboard, and reset control all use the same
start and end values.

<!-- ::chart-example id=90-zoomable-time-window height=480 -->

Import `zoomX` from `@tanstack/charts/interaction/zoom`, bind its `window` to a
controlled signal, and provide the full `extent` and allowed `scaleExtent`.
The behavior owns final-scale inversion, focus-gated wheel capture,
pointer-anchored zoom, pan, touch and keyboard input, cancellation, clamping,
and teardown.

Keep the accepted window, visible-row or clipping policy, y-domain policy,
status, reset control, persistence, and follow-latest behavior in application
state. Preserve the window when data values update unless product policy
explicitly follows the latest point.

## Edit an interval

An editable timeline combines direct manipulation with native semantic
controls. The chart renders the current record; application validation decides
which edit can commit.

<!-- ::chart-example id=92-editable-event-range height=500 -->

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
- Shared cursor x/y value

Pixel geometry is derived from `scene.chart` and resolved scales on each
render. This keeps state valid after responsive layout, font changes, and
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
