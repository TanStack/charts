---
title: React Quick Start
description: Install the React adapter, define a typed chart, render responsive SVG, and add native interaction.
---

Install the framework adapter, core grammar, React peers, and only the granular
data and scale modules used by the chart:

```sh
pnpm add @tanstack/charts @tanstack/react-charts react react-dom d3-scale
pnpm add -D @types/d3-scale @types/react @types/react-dom
```

The shared [Scales and D3](../../concepts/scales-and-d3.md) page explains why
scales and optional algorithms remain direct application dependencies.

## Define a chart

Definitions are ordinary framework-independent TypeScript:

<!-- docs-example: react-quick-start typecheck -->

```tsx
import { scaleBand, scaleLinear } from 'd3-scale'
import { barY, defineChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { Chart } from '@tanstack/react-charts'

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

The definition infers the original row and semantic x/y types. Do not add
component generics or cast the definition.

## Responsive sizing

Use a fixed height with responsive width:

```tsx
<Chart
  definition={letterFrequencyChart}
  height={320}
  ariaLabel="English letter frequencies"
/>
```

Or give the host a proportional box:

```tsx
<Chart
  definition={letterFrequencyChart}
  aspectRatio={16 / 9}
  initialWidth={720}
  ariaLabel="English letter frequencies"
/>
```

The outer element fills its available width when `width` is absent. The
adapter server-renders with `initialWidth`, then the shared DOM host measures
the actual container after hydration. See
[React adapter](./adapter.md#sizing-and-layout).

## Memoize live definitions

When a chart captures component values, memoize the complete definition:

```tsx
import { useMemo } from 'react'

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
  }, [rows, accent])

  return (
    <Chart
      definition={definition}
      height={320}
      ariaLabel="Filtered English letter frequencies"
    />
  )
}
```

The dependency list owns application invalidation. The definition identity
tells the chart host when captured values changed. See
[Chart Definition API](../../reference/chart-definitions.md).

## Interaction callbacks

Callback types flow from the marks:

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

The native tooltip is optional. Grouped focus, formatting, keyboard behavior,
and application-owned interaction are documented in
[Focus and interaction](../../reference/focus-and-interaction.md).

## Render React tooltip content

Keep `Chart` from `@tanstack/react-charts` when the native tooltip is enough.
To pass `renderTooltipBody`, switch the component import to the optional React
tooltip entry:

```tsx
import { Chart } from '@tanstack/react-charts/tooltip'

;<Chart
  definition={letterFrequencyChart}
  height={320}
  ariaLabel="English letter frequencies"
  renderTooltipBody={({ defaultBody, pinned, dismiss }) => (
    <>
      {defaultBody}
      {pinned ? <button onClick={dismiss}>Close</button> : null}
    </>
  )}
/>
```

Existing `renderTooltipBody` users should migrate the component import from
`@tanstack/react-charts` to `@tanstack/react-charts/tooltip`. The definition
still uses `tooltip` from `@tanstack/charts/tooltip`.

## Example

This catalog example uses multiple line layers and endpoint labels through the
same React adapter:

<iframe
  src="https://tanstack.com/charts/catalog/embed/02-multi-line-end-labels/?theme=system&height=480"
  title="Multi-line chart with endpoint labels"
  loading="lazy"
  width="100%"
  height="480"
  style="width: 100%; height: 480px; border: 0"
></iframe>

Continue with the [React adapter](./adapter.md) for lifecycle and SSR, the
[`Chart` reference](./reference/chart.md) for every prop, or the
[core API reference](../../reference/index.md) for definitions, marks, scales,
and rendering.
