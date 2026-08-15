import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip as exampleTooltip } from '@tanstack/charts/tooltip'

import { d3Curve, defineChart, link, rect, text } from '@tanstack/charts'
import { sankeyDiagram } from '@tanstack/charts/network/sankey'
import { curveBumpX } from 'd3-shape'
import { labelBackdropBounds } from './layout'
import {
  incomeStatementData,
  incomeStatementTitle,
  linkColors,
  toneColors,
} from './model'
import type { SankeyLink, SankeyNode } from '@tanstack/charts/network/sankey'
import type { FlowLink, FlowNode, FlowNodeId, FlowTone } from './model'

const toneDomain = [
  'Neutral',
  'Profit',
  'Cost',
] as const satisfies readonly FlowTone[]

export type IncomeSankeyNodeRow = SankeyNode<FlowNode, FlowLink, FlowNodeId>
export type IncomeSankeyLinkRow = SankeyLink<FlowNode, FlowLink, FlowNodeId>

export interface IncomeSankeyTitleRow {
  readonly kind: 'title'
  readonly id: 'title'
  readonly title: string
  readonly x: number
  readonly y: number
}

interface IncomeSankeyLabelRow extends IncomeSankeyNodeRow {
  readonly labelText: string
  readonly labelX: number
  readonly labelNameY: number
  readonly labelValueY: number
  readonly labelAnchor: 'start' | 'end'
  readonly backdropX0: number
  readonly backdropX1: number
  readonly backdropY0: number
  readonly backdropY1: number
}

export type IncomeSankeyDatum =
  IncomeSankeyNodeRow | IncomeSankeyLinkRow | IncomeSankeyTitleRow

export const createExampleChart = (input: ChartOptions) => {
  const sourceData = incomeStatementData(input.revision)

  return defineChart(
    {
      marks: [
        sankeyDiagram({
          id: 'income-sankey',
          nodes: sourceData.nodes,
          links: sourceData.links,
          nodeKey: 'id',
          source: 'source',
          target: 'target',
          value: 'value',
          align: 'left',
          nodeSort: (left, right) => left.data.order - right.data.order,
          nodeWidth:
            input.preview === true
              ? 8
              : ({ width }) => clamp(width * 0.032, 10, 24),
          nodePadding:
            input.preview === true
              ? 3
              : ({ height }) => clamp(height * 0.11, 12, 40),
          inset:
            input.preview === true
              ? 4
              : ({ width, height }) => ({
                  left: clamp(width * 0.15, 56, 122),
                  right: clamp(width * 0.13, 48, 105),
                  top: clamp(height * 0.14, 38, 70),
                  bottom: clamp(height * 0.025, 8, 14),
                }),
          iterations: 32,
          marks: ({ chart, nodes: sankeyNodes, links: sankeyLinks }) => {
            const flowMarks = [
              link(sankeyLinks, {
                id: 'links',
                x1: 'x1',
                y1: 'y1',
                x2: 'x2',
                y2: 'y2',
                key: 'key',
                stroke: (flow) => linkColors[flow.data.tone],
                strokeOpacity: (flow) =>
                  flow.data.tone === 'Neutral' ? 0.58 : 0.64,
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
                color: (node) => node.data.tone,
                inset: 0,
              }),
            ] as const
            if (input.preview === true) return flowMarks

            const labelFontSize = clamp(chart.width * 0.013, 6.5, 10.5)
            const labelOffset = clamp(chart.width * 0.008, 3, 6)
            const labelRows = sankeyNodes.map((node): IncomeSankeyLabelRow => {
              const labelAnchor =
                node.data.labelSide === 'right' ? 'start' : 'end'
              const labelX =
                node.data.labelSide === 'right'
                  ? node.x1 + labelOffset
                  : node.x0 - labelOffset
              const labelText =
                chart.width < 720 && node.data.compactLabel
                  ? node.data.compactLabel
                  : node.data.label
              const backdrop = labelBackdropBounds({
                anchor: labelAnchor,
                centerY: node.y,
                fontSize: labelFontSize,
                label: labelText,
                labelX,
                value: node.data.displayValue,
              })
              return {
                ...node,
                labelText,
                labelX,
                labelNameY: node.y - labelFontSize * 0.5,
                labelValueY: node.y + labelFontSize * 0.58,
                labelAnchor,
                backdropX0: backdrop.x,
                backdropX1: backdrop.x + backdrop.width,
                backdropY0: backdrop.y,
                backdropY1: backdrop.y + backdrop.height,
              }
            })
            const backdropRows = labelRows.filter(
              (node) => node.data.labelBackdrop,
            )
            const titleRows: readonly IncomeSankeyTitleRow[] = [
              {
                kind: 'title',
                id: 'title',
                title: incomeStatementTitle,
                x: chart.x + chart.width / 2,
                y: chart.y + clamp(chart.height * 0.065, 17, 32),
              },
            ]

            return [
              ...flowMarks,
              rect(backdropRows, {
                id: 'label-backdrops',
                x1: 'backdropX0',
                x2: 'backdropX1',
                y1: 'backdropY0',
                y2: 'backdropY1',
                key: 'key',
                fill: 'var(--panel, #ffffff)',
                fillOpacity: 0.82,
                inset: 0,
                radius: 1,
              }),
              text(labelRows, {
                id: 'label-names',
                x: 'labelX',
                y: 'labelNameY',
                text: 'labelText',
                key: 'key',
                anchor: (node) => node.labelAnchor,
                fill: 'currentColor',
                fontSize: labelFontSize,
                fontWeight: 700,
              }),
              text(labelRows, {
                id: 'label-values',
                x: 'labelX',
                y: 'labelValueY',
                text: (node) => node.data.displayValue,
                key: 'key',
                anchor: (node) => node.labelAnchor,
                fill: 'currentColor',
                fontSize: labelFontSize,
                fontWeight: 500,
              }),
              text(titleRows, {
                id: 'title',
                x: 'x',
                y: 'y',
                text: 'title',
                key: 'id',
                fill: '#155477',
                fontSize: clamp(chart.width * 0.034, 14, 26),
                fontWeight: 750,
              }),
            ] as const
          },
        }),
      ],
      color: {
        domain: toneDomain,
        range: toneDomain.map((tone) => toneColors[tone]),
      },
      guides: false,
      margin: 0,
    },
    {
      keyboard: true,
      tooltip: {
        use: exampleTooltip,
        ...{
          format: ({ datum }) => {
            if (datum.kind === 'title') return datum.title
            if (datum.kind === 'node') {
              return `${datum.data.label} · ${datum.data.displayValue}`
            }
            return `${datum.sourceNode.data.label} → ${datum.targetNode.data.label} · ${datum.value}`
          },
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

export const exampleAriaLabel = incomeStatementTitle

export const chart = createExampleChart({
  revision: 0,
  preview: false,
})

export default function Example() {
  return <Chart ariaLabel={exampleAriaLabel} definition={chart} height={480} />
}
