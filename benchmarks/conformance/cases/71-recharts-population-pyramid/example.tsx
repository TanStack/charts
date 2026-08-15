import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { penguins } from '@tanstack/charts-data/penguins'
import { barX, defineChart, groupBy, stack } from '@tanstack/charts'
import { scaleBand, scaleLinear } from 'd3-scale'
import { isSexedPenguin, pyramidSexes } from './selection'

const colors = ['#2563eb', '#db2777']

export const createExampleChart = (input: ChartOptions) => {
  const sourceRows = input.revision % 2 === 0 ? penguins : penguins.slice(0, -8)
  const observations = sourceRows.filter(isSexedPenguin)
  const counts = groupBy(observations, {
    by: {
      species: 'species',
      sex: 'sex',
    },
    outputs: { count: { reduce: 'count' } },
  })

  return defineChart(
    {
      marks: [
        barX(counts, {
          id: 'population-bars',
          x: (row) => (row.sex === 'MALE' ? -row.count : row.count),
          y: 'species',
          z: 'sex',
          color: 'sex',
          layout: stack({ offset: 'diverging', order: pyramidSexes }),
          key: (row) => `${row.species}:${row.sex}`,
          inset: 0.5,
        }),
      ],
      x: {
        scale: scaleLinear().domain([-80, 80]),
        grid: true,
        axis: {
          ticks: {
            count: 5,
            format: (value) => Math.abs(value).toLocaleString('en-US'),
          },
          label: 'Penguins observed',
        },
      },
      y: {
        scale: () => scaleBand<string>().paddingInner(0.02).paddingOuter(0.01),
      },
      color: {
        domain: pyramidSexes,
        range: colors,
      },
      margin: { top: 20, right: 20, bottom: 70, left: 80 },
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
}
export interface ChartOptions {
  revision: number
}

export const exampleAriaLabel = 'Palmer penguins by species and sex'

export const chart = createExampleChart({
  revision: 0,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
