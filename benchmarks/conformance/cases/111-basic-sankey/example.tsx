import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { d3Curve, defineChart, link, rect, text } from '@tanstack/charts'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'
import { curveBumpX } from 'd3-shape'
import { basicSankeyData } from './model'
import type { SankeyLink, SankeyNode } from '@tanstack/charts/network/sankey'
import type { BasicFlowLink, BasicFlowNode } from './model'

export type BasicSankeyNodeRow = SankeyNode<
  BasicFlowNode,
  BasicFlowLink,
  string
>
export type BasicSankeyLinkRow = SankeyLink<
  BasicFlowNode,
  BasicFlowLink,
  string
>
export type BasicSankeyDatum = BasicSankeyNodeRow | BasicSankeyLinkRow

export const createExampleChart = (input: ChartOptions) => {
  const { nodes, links } = basicSankeyData(input.revision)

  return defineChart(
    {
      marks: [
        sankeyDiagram({
          id: 'basic-sankey',
          nodes,
          links,
          nodeKey: 'id',
          source: 'source',
          target: 'target',
          value: 'value',
          align: 'left',
          nodeWidth:
            input.preview === true
              ? 8
              : ({ width }) => clamp(width * 0.025, 10, 18),
          nodePadding:
            input.preview === true
              ? 8
              : ({ height }) => clamp(height * 0.12, 18, 38),
          inset:
            input.preview === true
              ? 4
              : ({ width, height }) => ({
                  left: clamp(width * 0.14, 48, 82),
                  right: clamp(width * 0.14, 48, 82),
                  top: clamp(height * 0.1, 18, 32),
                  bottom: clamp(height * 0.1, 18, 32),
                }),
          iterations: 16,
          marks: ({ chart, nodes: sankeyNodes, links: sankeyLinks }) => {
            const labelFontSize = clamp(chart.width * 0.018, 8, 12)
            const labelOffset = clamp(chart.width * 0.012, 4, 8)
            return [
              link(sankeyLinks, {
                id: 'links',
                x1: 'x1',
                y1: 'y1',
                x2: 'x2',
                y2: 'y2',
                key: 'key',
                stroke: 'currentColor',
                strokeOpacity: 0.35,
                strokeWidth: (flow) => Math.max(1, flow.width),
                lineCap: 'butt',
                curve: d3Curve(curveBumpX),
              }),
              rect(sankeyNodes, {
                id: 'nodes',
                x1: 'x0',
                x2: 'x1',
                y1: 'y0',
                y2: 'y1',
                key: 'key',
                fill: 'currentColor',
                fillOpacity: 0.72,
                inset: 0,
              }),
              ...(input.preview === true
                ? []
                : [
                    text(sankeyNodes, {
                      id: 'labels',
                      x: (node) =>
                        node.depth === 0
                          ? node.x0 - labelOffset
                          : node.x1 + labelOffset,
                      y: (node) => node.y,
                      text: (node) => node.data.label,
                      key: 'key',
                      anchor: (node) => (node.depth === 0 ? 'end' : 'start'),
                      fill: 'currentColor',
                      fontSize: labelFontSize,
                      fontWeight: 650,
                    }),
                  ]),
            ] as const
          },
        }),
      ],
      guides: false,
      margin: 0,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) =>
            datum.kind === 'node'
              ? `${datum.data.label} · ${datum.value}`
              : `${datum.sourceNode.data.label} → ${datum.targetNode.data.label} · ${datum.value}`,
        },
      },
    },
  )
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
export interface ChartOptions {
  revision: number
  preview?: boolean
}

export const exampleAriaLabel = 'Basic Sankey'

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
