---
title: Quick Start
description: Build, mount, update, and clean up a responsive TanStack Charts line chart with fully inferred types.
---

This walkthrough uses the framework-agnostic DOM host. The same chart
definition passes unchanged to any supported
[framework adapter](./installation.md#framework-compatibility).

## 1. Add a chart container

```html
<div id="closing-price-chart"></div>
```

The host follows the container width when `width` is omitted.

## 2. Define the data and chart

<!-- docs-example: core-quick-start typecheck -->

```ts
import { scaleLinear, scaleUtc } from 'd3-scale'
import { defineChart, lineY, mountChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'

interface ClosingPrice {
  Date: Date
  Close: number
}

const closingPrices: readonly ClosingPrice[] = [
  { Date: new Date('2013-11-01T00:00:00Z'), Close: 74.29 },
  { Date: new Date('2013-12-02T00:00:00Z'), Close: 78.75 },
  { Date: new Date('2014-01-02T00:00:00Z'), Close: 79.02 },
  { Date: new Date('2014-02-03T00:00:00Z'), Close: 71.65 },
  { Date: new Date('2014-03-03T00:00:00Z'), Close: 75.39 },
  { Date: new Date('2014-04-01T00:00:00Z'), Close: 77.38 },
  { Date: new Date('2014-05-01T00:00:00Z'), Close: 84.5 },
]

const closingPriceChart = defineChart({
  marks: [
    lineY(closingPrices, {
      id: 'apple-close',
      x: 'Date',
      y: (row) => (row.Date.getUTCMonth() < 3 ? null : row.Close),
      stroke: '#2563eb',
    }),
  ],
  x: {
    scale: scaleUtc,
    nice: true,
    axis: { label: 'Date' },
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: { label: 'Close (USD)' },
  },
  tooltip,
})
```

Because this source imports `d3-scale` directly, add it and `@types/d3-scale`
as direct dependencies. See [Installation](./installation.md).

The accessor deliberately omits first-quarter observations, creating visible
breaks instead of misleading segments. The original closing-price row flows
through the mark and into interaction callbacks; no cast or manual chart
generic is needed.

## 3. Mount it

```ts
const container = document.querySelector<HTMLElement>('#closing-price-chart')

if (!container) {
  throw new Error('Missing #closing-price-chart container')
}

const options = {
  definition: closingPriceChart,
  height: 360,
  initialWidth: 640,
  ariaLabel: 'Apple closing price with first-quarter gaps',
  ariaDescription: 'First-quarter observations are intentionally omitted.',
}

const host = mountChart(container, options)
```

`initialWidth` is the deterministic fallback for server output, hidden containers, and the first frame before measurement. Once visible, the host uses `ResizeObserver` to follow the container.

<iframe
  src="https://tanstack.com/charts/catalog/embed/01-line-gaps/?theme=system&height=480"
  title="Line chart with missing-value gaps built with TanStack Charts"
  loading="lazy"
  width="100%"
  height="480"
  style="width:100%;height:480px;border:0;"
></iframe>

## 4. Update the chart

Host options only cover mounting concerns such as size and accessibility:

```ts
host.update({
  ...options,
  height: 420,
})
```

When data, visual options, focus, tooltips, keyboard policy, or animation
change, create a new definition and pass it to `host.update`. In a framework
component, memoize the complete definition against the values it captures. See
[Chart definitions](./concepts/chart-definitions.md).

## 5. Clean up

```ts
host.destroy()
```

Destroying the host removes observers, event listeners, animations, tooltips, and chart markup. Framework adapters do this automatically during unmount.

## What the declaration means

- `lineY(closingPrices, ...)` chooses a line mark and keeps each source row as
  the interaction datum.
- `x: 'Date'` maps the source date field; the y accessor returns `Close` or an intentional gap.
- The unique date gives each observation stable positional identity across updates.
- D3 scale factories infer domains from mark channels and own mapping behavior.
- TanStack Charts copies those scales and assigns responsive pixel ranges.
- `label`, `format`, and `grid` configure the axis guide without changing the scale.
- Omitted margins are measured automatically from the rendered labels and titles.
- `ariaLabel` names the chart; pointer and keyboard focus use the same inferred points.

Read [Grammar of Graphics](./concepts/grammar-of-graphics.md) for the full model, then browse the [Example Gallery](./examples/index.md) for complete compositions.
