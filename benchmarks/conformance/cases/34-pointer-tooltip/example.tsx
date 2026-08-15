import { aapl } from '@tanstack/charts-data/aapl'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ChartTooltipOptions } from '@tanstack/charts'
import { selectPointerTooltipData } from './selection'

export interface ChartOptions {
  revision?: number
}

const interactiveTooltip: ChartTooltipOptions<AaplRow> = {
  anchor: 'point',
  placement: ['top', 'right', 'left', 'bottom'],
  items: [
    {
      channel: 'y',
      label: 'Apple',
      text: (point) =>
        point.datum.Close.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }),
    },
    { channel: 'x', label: 'Date' },
  ],
}

export function createExampleChart({ revision = 0 }: ChartOptions = {}) {
  const rows = selectPointerTooltipData(aapl, revision)
  return defineChart(
    {
      marks: [
        decorative(
          lineY(rows, {
            x: 'Date',
            y: 'Close',
            stroke: '#2563eb',
          }),
        ),
        dot(rows, {
          id: 'apple-points',
          x: 'Date',
          y: 'Close',
          fill: '#2563eb',
          r: 3,
          states: [
            {
              when: { focus: 'primary' },
              style: { r: 7, stroke: 'Canvas', strokeWidth: 2 },
              transition: {
                type: 'tween',
                duration: 140,
                easing: 'ease-out',
              },
            },
          ],
        }),
      ],
      x: { scale: scaleUtc },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Apple close (USD)' },
      },
    },
    {
      keyboard: true,
      tooltip: { use: tooltip, ...interactiveTooltip },
    },
  )
}

export const exampleAriaLabel = 'Interactive Apple closing price'
export const chart = createExampleChart()

export default function Example() {
  return <Chart definition={chart} ariaLabel={exampleAriaLabel} height={480} />
}
