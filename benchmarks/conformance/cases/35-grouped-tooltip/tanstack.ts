import {
  bandX,
  defineChart,
  dot,
  lineY,
  mountChart,
  whenFocused,
} from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { ChartHostOptions, ChartTooltipOptions } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { portal } from '@tanstack/charts/tooltip/portal'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { industries } from '@charts-poc/demo-data/industries'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'
import { industryNames, selectGroupedTooltipData } from './selection'
import type { GroupedTooltipDatum } from './selection'
import { tanstackCase } from '../../shared/mount'

const colors = ['#2563eb', '#f97316', '#10b981']
const catalogPreviewDate = '2001-07-01'

const definition = (input: ConformanceInput) => {
  const rows = selectGroupedTooltipData(industries, input.revision)
  const dates = rows.filter((row) => row.industry === industryNames[0])
  return defineChart({
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
        lineY(rows, {
          x: 'date',
          y: 'unemployed',
          color: 'industry',
        }),
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
            transition: {
              type: 'tween',
              duration: 140,
              easing: 'ease-out',
            },
          },
          {
            when: { focus: 'unmatched' },
            style: { opacity: 0.3 },
          },
        ],
      }),
    ],
    x: { scale: scaleUtc },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { label: 'Unemployed (thousands)' },
    },
    color: {
      domain: industryNames,
      range: colors,
    },
  })
}

const interactiveTooltip: ChartTooltipOptions<GroupedTooltipDatum> = {
  portal,
  anchor: 'group-center',
  placement: ['top', 'right', 'left', 'bottom'],
  sort: 'color-domain',
}

const catalogDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), { focus: 'group-x' })

export const catalogCase = tanstackCase(
  catalogDefinition,
  'Grouped industry unemployment tooltip',
  interactiveTooltip,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'grouped-points' &&
            point.datum.industry === industryNames[0] &&
            dateKey(point.datum.date) === catalogPreviewDate,
        ) ?? null
      )
    },
  },
)

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    svgAnimation: false,
    keyboard: true,
    focus: 'group-x',
    tooltip: {
      use: tooltip,
      ...interactiveTooltip,
    },
  })

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let focusedRows: string[] = []
  const options: ChartHostOptions<GroupedTooltipDatum> = {
    definition: configuredDefinition(input),
    width: input.width,
    height: input.height,
    ariaLabel: 'Grouped industry unemployment tooltip',
    onFocusGroupChange(points) {
      focusedRows = points.map(
        (point) => `${dateKey(point.datum.date)}:${point.datum.industry}`,
      )
    },
  }
  const host = mountChart(container, options)
  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const date = target.anchor.startsWith('date:')
        ? target.anchor.slice('date:'.length)
        : null
      const point = host
        .getScene()
        .points.find(
          (candidate) =>
            dateKey(candidate.datum.date) === date &&
            candidate.datum.industry === industryNames[0],
        )
      const svg = container.querySelector('svg')
      if (!point || !svg) return null
      const scene = host.getScene()
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + (point.x / scene.width) * bounds.width,
        y: bounds.top + (point.y / scene.height) * bounds.height,
        focusElement: svg,
      }
    },
    readState() {
      const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
      return {
        focus: { rows: [...focusedRows] },
        tooltip: {
          visible: Boolean(tooltip && !tooltip.hidden),
          text: tooltip?.textContent?.trim() ?? '',
        },
      }
    },
  }

  return {
    driver,
    update(nextInput) {
      host.update({
        ...options,
        definition: configuredDefinition(nextInput),
        width: nextInput.width,
        height: nextInput.height,
      })
    },
    destroy() {
      host.destroy()
    },
  }
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}
