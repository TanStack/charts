import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, dot, first, lineY, rollingWindow } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import { aapl } from '@tanstack/charts-data/aapl'

interface ReferencePoint {
  PreviousClose: number
  Close: number
}

const observations = aapl.slice(-120)
const closeDomain: readonly [number, number] = [150, 195]
const identity: readonly ReferencePoint[] = [
  { PreviousClose: closeDomain[0], Close: closeDomain[0] },
  { PreviousClose: closeDomain[1], Close: closeDomain[1] },
]

export const createExampleChart = () => {
  const rows = rollingWindow(observations, {
    size: 2,
    orderBy: 'Date',
    partial: false,
    outputs: { PreviousClose: { value: 'Close', reduce: first } },
  })

  return defineChart(
    {
      marks: [
        lineY(identity, {
          x: 'PreviousClose',
          y: 'Close',
          stroke: '#94a3b8',
          strokeDasharray: '5,4',
        }),
        dot(rows, {
          x: 'PreviousClose',
          y: 'Close',
          fill: '#7c3aed',
          fillOpacity: 0.78,
          r: 4,
        }),
      ],
      x: {
        scale: scaleLinear().domain(closeDomain),
        grid: true,
        axis: { label: 'Previous close (USD)' },
      },
      y: {
        scale: scaleLinear().domain(closeDomain),
        grid: true,
        axis: { label: 'Current close (USD)' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}

export const exampleAriaLabel =
  'Lag-one autocorrelation of Apple closing prices'

export const chart = createExampleChart()

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
