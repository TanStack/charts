---
title: Tooltips and Focus
description: Configure nearest-point and grouped focus, automatic tooltip content, keyboard navigation, pinning, and application-owned rich surfaces.
---

The DOM host provides a small automatic path for the common case:

- find the nearest chart point;
- draw a focus marker;
- show locale-aware text;
- expose the same point to pointer and keyboard users;
- notify typed application callbacks.

Use that path until the product needs richer interaction.

## Default nearest point

Enable the native tooltip with `tooltip: true`:

```ts
const host = mountChart(element, {
  definition,
  height: 320,
  ariaLabel: 'Weekly downloads',
  tooltip: true,
})
```

The default focus strategy resolves one nearest point in two dimensions.
`maxFocusDistance` defaults to 48 scene pixels. Empty space farther from any
point clears transient focus.

## Axis focus strategies

Import an explicit strategy when the comparison should follow one axis:

```ts
import { focusNearestX, focusX } from '@tanstack/charts/focus'
```

| Strategy        | Result                                     |
| --------------- | ------------------------------------------ |
| omitted         | One nearest point in two dimensions        |
| `focusNearestX` | One point, prioritizing x distance         |
| `focusNearestY` | One point, prioritizing y distance         |
| `focusX`        | One point per group at the nearest x value |
| `focusY`        | One point per group at the nearest y value |

Grouped focus is appropriate for comparing several series at the same date or
category. A sparse snapped cursor can opt into
`maxFocusDistance: Number.POSITIVE_INFINITY`; keep the finite default when
empty space should mean no focus.

<iframe
  src="https://tanstack.com/charts/catalog/embed/35-grouped-tooltip/?theme=system&height=360"
  title="Grouped x-axis focus and tooltip across multiple lines"
  loading="lazy"
  style="width: 100%; height: 360px; border: 0;"
></iframe>

## Automatic tooltip mapping

`tooltip: true` formats the focused point's group, x value, and y value.
Numbers and dates use the user's locale.

Customize plaintext content with typed formatters:

```ts
const tooltip = {
  format(point) {
    return `${point.datum.label}: ${point.datum.value.toLocaleString()}`
  },
}
```

For grouped focus:

```ts
const tooltip = {
  formatGroup(points) {
    const date = points[0]?.xValue
    const heading =
      date instanceof Date ? date.toLocaleDateString() : String(date ?? '')

    return [
      heading,
      ...points.map(
        (point) => `${point.groupLabel}: ${point.datum.value.toLocaleString()}`,
      ),
    ].join('\n')
  },
}
```

`formatGroup` takes precedence for grouped output. Built-in tooltip content is
plain text by design. Returning HTML does not create a rich tooltip.

Add `className` to style the native HTML surface. Add `sticky: true` to let a
click pin the current point; Escape dismisses the pin.

## Typed callbacks

Use callbacks when application UI needs the current semantic state:

```tsx
<Chart
  definition={definition}
  ariaLabel="Weekly downloads"
  focus={focusX}
  onFocusChange={(point) => {
    setFocusedRow(point?.datum ?? null)
  }}
  onFocusGroupChange={(points) => {
    setFocusedRows(points.map((point) => point.datum))
  }}
  onSelect={(point) => {
    setSelectedId(point?.datum.id ?? null)
  }}
/>
```

`ChartPoint` includes:

- the original `datum` and its original index;
- stable point and mark keys;
- group value and label;
- typed semantic `xValue` and `yValue`;
- resolved pixel `x` and `y`;
- resolved color.

Read product values from `point.datum`. Use pixel coordinates only to position
an overlay.

## Rich and nested tooltips

Render rich content in application-owned DOM when the surface needs:

- links or buttons;
- a table;
- arbitrary framework components;
- a nested chart;
- asynchronous detail;
- custom collision or portal behavior.

Keep focus state controlled through `onFocusChange` or
`onFocusGroupChange`. Pin the surface through `onSelect`. A pinned surface
needs visible state, Escape dismissal, focus management, and deterministic
cleanup of any nested chart host.

The [Interactive Charts examples](../examples/interactive-charts.md) include a
pinned nested chart pattern.

## Keyboard behavior

With `keyboard` enabled:

- focusing the SVG selects the first navigable point;
- Arrow keys move through the strategy's navigation order;
- Home and End move to the first and last point;
- Enter or Space calls `onSelect`;
- Escape dismisses a sticky tooltip.

A custom focus strategy owns both pointer resolution and navigation order.
Do not supply a pointer-only strategy.

## Dense data

Linear nearest-point search is deliberately small. For many independently
focusable points, pass a `ChartSpatialIndexFactory` built with an optional
spatial dependency. The host rebuilds the index when scene points change.

See [Large Data](./large-data.md) before adding an index: when many rows share
the same pixels, a bounded representation is usually more useful than faster
search over every raw point.

## Ownership checklist

- Use native focus for datum inspection.
- Choose two-dimensional, nearest-axis, or grouped-axis semantics explicitly.
- Keep a finite distance unless continuous snapping is intended.
- Use native plaintext formatting for the 90% case.
- Render rich content through typed callbacks in application DOM.
- Give keyboard and pointer users equivalent state and selection.
- Keep pinned state controlled when it must survive updates.
- Destroy nested charts and external listeners with their owner.
