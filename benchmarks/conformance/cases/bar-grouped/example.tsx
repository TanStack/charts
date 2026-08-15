import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { penguins } from '@tanstack/charts-data/penguins'
import {
  barY,
  colorLegend,
  defineChart,
  group,
  groupBy,
} from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import type { PenguinsRow } from '@tanstack/charts-data/penguins'

const sexDomain = ['FEMALE', 'MALE']
const sexColors = ['#2563eb', '#f97316']

type SexedPenguin = PenguinsRow & { readonly sex: string }

export const createExampleChart = (input: ChartOptions) =>
  defineChart(
    ({ width }) => {
      const observations = penguins
        .slice(0, penguins.length - input.revision * 12)
        .filter((row): row is SexedPenguin => row.sex !== null)
      const rows = groupBy(observations, {
        by: { species: 'species', sex: 'sex' },
        outputs: { count: { reduce: 'count' } },
      })

      return {
        marks: [
          barY(rows, {
            id: 'penguin-count-bars',
            x: 'species',
            y: 'count',
            color: 'sex',
            layout: group({
              scale: scaleBand<string>().domain(sexDomain).paddingInner(0.08),
            }),
            inset: 1,
          }),
        ],
        x: {
          scale: () =>
            scaleBand<string>().paddingInner(0.14).paddingOuter(0.06),
          axis: { tickLabels: { rotate: width < 640 ? -32 : 0 } },
        },
        y: {
          scale: scaleLinear,
          grid: true,
          axis: { ticks: { count: 5 }, label: 'Penguins' },
        },
        color: {
          range: sexColors,
          legend: colorLegend({
            label: 'Sex',
          }),
        },
      }
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Penguins grouped by species'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
