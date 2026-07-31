import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import type { ChartHostOptions } from '@tanstack/charts'
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

const colors = ['#2563eb', '#f97316', '#10b981']

const definition = (input: ConformanceInput) => {
  const rows = selectGroupedTooltipData(industries, input.revision)
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'date',
        y: 'unemployed',
        color: 'industry',
      }),
      dot(rows, {
        x: 'date',
        y: 'unemployed',
        color: 'industry',
        r: 2.5,
      }),
    ],
    x: { scale: scaleUtc },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Unemployed (thousands)',
    },
    color: {
      domain: industryNames,
      range: colors,
    },
  })
}

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    animate: false,
    keyboard: true,
    focus: 'group-x',
    tooltip: {
      use: tooltip,
      portal,
      anchor: 'group-center',
      placement: ['top', 'right', 'left', 'bottom'],
      sort: 'color-domain',
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
