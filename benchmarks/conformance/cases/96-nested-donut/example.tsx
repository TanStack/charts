import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { flare } from '@tanstack/charts-data/flare'
import { defineChart } from '@tanstack/charts'
import { pie, polar, radialArc } from '@tanstack/charts/polar'
import { nestedFlareDonut } from './transform'

const names = [
  'flare.animate',
  'flare.data',
  'flare.animate.core',
  'flare.animate.interpolate',
  'flare.data.core',
  'flare.data.converters',
]
const colors = [
  '#38bdf8',
  '#8b5cf6',
  '#0284c7',
  '#0ea5e9',
  '#7c3aed',
  '#a855f7',
]

export const createExampleChart = (input: ChartOptions) => {
  const sourceRows =
    input.revision % 2 === 0
      ? flare
      : flare.filter((row) => row.size === null || row.size >= 1_000)
  const data = nestedFlareDonut(sourceRows)
  const innerArcs = pie(data.inner, { value: 'size' })
  const outerArcs = pie(data.outer, { value: 'size' })

  return defineChart(
    {
      marks: [
        polar({
          radiusRatio: 0.8,
          marks: [
            radialArc(innerArcs, {
              id: 'family-slices',
              key: 'name',
              innerRadius: ({ radius }) => radius * 0.12,
              outerRadius: ({ radius }) => radius * 0.46,
              color: 'name',
            }),
            radialArc(outerArcs, {
              id: 'detail-slices',
              key: 'name',
              innerRadius: ({ radius }) => radius * 0.56,
              color: 'name',
            }),
          ],
        }),
      ],
      color: { domain: names, range: colors },
      margin: 0,
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Nested Flare package sizes'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
