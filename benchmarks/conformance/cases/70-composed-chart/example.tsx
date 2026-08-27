import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { weather } from '@tanstack/charts-data/weather'
import {
  areaY,
  barY,
  colorLegend,
  d3Curve,
  defineChart,
  dot,
  lineY,
} from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'

const monotone = d3Curve(curveMonotoneX)
const weatherSeries = {
  high: 'High temperature',
  precipitation: 'Precipitation',
  low: 'Low temperature',
  wind: 'Wind',
} as const
type WeatherSeries = (typeof weatherSeries)[keyof typeof weatherSeries]
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
          color: () => weatherSeries.high,
          fill: '#8884d8',
          fillOpacity: 0.2,
          stroke: '#8884d8',
          curve: monotone,
        }),
        barY(rows, {
          id: 'precipitation-bars',
          x: 'date',
          y: 'precipitation',
          color: () => weatherSeries.precipitation,
          yScale: 'precipitation',
          fill: '#413ea0',
          maxThickness: 20,
        }),
        lineY(rows, {
          x: 'date',
          y: 'temp_min',
          color: () => weatherSeries.low,
          stroke: '#ff7300',
          strokeWidth: 2,
          curve: monotone,
        }),
        dot(rows, {
          id: 'wind-points',
          x: 'date',
          y: 'wind',
          color: () => weatherSeries.wind,
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

      color: {
        domain: Object.values(weatherSeries),
        range: ['#8884d8', '#413ea0', '#ff7300', '#ef4444'],
        legend: colorLegend<WeatherSeries>({
          placement: 'bottom',
          items: {
            justify: 'center',
            gap: 18,
            rowGap: 8,
            indicator: {
              width: 18,
              height: 12,
              shape: (series) =>
                series === weatherSeries.low
                  ? 'line-dot'
                  : series === weatherSeries.wind
                    ? 'dot'
                    : 'square',
            },
            label: {
              fontSize: 12,
              fill: (_series, { color }) => color,
            },
          },
        }),
      },

      margin: { top: 20 },
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
