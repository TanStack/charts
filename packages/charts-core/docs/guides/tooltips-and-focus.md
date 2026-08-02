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

Import the native tooltip extension and add it to the definition:

```ts
import { tooltip } from '@tanstack/charts/tooltip'

const interactiveDefinition = defineChart(definition, { tooltip })

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

Default `primary` and `group` presentation follows the canonical focused scene
points. Equal x/y/series values in another facet do not implicitly paint a
second focus marker. To synchronize a visual cursor across facets without
turning those mirrors into additional selected data, add an ordinary focus
mark with `whenFocused(..., { match: 'x' })` or `match: 'y'`. The tooltip and
focus callback still receive the resolver's primary point or explicit focus
group.

```ts
whenFocused(bandX(rows, { x: 'date' }), { match: 'x' })
whenFocused(bandY(rows, { y: 'value' }), { match: 'y' })
```

These are presentation filters, not alternate selection strategies. The first
paints a vertical band wherever the focused x value exists; the second paints a
horizontal band wherever the focused y value exists.

<iframe
  src="https://tanstack.com/charts/catalog/embed/35-grouped-tooltip/?theme=system&height=480"
  title="Grouped x-axis focus and tooltip across multiple lines"
  loading="lazy"
  style="width: 100%; height: 480px; border: 0;"
></iframe>

## Automatic tooltip mapping

The default `tooltip` extension renders labeled rows for the focused point.
Grouped focus uses the shared axis value as a heading and renders one row and
color swatch per series. Visible axis labels carry into the tooltip. Numbers
use the user's locale and dates use stable UTC ISO formatting.

Rect and link endpoints display as ranges. Bars and areas with an explicit
baseline display the interval length, so a stacked segment reports its own
value instead of the cumulative endpoint.

Order built-in channels, datum fields, and derived text for a single focused
point:

```ts
const definition = defineChart({
  marks,
  x,
  y,
  tooltip: {
    use: tooltip,
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
  },
})
```

Array order is row order. A nullish field or `text` result omits the row.
Grouped focus keeps its shared-axis heading and series rows. By default, rows
follow the marks top-to-bottom for an x-group and left-to-right for a y-group.
Override that with `sort: 'color-domain'`, `sort: 'focus'`, or a typed
comparator. Use channel items to format their heading, series names, and values.
Use `content` when a grouped tooltip needs additional columns or nested
sections.

Customize plaintext content with typed formatters:

```ts
const formattedDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    format(point) {
      return `${point.datum.label}: ${point.datum.value.toLocaleString()}`
    },
  },
})
```

For grouped focus:

```ts
const groupedDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    formatGroup(points) {
      const date = points[0]?.xValue
      const heading =
        date instanceof Date ? date.toLocaleDateString() : String(date ?? '')

      return [
        heading,
        ...points.map(
          (point) =>
            `${point.groupLabel}: ${point.datum.value.toLocaleString()}`,
        ),
      ].join('\n')
    },
  },
})
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
const pointDefinition = defineChart(definition, {
  tooltip: { use: tooltip, anchor: 'point', placement: 'top' },
})
```

Pointer anchoring is useful when a dense mark has a large interactive
primitive. Keyboard focus falls back to the primary point:

```ts
const pointerDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    anchor: 'pointer',
    placement: ['right', 'left', 'bottom', 'top'],
    offset: 12,
  },
})
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
    use: tooltip,
    anchor: 'group-center',
    placement: ['top', 'right', 'left', 'bottom'],
    sort: 'color-domain',
  },
})
```

Coordinates can be selected independently. This follows the focused x value
while fixing the tooltip to the top of the plot:

```ts
const fixedYDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    anchor: { x: 'value', y: 'plot-top' },
    placement: 'bottom',
    offset: 12,
  },
})
```

A custom resolver covers event ranges, maps, and application-specific
reference positions:

```ts
const customAnchorDefinition = defineChart(definition, {
  tooltip: {
    use: tooltip,
    anchor: (_points, { focus, pointer, plot, surface, scales }) => ({
      x: scales.x.map(focus.primary.xValue),
      y: plot.y,
    }),
    placement: 'bottom-left',
  },
})
```

Resolvers receive complete focus, pointer, plot, surface, and resolved-scale
state. Resolvers and placement use scene pixels. A nullish or non-finite custom
anchor falls back to the primary point. A placement list uses the first fit,
then the least-overflowing candidate.

## Escaping clipped containers

Keep tooltip layering with the chart definition:

```ts
import { portal } from '@tanstack/charts/tooltip/portal'

const definition = defineChart({
  marks,
  x,
  y,
  focus: 'group-x',
  tooltip: {
    use: tooltip,
    portal,
    anchor: 'group-center',
    placement: ['right', 'left', 'bottom', 'top'],
  },
})
```

The `portal` extension opens the tooltip as a manual Popover in the browser top
layer where supported. It remains a DOM descendant of the chart, so inherited
styles, ancestor selectors, and chart-scoped CSS custom properties continue to
work. If Popover is unavailable or fails, the host moves the tooltip directly
under the chart's `ownerDocument` body with fixed high-stack positioning. Both
paths escape `overflow: hidden` and local stacking contexts, use viewport
collision bounds, and reposition after scroll, viewport resize, or content
resize. Omitting `portal` keeps ordinary absolute positioning inside the chart.

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
import { Chart as TooltipChart } from '@tanstack/react-charts/tooltip'

export function RevenueChart() {
  return (
    <TooltipChart
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
  )
}
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
spatial dependency. The factory also receives the resolved scene when it needs
primitive bounds rather than point anchors. The host rebuilds the index when
the scene changes.

See [Large Data](./large-data.md) before adding an index: when many rows share
the same pixels, a bounded representation is usually more useful than faster
search over every raw point.

## Ownership checklist

- Use native focus for datum inspection.
- Choose two-dimensional, nearest-axis, or grouped-axis semantics explicitly.
- Keep a finite distance unless continuous snapping is intended.
- Use native plaintext formatting for the 90% case.
- Use the `portal` extension where clipped ancestors or stacking contexts can
  hide the tooltip.
- Use the adapter's tooltip-body composition surface for framework content;
  use focus callbacks for separate application-owned surfaces.
- Give keyboard and pointer users equivalent state and selection.
- Keep interactive content pinned and dismissible.
- Let framework lifecycle destroy nested charts and external listeners with
  their owner.
