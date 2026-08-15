import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { weather } from '@tanstack/charts-data/weather'
import { barY, defineChart, group } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'

type BarSlot = 'stack' | 'independent'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})
const groupScale = scaleBand<BarSlot>()
  .domain(['stack', 'independent'])
  .paddingInner(0.08)

export const createExampleChart = (input: ChartOptions) => {
  const start = input.revision % 2 === 0 ? 37 : 68
  const rows = weather.slice(start, start + 7)

  return defineChart(
    {
      marks: [
        barY(rows, {
          x: 'date',
          y1: 0,
          y2: 'precipitation',
          z: () => 'stack',
          fill: '#8884d8',
          layout: group({ scale: groupScale }),
          inset: 1,
        }),
        barY(rows, {
          x: 'date',
          y1: 'precipitation',
          y2: (row) => row.precipitation + row.wind,
          z: () => 'stack',
          fill: '#82ca9d',
          layout: group({ scale: groupScale }),
          inset: 1,
        }),
        barY(rows, {
          x: 'date',
          y: 'temp_max',
          z: () => 'independent',
          fill: '#ffc658',
          layout: group({ scale: groupScale }),
          inset: 1,
        }),
      ],
      x: {
        scale: () => scaleBand<Date>().paddingInner(0.1).paddingOuter(0.05),
        axis: { ticks: { format: (value) => dateFormat.format(value) } },
      },
      y: { scale: scaleLinear, grid: true, axis: { ticks: { count: 5 } } },
      margin: { top: 20, right: 20, bottom: 50, left: 80 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Stacked and adjacent Seattle weather bars'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
