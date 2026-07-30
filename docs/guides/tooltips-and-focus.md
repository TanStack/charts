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
const interactiveDefinition = defineChart(definition, { tooltip: true })

const host = mountChart(element, {
  definition: interactiveDefinition,
  height: 320,
  ariaLabel: 'Weekly downloads',
})
```

The default focus strategy resolves one nearest point in two dimensions.
`maxFocusDistance` defaults to 48 scene pixels. Empty space farther from any
point clears transient focus.

## Axis focus modes

| Mode        | Result                                     |
| ----------- | ------------------------------------------ |
| omitted     | One nearest point in two dimensions        |
| `nearest-x` | One point, prioritizing x distance         |
| `nearest-y` | One point, prioritizing y distance         |
| `group-x`   | One point per group at the nearest x value |
| `group-y`   | One point per group at the nearest y value |

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

`tooltip: true` renders labeled rows for the focused point. Grouped focus uses
the shared axis value as a heading and renders one row and color swatch per
series. Visible axis labels carry into the tooltip. Numbers use the user's
locale and dates use stable UTC ISO formatting.

Rect and link endpoints display as ranges. Bars and areas with an explicit
baseline display the interval length, so a stacked segment reports its own
value instead of the cumulative endpoint.

Order built-in channels, datum fields, and derived text for a single focused
point:

```ts
const tooltip = {
  items: [
    {
      channel: 'y',
      label: 'Revenue',
      text: (point) => currency(point.yValue),
    },
    {
      field: 'status',
      label: 'Status',
    },
    {
      id: 'change',
      label: 'Change',
      text: (point) =>
        point.datum.change == null ? null : percent(point.datum.change),
    },
    'x',
  ],
}

const definition = defineChart({
  marks,
  x,
  y,
  tooltip,
})
```

Array order is row order. A nullish field or `text` result omits the row.
Grouped focus keeps its shared-axis heading and series rows; order those rows
with `sort: 'color-domain'`, `sort: 'focus'`, or a typed comparator. Use
channel items to format their heading, series names, and values. Use `content`
when a grouped tooltip needs additional columns or nested sections.

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

Formatting precedence is `content`, `formatGroup`, `format`, then the automatic
content. `content` returns safe title and row data. `format` and `formatGroup`
return plain text; returning HTML does not create DOM.

Add `className` to style the native HTML surface. Clicking pins the current
tooltip for text selection. A later click or Escape unpins it. Set
`sticky: false` to disable pinning.

## Anchoring and placement

Point anchoring is the stable default for scatterplots, bars, and keyboard
navigation:

```ts
const tooltip = {
  anchor: 'point',
  placement: 'top',
}
```

Pointer anchoring is useful when a dense mark has a large hit region. Keyboard
focus falls back to the primary point:

```ts
const tooltip = {
  anchor: 'pointer',
  placement: ['right', 'left', 'bottom', 'top'],
  offset: 12,
}
```

Grouped charts can avoid jumping between series by anchoring to the focused
group's bounding-box center:

```ts
const definition = defineChart({
  marks,
  x,
  y,
  focus: 'group-x',
  tooltip: {
    anchor: 'group-center',
    placement: ['top', 'right', 'left', 'bottom'],
    sort: 'color-domain',
  },
})
```

A custom resolver covers event ranges, maps, and application-specific
reference positions:

```ts
const tooltip = {
  anchor: (_points, { chart }) => ({
    x: chart.x + chart.width,
    y: chart.y,
  }),
  placement: 'bottom-left',
}
```

Resolvers and placement use scene pixels. A nullish or non-finite custom
anchor falls back to the primary point. A placement list uses the first fit,
then the least-overflowing candidate. Every result shifts inside the chart
surface.

## Typed callbacks

Use callbacks when application UI needs the current semantic state:

```tsx
function WeeklyDownloads() {
  const groupedDefinition = defineChart(definition, { focus: 'group-x' })

  return (
    <Chart
      definition={groupedDefinition}
      ariaLabel="Weekly downloads"
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
  )
}
```

`ChartPoint` includes:

- the original `datum` and its original index;
- stable point and mark keys;
- group value and label;
- typed semantic `xValue` and `yValue`;
- optional interval endpoints and range-or-difference presentation hints;
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
- portal or cross-surface collision behavior.

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
