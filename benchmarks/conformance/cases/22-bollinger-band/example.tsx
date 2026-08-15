import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import {
  areaY,
  defineChart,
  deviation,
  lineY,
  rollingWindow,
} from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@tanstack/charts-data/aapl'
import { selectBollingerData } from './selection'

const windowSize = 20
const deviationMultiplier = 2

function bollingerRows(input: ChartOptions) {
  const rows = rollingWindow(selectBollingerData(aapl, input.revision), {
    size: windowSize,
    orderBy: 'Date',
    anchor: 'end',
    partial: false,
    outputs: {
      meanClose: { value: 'Close', reduce: 'mean' },
      closeDeviation: { value: 'Close', reduce: deviation },
    },
  })
  return rows
}

export const createExampleChart = (input: ChartOptions) => {
  const rows = bollingerRows(input)

  return defineChart(
    {
      marks: [
        areaY(rows, {
          id: 'bollinger-band',
          x: 'Date',
          y1: (row) => row.meanClose - row.closeDeviation * deviationMultiplier,
          y2: (row) => row.meanClose + row.closeDeviation * deviationMultiplier,
          fill: '#7c3aed',
          fillOpacity: 0.18,
        }),
        lineY(rows, {
          id: 'bollinger-mean',
          x: 'Date',
          y: 'meanClose',
          stroke: '#7c3aed',
          strokeWidth: 2.25,
        }),
      ],
      x: { scale: scaleUtc, axis: { label: 'Date' } },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Apple close (USD)' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Twenty-day Apple Bollinger band'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
