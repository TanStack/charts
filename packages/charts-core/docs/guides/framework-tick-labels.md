---
id: framework-tick-labels
title: Framework tick labels
description: Position React tick content using resolved chart scales and plot bounds.
---

`onRender` exposes the final `scene.scales` and `scene.chart` plot rectangle.
Use them to position HTML tick content without copying scale math or inferred
margins. This works with reversed scales, dates, and band centers because
the chart owns the mapping.

This React example reserves 72 pixels for a left axis. React owns the tick
content; `onRender` updates its position after chart layout. It does not set
React state, so positioning cannot trigger a chart render loop.

```tsx
import * as React from 'react'
import { Chart } from '@tanstack/charts/react'
import { defineChart, lineY } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import type { ChartRenderContext } from '@tanstack/charts'

const levels = [0, 1000, 2000]
const rows = [
  { match: 1, elo: 800 },
  { match: 2, elo: 1600 },
]
const definition = defineChart({
  margin: { left: 72 },
  marks: [lineY(rows, { x: 'match', y: 'elo' })],
  scales: {
    x: { scale: scaleLinear },
    y: {
      scale: scaleLinear().domain([0, 2000]),
      axis: { ticks: { values: levels }, tickLabels: false },
    },
  },
})

export function SkillChart() {
  const labels = React.useRef<HTMLOListElement>(null)
  const positionLabels = React.useCallback(
    ({ scene }: ChartRenderContext<(typeof rows)[number], number, number>) => {
      const layer = labels.current
      if (!layer) return
      Array.from(layer.children).forEach((element, index) => {
        const label = element as HTMLElement
        label.style.top = `${scene.scales.y.map(levels[index]!)}px`
        label.style.left = `${scene.chart.x - 8}px`
      })
      layer.style.visibility = 'visible'
    },
    [],
  )

  return (
    <figure aria-label="Skill over recent matches" style={{ margin: 0 }}>
      <div style={{ position: 'relative' }}>
        <ol
          ref={labels}
          aria-label="Elo axis"
          style={{
            position: 'absolute',
            inset: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            pointerEvents: 'none',
            visibility: 'hidden',
          }}
        >
          {levels.map((value) => (
            <li
              key={value}
              style={{
                position: 'absolute',
                transform: 'translate(-100%, -50%)',
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden="true">★</span> {value}
            </li>
          ))}
        </ol>
        <Chart
          definition={definition}
          height={240}
          ariaLabel="Elo by match"
          onRender={positionLabels}
        />
      </div>
    </figure>
  )
}
```

Replace the contents of each `li` with your badge, image, or component. Keep
its width within the reserved margin. The HTML list provides axis values to
assistive technology; give meaningful icons accessible names when they add
information beyond the number.

For an x axis, use `scene.scales.x.map(value)` for `left` and
`scene.chart.y + scene.chart.height` for the bottom edge. Use
`scene.scales[scaleId].ticks` when the scale chooses the tick values. Each tick
already contains its resolved `position` and formatted `label`.

The overlay is positioned after mounting and each layout update, including
resizes. It is separate from the SVG and is not included in SVG exports,
Canvas output, or Native rendering. This recipe reserves label space
explicitly and does not measure framework content or apply SVG label thinning.
