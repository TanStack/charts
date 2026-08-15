import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { penguins } from '@tanstack/charts-data/penguins'
import { binXY, colorGradientLegend, defineChart, rect } from '@tanstack/charts'
import { scaleLinear, scaleSequential } from 'd3-scale'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'

type PenguinBill = PenguinsRow & {
  readonly culmen_length_mm: number
  readonly culmen_depth_mm: number
}

const xBoundaries = [30, 34, 38, 42, 46, 50, 54, 58, 62]
const yBoundaries = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
export const createExampleChart = (input: ChartOptions) => {
  const rows = penguins
    .filter((row): row is PenguinBill => {
      return row.culmen_length_mm !== null && row.culmen_depth_mm !== null
    })
    .slice(input.revision * 8, input.revision * 8 + 320)

  const cells = binXY(rows, {
    x: 'culmen_length_mm',
    y: 'culmen_depth_mm',
    xThresholds: xBoundaries,
    yThresholds: yBoundaries,
    outputs: { count: { reduce: 'count' } },
  }).filter((cell) => cell.count > 0)

  return defineChart(
    {
      marks: [
        rect(cells, {
          x1: 'x1',
          x2: 'x2',
          y1: 'y1',
          y2: 'y2',
          color: 'count',
          inset: 0.75,
        }),
      ],
      x: {
        scale: scaleLinear().domain([30, 62]),
        grid: true,
        axis: { label: 'Bill length (mm)' },
      },
      y: {
        scale: scaleLinear().domain([12, 23]),
        grid: true,
        axis: { label: 'Bill depth (mm)' },
      },
      color: {
        scale: scaleSequential,
        range: ['#eff6ff', '#1d4ed8'],
        legend: colorGradientLegend({ label: 'Count', steps: 5 }),
      },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: (point) =>
            `Bill length: ${point.datum.x1}–${point.datum.x2} mm · Bill depth: ${point.datum.y1}–${point.datum.y2} mm · Penguins: ${point.datum.count}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Quantitative two-dimensional binned heatmap'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
