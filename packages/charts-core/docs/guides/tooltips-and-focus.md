---
title: Tooltips and Focus
description: Configure grouped focus, automatic content, ordering, placement, portaling, pinning, and framework-composed tooltip bodies.
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

## Focus presentation

The default focus marker is an implicit focus-filtered mark. Replace it by
filtering any ordinary mark with `whenFocused`:

```ts
import { bandX, whenFocused } from '@tanstack/charts'

const definition = defineChart({
  focus: 'group-x',
  marks: [
    whenFocused(
      bandX(rows, {
        x: 'date',
        fill: '#64748b',
        fillOpacity: 0.14,
        inset: -6,
      }),
      { match: 'x' },
    ),
    lineY(rows, { x: 'date', y: 'value', color: 'series' }),
  ],
})
```

The mark before the line paints below it; moving it after the line paints
above it. Focus marks contribute channels to scale inference but do not add hit
targets. Their scene nodes update from the centralized focus state without
rebuilding the scene or repainting base Canvas geometry.

`match` accepts `primary`, `group`, `key`, `x`, `y`, or `series`. The same
focused group drives tooltips and every filtered mark.

To restyle an existing mark instead of adding geometry, use inline `states`:

```ts
dot(rows, {
  x: 'date',
  y: 'value',
  r: 3,
  states: [
    {
      when: { focus: 'primary' },
      style: { r: 7, stroke: 'Canvas', strokeWidth: 2 },
      transition: { duration: 140, easing: 'ease-out' },
    },
    {
      when: { focus: 'unmatched' },
      style: { opacity: 0.25 },
    },
  ],
})
```

Use `whenFocused` for a new band, rule, or mark. Use `states` for paint and
presentation changes on geometry that already exists.

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

Axis coordinates can be selected independently. This keeps a grouped tooltip
centered over the plot while fixing it to the top edge:

```ts
const tooltip = {
  anchor: { x: 'plot-center', y: 'plot-top' },
  placement: 'bottom',
}
```

X accepts `point`, `pointer`, `value`, `group-center`, `plot-left`,
`plot-center`, and `plot-right`. Y accepts `point`, `pointer`, `value`,
`group-center`, `plot-top`, `plot-center`, and `plot-bottom`. Pointer
coordinates fall back to the focused value for keyboard focus.

A custom resolver covers event ranges, maps, and application-specific
reference positions:

```ts
const tooltip = {
  anchor: (_points, { focus, pointer, plot, surface, scales }) => ({
    x: plot.x + plot.width,
    y: plot.y,
  }),
  placement: 'bottom-left',
}
```

The callback receives the complete focus state, current pointer or `null`,
plot bounds, surface size, and resolved scales. Resolvers and placement use
scene pixels. A nullish or non-finite custom anchor falls back to the primary
point. A placement list uses the first fit, then the least-overflowing
candidate. Every result shifts inside the chart surface.

## Escaping clipped containers

Keep tooltip layering with the chart definition:

```ts
const definition = defineChart({
  marks,
  x,
  y,
  focus: 'group-x',
  tooltip: {
    portal: true,
    anchor: 'group-center',
    placement: ['right', 'left', 'bottom', 'top'],
  },
})
```

`portal: true` opens the tooltip as a manual Popover in the browser top layer
where supported. It remains a DOM descendant of the chart, so inherited styles,
ancestor selectors, and chart-scoped CSS custom properties continue to work.
If Popover is unavailable or fails, the host moves the tooltip directly under
the chart's `ownerDocument` body with fixed high-stack positioning. Both paths
escape `overflow: hidden` and local stacking contexts, use viewport collision
bounds, and reposition after scroll, viewport resize, or content resize. The
default `false` keeps ordinary absolute positioning inside the chart.

For consistent fallback styling, target `tooltip.className` from a
document-level stylesheet and define required CSS custom properties on that
class or a shared document ancestor.

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

Framework adapters can replace only the tooltip body while the shared host
continues to own focus, ordering, anchoring, placement, portal coordinates,
and dismissal. This React example places a nested pie beside the native rows:

```tsx
<Chart
  definition={definition}
  ariaLabel="Revenue by series"
  renderTooltipBody={({ points, defaultBody, pinned, dismiss }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 8rem',
        gap: 12,
      }}
    >
      <div>{defaultBody}</div>
      <div>
        <SeriesPie points={points} />
        {pinned ? (
          <button type="button" onClick={dismiss}>
            Close
          </button>
        ) : null}
      </div>
    </div>
  )}
/>
```

The nested component is an ordinary chart built from the focused group:

```tsx
import * as React from 'react'
import { defineChart, type ChartPoint } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { Chart } from '@tanstack/react-charts'
import { pie } from 'd3-shape'

interface RevenueRow {
  date: Date
  series: string
  value: number
}

type RevenuePoint = ChartPoint<RevenueRow, Date, number>

function SeriesPie({ points }: { points: readonly RevenuePoint[] }) {
  const pieDefinition = React.useMemo(() => {
    const slices = pie<RevenuePoint>()
      .sort(null)
      .value((point) => Math.max(0, point.yValue))(points)

    return defineChart({
      marks: [
        polar({
          inset: 2,
          marks: [
            radialArc(slices, {
              key: (slice) => slice.data.key,
              fill: (slice) => slice.data.color ?? 'CanvasText',
            }),
          ],
        }),
      ],
      guides: false,
      x: null,
      y: null,
      keyboard: false,
    })
  }, [points])

  return (
    <Chart
      definition={pieDefinition}
      width={128}
      height={96}
      ariaLabel="Series share at the focused date"
    />
  )
}
```

`defaultBody` is the native title, rows, formatting, and swatches in the
adapter's native composition form. Render it as-is, wrap it, or omit it.
`points` preserves the grouped series order selected by `tooltip.sort`;
`content` exposes the same safe model when a different layout is needed.
`pinned` distinguishes transient inspection from interactive content, and
`dismiss()` clears the tooltip and returns focus to the chart when focus was
inside the body.

A custom body is inert while transient, so a display-only nested chart can stay
visible but cannot receive pointer or keyboard input. Render controls only when
`pinned` is true. The pinned body becomes a non-modal dialog; its controls
still need useful labels and intentional focus order. The adapter updates
framework content with focused-point changes and unmounts it when the tooltip
is dismissed or the parent chart unmounts.

| Adapter                      | Native body composition                            |
| ---------------------------- | -------------------------------------------------- |
| React, Preact, Solid, Octane | `renderTooltipBody` prop                           |
| Vue                          | `#tooltipBody` scoped slot                         |
| Svelte                       | `tooltipBody` snippet prop                         |
| Angular                      | `[tanstackChartTooltipBody]="definition"` template |
| Lit                          | `options.renderTooltipBody`                        |
| Alpine                       | `options.renderTooltipBody` returning DOM content  |

Each receives `points`, `content`, `defaultBody`, `pinned`, and `dismiss`.
Composition stays beside the component, slot, template, or directive options;
the framework-neutral definition still owns every tooltip behavior.

The [Interactive Charts examples](../examples/interactive-charts.md) and
[Polar and Radar Charts](../examples/polar-and-radar.md#pie-and-donut) show the
two pieces of the nested pie pattern.

## Keyboard behavior

With `keyboard` enabled:

- focusing the SVG selects the first navigable point;
- Arrow keys move through the strategy's navigation order;
- Home and End move to the first and last point;
- Enter or Space toggles an enabled sticky tooltip and calls `onSelect`;
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
- Use `portal: true` where clipped ancestors or stacking contexts can hide the
  tooltip.
- Use the adapter's tooltip-body composition surface for framework content;
  use focus callbacks for separate application-owned surfaces.
- Give keyboard and pointer users equivalent state and selection.
- Keep interactive content pinned and dismissible.
- Let framework lifecycle destroy nested charts and external listeners with
  their owner.
