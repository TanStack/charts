import { industries } from '@tanstack/charts-data/industries'
import { bandX, defineChart, dot, lineY, whenFocused } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import { Chart } from '@tanstack/charts/react/tooltip'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear, scaleUtc } from 'd3-scale'
import type { ChartTooltipOptions } from '@tanstack/charts'
import { industryNames, selectGroupedTooltipData } from './selection'
import type { GroupedTooltipDatum } from './selection'

export interface ChartOptions {
  revision?: number
}

const colors = ['#2563eb', '#f97316', '#10b981']
const interactiveTooltip: ChartTooltipOptions<GroupedTooltipDatum> = {
  portal,
  anchor: 'group-center',
  placement: ['top', 'right', 'left', 'bottom'],
  sort: 'color-domain',
}

export function createExampleChart({ revision = 0 }: ChartOptions = {}) {
  const rows = selectGroupedTooltipData(industries, revision)
  const dates = rows.filter((row) => row.industry === industryNames[0])
  return defineChart(
    {
      marks: [
        whenFocused(
          bandX(dates, {
            id: 'focus-date-band',
            x: 'date',
            fill: '#64748b',
            fillOpacity: 0.14,
            inset: 3,
            radius: 4,
          }),
          { match: 'x' },
        ),
        decorative(
          lineY(rows, { x: 'date', y: 'unemployed', color: 'industry' }),
        ),
        dot(rows, {
          id: 'grouped-points',
          x: 'date',
          y: 'unemployed',
          z: 'industry',
          color: 'industry',
          r: 2.5,
          states: [
            {
              when: { focus: 'group' },
              style: { r: 5, stroke: 'Canvas', strokeWidth: 1.5 },
              transition: { type: 'tween', duration: 140, easing: 'ease-out' },
            },
            { when: { focus: 'unmatched' }, style: { opacity: 0.3 } },
          ],
        }),
      ],
      x: { scale: scaleUtc },
      y: {
        scale: scaleLinear,
        grid: true,
        axis: { label: 'Unemployed (thousands)' },
      },
      color: { domain: industryNames, range: colors },
    },
    {
      keyboard: true,
      focus: 'group-x',
      tooltip: { use: tooltip, ...interactiveTooltip },
    },
  )
}

export const exampleAriaLabel = 'Grouped industry unemployment tooltip'
export const chart = createExampleChart()

export default function Example() {
  return <Chart definition={chart} ariaLabel={exampleAriaLabel} height={480} />
}
