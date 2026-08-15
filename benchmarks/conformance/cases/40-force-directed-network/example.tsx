import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { defineChart, dot, link, text } from '@tanstack/charts'
import { forceLayout } from '@tanstack/charts/network/force'
import { miserables } from '@tanstack/charts-data/miserables'
import { scaleLinear } from 'd3-scale'
import { forceNetworkData } from './transform'

const colors = ['#2563eb', '#f97316', '#10b981']
const network = forceNetworkData(miserables)

export const createExampleChart = (input: ChartOptions) => {
  const distanceDelta = Math.abs(input.revision % 2) * 3
  const graph = forceLayout(network.nodes, network.links, {
    nodeKey: 'id',
    source: 'source',
    target: 'target',
    iterations: 300,
    domainPadding: 0.2,
    forces: [
      {
        type: 'link',
        distance: (datum) =>
          54 - Math.min(datum.value, 10) * 1.8 + distanceDelta,
        strength: (datum) => 0.2 + Math.min(datum.value, 10) * 0.045,
      },
      { type: 'manyBody', strength: -165 },
      { type: 'center', x: 0, y: 0 },
      { type: 'collide', radius: 15, strength: 0.9 },
      { type: 'x', x: 0, strength: 0.035 },
      { type: 'y', y: 0, strength: 0.035 },
    ],
  })

  return defineChart(
    {
      marks: [
        link(graph.links, {
          id: 'network-links',
          x1: 'x1',
          y1: 'y1',
          x2: 'x2',
          y2: 'y2',
          key: ({ source, target }) => `${source}->${target}`,
          stroke: '#94a3b8',
          strokeOpacity: 0.6,
          strokeWidth: 2,
        }),
        dot(graph.nodes, {
          id: 'network-nodes',
          x: 'x',
          y: 'y',
          color: 'group',
          key: 'id',
          r: 7,
          stroke: '#ffffff',
          strokeWidth: 1.5,
        }),
        ...(input.preview === true
          ? []
          : [
              text(graph.nodes, {
                id: 'network-labels',
                x: 'x',
                y: 'y',
                text: 'id',
                key: 'id',
                dy: -12,
                fontSize: 10,
                fontWeight: 600,
              }),
            ]),
      ],
      x: {
        scale: scaleLinear().domain(graph.xDomain),
      },
      y: {
        scale: scaleLinear().domain(graph.yDomain),
      },
      guides: false,
      color: {
        range: colors,
      },
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            'group' in datum
              ? `${datum.id} · Group ${datum.group}`
              : `${datum.source} → ${datum.target} · Value ${datum.value}`,
        },
      },
    },
  )
}
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel =
  'Force-directed Les Misérables character network'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
