import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import type { ChartHostOptions } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { aapl } from '@charts-poc/demo-data/aapl'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'
import { selectPointerTooltipData } from './selection'

const definition = (input: ConformanceInput) => {
  const rows = selectPointerTooltipData(aapl, input.revision)
  return defineChart({
    marks: [
      lineY(rows, {
        x: 'Date',
        y: 'Close',
        stroke: '#2563eb',
      }),
      dot(rows, {
        x: 'Date',
        y: 'Close',
        fill: '#2563eb',
        r: 3,
      }),
    ],
    x: { scale: scaleUtc },
    y: {
      scale: scaleLinear,
      grid: true,
      label: 'Apple close (USD)',
    },
  })
}

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    animate: false,
    keyboard: true,
    tooltip: {
      use: tooltip,
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
        {
          channel: 'x',
          label: 'Date',
        },
      ],
    },
  })

export function mount(
  container: HTMLElement,
  input: ConformanceInput,
): ConformanceHandle {
  let focusedDates: string[] = []
  const options: ChartHostOptions<AaplRow> = {
    definition: configuredDefinition(input),
    width: input.width,
    height: input.height,
    ariaLabel: 'Interactive Apple closing price',
    onFocusGroupChange(points) {
      focusedDates = points.map((point) => dateKey(point.datum.Date))
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
        .points.find((candidate) => dateKey(candidate.datum.Date) === date)
      const svg = container.querySelector('svg')
      if (!point || !svg) return null
      const bounds = svg.getBoundingClientRect()
      return {
        x: bounds.left + (point.x / host.getScene().width) * bounds.width,
        y: bounds.top + (point.y / host.getScene().height) * bounds.height,
        focusElement: svg,
      }
    },
    readState() {
      const tooltip = container.querySelector<HTMLElement>('.ts-chart-tooltip')
      return {
        focus: { dates: [...focusedDates] },
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
