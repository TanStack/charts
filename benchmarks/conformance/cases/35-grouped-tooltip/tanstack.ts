import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import type { ChartPoint, ChartHostOptions } from '@tanstack/charts'
import { scaleLinear, scaleOrdinal, scaleUtc } from 'd3-scale'
import { timeDomain, timeSeries } from '../../shared/data'
import type { TimePoint } from '../../shared/data'
import type {
  ConformanceHandle,
  ConformanceInput,
  ConformanceTestDriver,
} from '../../types'

const series: readonly TimePoint['series'][] = ['Atlas', 'Beacon', 'Comet']
const colors = ['#2563eb', '#f97316', '#10b981']

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const rows = timeSeries(input.revision)
    return {
      marks: [
        lineY(rows, {
          x: 'date',
          y: 'value',
          z: 'series',
          key: 'id',
        }),
        dot(rows, {
          x: 'date',
          y: 'value',
          z: 'series',
          key: 'id',
          r: 2.5,
        }),
      ],
      x: { scale: scaleUtc().domain(timeDomain) },
      y: {
        scale: scaleLinear().domain([10, 85]),
        grid: true,
        label: 'Value',
      },
      color: {
        scale: scaleOrdinal<TimePoint['series'], string>()
          .domain(series)
          .range(colors),
      },
    }
  })

const configuredDefinition = (input: ConformanceInput) =>
  defineChart(definition(input), {
    animate: false,
    keyboard: true,
    focus: 'group-x',
    tooltip: {
      portal: true,
      anchor: 'group-center',
      placement: ['top', 'right', 'left', 'bottom'],
      sort: 'color-domain',
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
    ariaLabel: 'Grouped series tooltip',
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
