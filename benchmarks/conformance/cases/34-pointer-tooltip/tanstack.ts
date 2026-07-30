import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import type { ChartPoint, ChartHostOptions } from '@tanstack/charts'
import { scaleLinear, scaleUtc } from 'd3-scale'
import { timeDomain, timeSeries } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = timeSeries(input.revision).filter(
      (row) => row.series === 'Atlas',
    )
    return {
      marks: [
        lineY(rows, {
          x: 'date',
          y: 'value',
          key: 'id',
          stroke: '#2563eb',
        }),
        dot(rows, {
          x: 'date',
          y: 'value',
          key: 'id',
          fill: '#2563eb',
          r: 3,
        }),
      ],
      x: { scale: scaleUtc().domain(timeDomain) },
      y: {
        scale: scaleLinear().domain([10, 60]),
        grid: true,
        label: 'Value',
      },
    }
  })

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    animate: false,
    keyboard: true,
    tooltip: {
      anchor: 'point',
      placement: ['top', 'right', 'left', 'bottom'],
      items: [
        {
          channel: 'y',
          label: 'Atlas',
          text: (point) => point.datum.value.toLocaleString(),
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
  let focusedIds: string[] = []
  const options: ChartHostOptions<TimePoint> = {
    definition: configuredDefinition(input),
    width: input.width,
    height: input.height,
    ariaLabel: 'Interactive Atlas trend',
    onFocusGroupChange(points) {
      focusedIds = points.map((point) => point.datum.id)
    },
  }
  const host = mountChart(container, options)
  const driver: ConformanceTestDriver = {
    resolveTarget(target) {
      if (target.view && target.view !== 'main') return null
      const id = target.anchor.startsWith('point:')
        ? target.anchor.slice('point:'.length)
        : null
      const point = host
        .getScene()
        .points.find((candidate) => candidate.datum.id === id)
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
        focus: { ids: [...focusedIds] },
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
