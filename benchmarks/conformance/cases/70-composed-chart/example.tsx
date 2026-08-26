import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { weather } from '@tanstack/charts-data/weather'
import { areaY, barY, d3Curve, defineChart, dot, lineY } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'

const monotone = d3Curve(curveMonotoneX)
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const createExampleChart = (input: ChartOptions) => {
  const start = input.revision % 2 === 0 ? 37 : 68
  const rows = weather.slice(start, start + 6)

  return defineChart(
    {
      marks: [
        areaY(rows, {
          x: 'date',
          y: 'temp_max',
          fill: '#8884d8',
          fillOpacity: 0.2,
          stroke: '#8884d8',
          curve: monotone,
        }),
        barY(rows, {
          id: 'precipitation-bars',
          x: 'date',
          y: 'precipitation',
          yScale: 'precipitation',
          fill: '#413ea0',
          maxThickness: 20,
        }),
        lineY(rows, {
          x: 'date',
          y: 'temp_min',
          stroke: '#ff7300',
          strokeWidth: 2,
          curve: monotone,
        }),
        dot(rows, {
          id: 'wind-points',
          x: 'date',
          y: 'wind',
          yScale: 'wind',
          fill: '#ef4444',
          r: 4.5,
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand<Date>().paddingInner(0.1).paddingOuter(0.05),
          axis: {
            ticks: { format: (value: Date) => dateFormat.format(value) },
          },
        },
        y: {
          scale: scaleLinear,
          grid: true,
          axis: {
            label: 'Temperature (°C)',
            ticks: { count: 5 },
          },
        },
        precipitation: {
          channel: 'y',
          side: 'right',
          scale: scaleLinear,
          axis: {
            label: 'Precipitation (mm)',
            ticks: { count: 5 },
          },
        },
        wind: {
          channel: 'y',
          side: 'right',
          scale: scaleLinear,
          axis: {
            label: 'Wind (m/s)',
            ticks: { count: 5 },
          },
        },
      },

      margin: { top: 20, bottom: 50 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Seattle weather with three y axes'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
