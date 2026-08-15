import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { barY, defineChart, groupBy, text } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { penguins } from '@tanstack/charts-data/penguins'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'

type PenguinWithMass = PenguinsRow & { body_mass_g: number }

const observations = penguins.filter(
  (row): row is PenguinWithMass => row.body_mass_g !== null,
)
const formatMass = (value: number) =>
  value.toLocaleString('en-US', { maximumFractionDigits: 3 })

export const createExampleChart = (input?: ChartOptions) => {
  const rows = groupBy(observations, {
    by: 'species',
    outputs: {
      meanBodyMass: { value: 'body_mass_g', reduce: 'mean' },
    },
  })

  return defineChart(
    {
      marks: [
        barY(rows, {
          x: 'species',
          y: 'meanBodyMass',
          fill: '#0ea5e9',
          inset: 1,
        }),
        text(rows, {
          x: 'species',
          y: 'meanBodyMass',
          text: (row) => formatMass(row.meanBodyMass),
          fill: '#0c4a6e',
          dy: input?.preview === true ? 10 : -8,
        }),
      ],
      x: {
        scale: () => scaleBand<string>().paddingInner(0.1).paddingOuter(0.05),
      },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Mean body mass (g)' },
      },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = 'Mean penguin body mass by species'

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
