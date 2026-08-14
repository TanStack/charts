import { axisPointerDefinition } from './example'
export { axisPointerDefinition } from './example'
import { industries } from '@charts-poc/demo-data/industries'
import { mountChart } from '@tanstack/charts'
import { tooltip } from '@tanstack/charts/tooltip'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import { axisPointerColors } from './colors'
import {
  axisPointerAnchorDate,
  axisPointerDateKey,
  axisPointerRowsAtDate,
  axisPointerTargetValue,
} from './model'
import { axisPointerData, axisPointerIndustries } from './selection'
import type {
  ChartHostOptions,
  ChartPoint,
  ChartScene,
  ChartTooltipOptions,
} from '@tanstack/charts'
import type { AxisPointerDatum } from './selection'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'

const month = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
})
const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const axisPointerTooltip: ChartTooltipOptions<AxisPointerDatum> = {
  className: 'conformance-tooltip-grouped',
  sticky: false,
  anchor: { x: 'value', y: 'plot-top' },
  placement: ['bottom-right', 'bottom-left', 'right', 'left'],
  offset: 10,
  sort: 'color-domain',
  items: [
    {
      channel: 'x',
      label: '',
      text: (point) => monthYear.format(point.datum.date),
    },
    {
      channel: 'y',
      text: (point) => point.datum.unemployed.toLocaleString('en-US'),
    },
    { channel: 'group', label: 'Industry' },
  ],
}

export const catalogCase = tanstackCase(
  axisPointerDefinition,
  'Snapped axis pointer with grouped tooltip',
  axisPointerTooltip,
  {
    guides: true,
    margin: true,
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'industry-points' &&
            point.datum.industry === axisPointerIndustries[0] &&
            axisPointerDateKey(point.datum.date) === '2005-05-01',
        ) ?? null
      )
    },
  },
)

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let focusedPoints: readonly ChartPoint<AxisPointerDatum, Date, number>[] = []
  const options = (): ChartHostOptions<AxisPointerDatum, Date, number> => ({
    definition: axisPointerDefinition(currentInput),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'Snapped axis pointer with grouped tooltip',
    ariaDescription:
      'Move across the chart or use the arrow keys to compare all three industries at the nearest month.',
    onFocusGroupChange(points) {
      focusedPoints = points
    },
  })
  const host = mountChart(container, options())

  const driver: ConformanceTestDriver = {
    viewBounds(view) {
      if (view && view !== 'main') return null
      const bounds = container.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
    resolveTarget(target) {
      return resolveTarget(container, currentInput, host.getScene(), target)
    },
    readState() {
      const crosshair = container.querySelector('.ts-chart__focus-guide-x-rule')
      const tooltipElement =
        container.querySelector<HTMLElement>('.ts-chart-tooltip')
      return interactionState(
        focusedPoints,
        Boolean(crosshair),
        Boolean(tooltipElement && !tooltipElement.hidden),
      )
    },
    geometry(query) {
      return geometry(container, currentInput, host.getScene(), query)
    },
  }

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      focusedPoints = []
      host.update(options())
    },
    destroy() {
      host.destroy()
    },
  }
}

function resolveTarget(
  surface: HTMLElement,
  input: ConformanceInput,
  scene: ChartScene<AxisPointerDatum, Date, number>,
  target: ConformanceTarget,
) {
  if (target.view && target.view !== 'main') return null
  const rows = axisPointerData(industries, input.revision)
  const date = axisPointerAnchorDate(target.anchor, rows)
  if (!date) return null
  const focusedRows = axisPointerRowsAtDate(rows, date)
  const targetValue = axisPointerTargetValue(focusedRows)
  if (targetValue === null) return null
  return scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(targetValue),
  )
}

function geometry(
  surface: HTMLElement,
  input: ConformanceInput,
  scene: ChartScene<AxisPointerDatum, Date, number>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const svgBounds = svg.getBoundingClientRect()
  const scaleX = svgBounds.width / scene.width
  const scaleY = svgBounds.height / scene.height
  const rows = axisPointerData(industries, input.revision)

  if (query.role === 'dot') {
    return rows.map((row) => ({
      x: svgBounds.left + scene.scales.x.map(row.date) * scaleX - 3 * scaleX,
      y:
        svgBounds.top +
        scene.scales.y.map(row.unemployed) * scaleY -
        3 * scaleY,
      width: 6 * scaleX,
      height: 6 * scaleY,
      paint: axisPointerColors[row.industry],
    }))
  }

  if (query.role === 'line') {
    return axisPointerIndustries.flatMap((industry) => {
      const points = rows
        .filter((row) => row.industry === industry)
        .map((row): readonly [number, number] => [
          scene.scales.x.map(row.date),
          scene.scales.y.map(row.unemployed),
        ])
      const sample = clientPointBounds(points, svgBounds, {
        scaleX,
        scaleY,
        paint: axisPointerColors[industry],
      })
      return sample ? [sample] : []
    })
  }

  return []
}

function interactionState(
  points: readonly ChartPoint<AxisPointerDatum>[],
  crosshairVisible: boolean,
  tooltipVisible: boolean,
): ConformanceJsonObject {
  const ordered = axisPointerIndustries.flatMap((industry) => {
    const point = points.find(
      (candidate) => candidate.datum.industry === industry,
    )
    return point ? [point] : []
  })
  const date = ordered[0]?.datum.date
  return {
    focus: {
      date: date ? axisPointerDateKey(date) : null,
      industries: ordered.map((point) => point.datum.industry),
      values: ordered.map((point) => point.datum.unemployed),
    },
    crosshair: { visible: crosshairVisible },
    tooltip: { visible: tooltipVisible },
  }
}
