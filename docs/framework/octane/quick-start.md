---
title: Octane Quick Start
description: Install the Octane adapter, define a typed chart, render responsive SSR-safe SVG, and add native interaction.
---

Install the framework adapter, core grammar, Octane peer, and only the granular
data and scale modules used by the chart:

```sh
pnpm add @tanstack/charts @tanstack/octane-charts octane d3-scale
pnpm add -D @types/d3-scale
```

The shared [Scales and D3](../../concepts/scales-and-d3.md) page explains the
injected scale and algorithm boundary.

## Define and render a chart

Definitions are framework-independent and can be shared with any adapter:

<!-- docs-example: octane-quick-start octane -->

```tsx
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/octane-charts'

interface AlphabetRow {
  letter: string
  frequency: number
}

const alphabet: readonly AlphabetRow[] = [
  { letter: 'E', frequency: 0.12702 },
  { letter: 'T', frequency: 0.09056 },
  { letter: 'A', frequency: 0.08167 },
  { letter: 'O', frequency: 0.07507 },
  { letter: 'I', frequency: 0.06966 },
]

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const letterFrequencyChart = defineChart({
  marks: [
    barY(alphabet, {
      x: 'letter',
      y: 'frequency',
    }),
  ],
  x: {
    scale: () => scaleBand().padding(0.18),
  },
  y: {
    scale: scaleLinear,
    nice: true,
    grid: true,
    axis: {
      label: 'Frequency',
      ticks: { format: (value) => percent.format(value) },
    },
  },
  tooltip,
})

export function LetterFrequencyChart() {
  return (
    <Chart
      definition={letterFrequencyChart}
      height={320}
      ariaLabel="English letter frequencies"
    />
  )
}
```

The definition infers the row, scale, and callback types. Normal TSRX authoring
does not need `Chart` generics or casts.

## Responsive sizing

Use `height` for a fixed-height responsive chart:

```tsx
<Chart
  definition={letterFrequencyChart}
  height={320}
  ariaLabel="English letter frequencies"
/>
```

Use `aspectRatio` when height should follow width:

```tsx
<Chart
  definition={letterFrequencyChart}
  aspectRatio={16 / 9}
  initialWidth={720}
  ariaLabel="English letter frequencies"
/>
```

The server scene uses `initialWidth`, then the shared host measures the actual
container after hydration. See
[Octane adapter](./adapter.md#sizing-and-layout).

## Memoize live definitions

```tsx
import { useMemo } from 'octane'

interface LetterFrequencyInput {
  rows: readonly AlphabetRow[]
  accent: string
}

export function LiveLetterFrequency({ rows, accent }: LetterFrequencyInput) {
  const definition = useMemo(() => {
    return defineChart({
      marks: [
        barY(rows, {
          x: 'letter',
          y: 'frequency',
          fill: accent,
        }),
      ],
      x: {
        scale: () => scaleBand().padding(0.18),
      },
      y: {
        scale: scaleLinear,
        nice: true,
      },
      animate: true,
      tooltip,
    })
  })

  return (
    <Chart
      definition={definition}
      height={320}
      ariaLabel="Filtered English letter frequencies"
    />
  )
}
```

Octane tracks the values read by `useMemo`. Definition identity tells the chart
host when captured values changed. See
[Chart Definition API](../../reference/chart-definitions.md).

## Interaction callbacks

```tsx
<Chart
  definition={letterFrequencyChart}
  height={320}
  ariaLabel="English letter frequencies"
  onFocusChange={(point) => {
    if (point) {
      console.log(point.datum.letter, point.yValue)
    }
  }}
  onSelect={(point) => {
    if (point) openLetter(point.datum.letter)
  }}
/>
```

Grouped focus, tooltip formatting, keyboard behavior, and application-owned
interaction are documented in
[Focus and interaction](../../reference/focus-and-interaction.md).

## Example

This calendar heatmap uses typed cells and responsive guide layout through the
same Octane adapter:

<iframe
  src="https://tanstack.com/charts/catalog/embed/25-calendar-heatmap/?theme=system&height=480"
  title="Precipitation calendar heatmap"
  loading="lazy"
  width="100%"
  height="480"
  style="width: 100%; height: 480px; border: 0"
></iframe>

Continue with the [Octane adapter](./adapter.md) for lifecycle and SSR, the
[`Chart` reference](./reference/chart.md) for every prop, or the
[core API reference](../../reference/index.md).
