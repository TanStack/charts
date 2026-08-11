import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { ChartHostOptions, ChartTooltipOptions } from '@tanstack/charts'
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
import { tanstackCase } from '../../shared/mount'

const catalogPreviewDate = '2013-06-06'

const definition = (input: ConformanceInput) => {
  const rows = selectPointerTooltipData(aapl, input.revision)
  return defineChart({
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
            style: {
              r: 7,
              stroke: 'Canvas',
              strokeWidth: 2,
            },
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
    y: { scale: scaleLinear, grid: true, axis: { label: 'Apple close (USD)' } },
  })
}

const interactiveTooltip: ChartTooltipOptions<AaplRow> = {
  anchor: 'point',
  placement: ['top', 'right', 'left', 'bottom'],
  items: [
    {
      channel: 'y',
      label: 'Apple',
      text: (point) =>
        point.datum.Close.toLocaleString('en-US', {
          maximumFractionDigits: 2,
        }),
    },
    {
      channel: 'x',
      label: 'Date',
    },
  ],
}

export const catalogCase = tanstackCase(
  definition,
  'Interactive Apple closing price',
  interactiveTooltip,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'apple-points' &&
            dateKey(point.datum.Date) === catalogPreviewDate,
        ) ?? null
      )
    },
  },
)

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    svgAnimation: false,
    keyboard: true,
    tooltip: {
      use: tooltip,
      ...interactiveTooltip,
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
      const matrix = svg.getScreenCTM()
      if (!matrix) {
        const bounds = svg.getBoundingClientRect()
        const scene = host.getScene()
        return {
          x: bounds.left + (point.x / scene.width) * bounds.width,
          y: bounds.top + (point.y / scene.height) * bounds.height,
          focusElement: svg,
        }
      }
      return {
        x: matrix.a * point.x + matrix.c * point.y + matrix.e,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f,
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
