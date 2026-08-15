import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { treemap } from '@tanstack/charts/hierarchy/treemap'
import { flare } from '@tanstack/charts-data/flare'
import { selectTreemapData } from './selection'

const colors = ['#2563eb', '#8b5cf6', '#10b981']

const rows = selectTreemapData(flare)

export const createExampleChart = (input?: ChartOptions) =>
  defineChart(
    {
      marks: [
        treemap(rows, {
          id: 'treemap-cells',
          path: 'name',
          delimiter: '.',
          value: 'size',
          ratio: 4 / 3,
          round: true,
          color: (node) => node.ancestorIds.at(-1) ?? node.id,
          inset: 1,
          stroke: '#ffffff',
          strokeWidth: 1,
          label: input?.preview === true ? undefined : 'name',
          labelFill: '#ffffff',
          labelFontSize: 8,
          labelFontWeight: 600,
        }),
      ],
      color: { range: colors },
      guides: false,
      margin: 0,
    },
    { keyboard: true, tooltip: exampleTooltip },
  )
export interface ChartOptions {
  preview?: boolean
}

export const exampleAriaLabel = 'Flare analytics treemap'

export const chart = createExampleChart({
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
