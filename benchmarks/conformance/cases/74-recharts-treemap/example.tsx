import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart } from '@tanstack/charts'
import { treemap } from '@tanstack/charts/hierarchy/treemap'
import { flare } from '@charts-poc/demo-data/flare'
import { selectTreemapData } from './selection'

const colors = ['#2563eb', '#8b5cf6', '#10b981']

const rows = selectTreemapData(flare)

export const treemapDefinition = (input?: ExampleOptions) =>
  defineChart({
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
  })
export interface ExampleOptions {
  width: number
  height: number
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Flare analytics treemap'

export const createExampleChart = (options: ExampleOptions) =>
  defineChart(treemapDefinition(options), {
    keyboard: true,
    tooltip: exampleTooltip,
  })

export const chart = createExampleChart({
  width: 640,
  height: 480,
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
