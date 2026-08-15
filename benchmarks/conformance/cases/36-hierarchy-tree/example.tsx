import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, dot, link, text } from '@tanstack/charts'
import { treeLayout } from '@tanstack/charts/hierarchy/tree'
import { flare } from '@tanstack/charts-data/flare'
import { scaleLinear } from 'd3-scale'
import { selectHierarchyData } from './selection'

export const createExampleChart = (input: ChartOptions) => {
  const layout = treeLayout(selectHierarchyData(flare, input.revision), {
    path: 'name',
    delimiter: '.',
  })

  return defineChart(
    {
      marks: [
        link(layout.links, {
          id: 'hierarchy-links',
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: 'id',
          stroke: '#94a3b8',
          strokeOpacity: 0.55,
          strokeWidth: 1.5,
        }),
        dot(layout.nodes, {
          id: 'hierarchy-nodes',
          x: 'x',
          y: 'y',
          key: 'id',
          fill: '#2563eb',
          r: 3.5,
        }),
        text(layout.nodes, {
          id: 'hierarchy-labels',
          x: 'x',
          y: 'y',
          text: 'name',
          key: 'id',
          fill: '#2563eb',
          fontSize: input.preview === true ? 8 : 10,
          anchor: (node) =>
            input.preview === true
              ? node.internal
                ? 'start'
                : 'end'
              : node.internal
                ? 'end'
                : 'start',
          dx: (node) =>
            input.preview === true
              ? node.internal
                ? 4
                : -4
              : node.internal
                ? -6
                : 6,
          dy: (node) =>
            input.preview !== true ? 0 : node.y >= 1 ? 5 : node.y <= 0 ? -5 : 0,
        }),
      ],
      x: { scale: scaleLinear },
      y: { scale: scaleLinear },
      guides: false,
      margin: { top: 22, right: 140, bottom: 22, left: 50 },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            'internal' in datum
              ? `${datum.data?.name ?? datum.name} · ${datum.internal ? 'Group' : 'Leaf'}`
              : `${datum.sourceNode.data?.name ?? datum.source} → ${datum.targetNode.data?.name ?? datum.target}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Tidy Flare analytics hierarchy'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
