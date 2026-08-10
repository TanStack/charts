import { barY, crosshair, defineChart } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { dashboardRows } from './model'
import type { ChartTooltipOptions } from '@tanstack/charts'
import type { ConformanceInput } from '../../types'
import type { DashboardMetric, DashboardRow } from './model'

export const dashboardSpring = {
  type: 'spring' as const,
  stiffness: 210,
  damping: 24,
  mass: 0.78,
}

const tickIds = ['01', '06', '12', '18', '24']

const tooltipOptions: ChartTooltipOptions<DashboardRow> = {
  anchor: 'point',
  placement: ['top', 'right', 'left'],
  className: 'active-bar-tooltip',
}

export function activeBarDashboardDefinition(
  input: ConformanceInput,
  metric: DashboardMetric,
) {
  const rows = dashboardRows(input.revision)
  const maximum = Math.max(...rows.map((row) => row[metric]))

  return defineChart(
    {
      marks: [
        barY(rows, {
          id: 'daily-visitors',
          x: 'id',
          y: metric,
          key: 'id',
          fill: 'url(#visitor-bars)',
          radius: 4,
          inset: input.preview ? 1.5 : 2.5,
          states: [
            {
              when: { focus: 'unmatched' },
              style: { opacity: 0.26 },
              transition: dashboardSpring,
            },
            {
              when: { focus: 'primary' },
              style: { opacity: 1, inset: input.preview ? 0.5 : 1.5 },
              transition: dashboardSpring,
            },
          ],
        }),
        crosshair<string, number>({
          id: 'active-bar-ring',
          x: {
            band: {
              inset: -2,
              radius: 6,
              fill: 'transparent',
              stroke: 'var(--ts-chart-1)',
              strokeOpacity: 0.92,
              strokeWidth: 1.5,
            },
          },
          y: false,
          motion: { transition: dashboardSpring },
        }),
      ],
      x: {
        scale: scaleBand<string>()
          .domain(rows.map((row) => row.id))
          .paddingInner(0.18)
          .paddingOuter(0.08),
        axis: {
          line: false,
          ticks: {
            values: tickIds,
            size: 0,
            padding: input.preview ? 4 : 8,
            format: (value) => rows.find((row) => row.id === value)?.day ?? '',
          },
          tickLabels: {
            fontSize: input.preview ? 8 : 10,
            opacity: 0.52,
          },
        },
      },
      y: {
        scale: scaleLinear().domain([0, Math.ceil(maximum * 1.12)]),
        grid: true,
        axis: false,
      },
      gradients: [
        {
          id: 'visitor-bars',
          x1: 0,
          y1: 1,
          x2: 0,
          y2: 0,
          stops: [
            { offset: 0, color: 'var(--ts-chart-1)', opacity: 0.42 },
            { offset: 1, color: 'var(--ts-chart-1)', opacity: 0.96 },
          ],
        },
      ],
      motion: { transition: dashboardSpring },
      margin: input.preview
        ? { top: 8, right: 18, bottom: 22, left: 18 }
        : { top: 12, right: 8, bottom: 34, left: 8 },
    },
    {
      focus: 'nearest',
      keyboard: input.interactive,
      tooltip: input.interactive
        ? {
            use: tooltip,
            ...tooltipOptions,
            format: ({ datum }) =>
              `${datum.day} · ${datum[metric].toLocaleString('en-US')} ${metric} visitors`,
          }
        : false,
    },
  )
}
