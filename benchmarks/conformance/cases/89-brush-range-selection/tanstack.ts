import { brushRangeDefinition, brushRangeStatus, copyRange } from './example'
import type { BrushState } from './example'
export { brushRangeDefinition, brushRangeStatus, copyRange } from './example'
export type { BrushState } from './example'
import { aapl } from '@tanstack/charts-data/aapl'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import {
  brushDateFromAnchor,
  brushDateKey,
  brushRangeSummary,
  initialBrushRange,
  monthlyAaplRows,
  observedBrushDates,
} from './model'
import { normalizedElementFill } from './paint'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { BrushRange } from '@tanstack/charts/interaction/brush'
import type { ChartScene } from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'

const color = '#2563eb'
const brushRows = monthlyAaplRows(aapl)
const brushDates = observedBrushDates(brushRows)

export const catalogCase = tanstackCase(
  () => brushRangeDefinition(initialBrushRange(brushDates), () => {}),
  'Time series with a draggable horizontal range brush',
)

export { mount } from './view'

export function createDriver(
  shell: HTMLElement,
  surface: HTMLElement,
  getScene: () => ChartScene<AaplRow, Date, number>,
  getState: () => BrushState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
    },
    readState() {
      return interactionState(getState())
    },
    geometry(query) {
      return brushGeometry(surface, getScene(), getState().range, query)
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const bounds = shell.getBoundingClientRect()
      return {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }
    },
  }
}

function resolveTarget(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'handle:start' || target.anchor === 'handle:end') {
    const handle = surface.querySelector<SVGRectElement>(
      `[data-chart-brush-handle="${target.anchor === 'handle:start' ? 'start' : 'end'}"]`,
    )
    return handle ? center(handle) : null
  }
  const date = brushDateFromAnchor(brushDates, target.anchor)
  const row = date
    ? brushRows.find((datum) => datum.Date.getTime() === date.getTime())
    : null
  return date && row
    ? scenePointToClient(
        surface,
        scene,
        scene.scales.x.map(date),
        scene.scales.y.map(row.Close),
      )
    : null
}

function interactionState(state: BrushState): ConformanceJsonObject {
  const summary = brushRangeSummary(brushRows, state.range)
  return {
    selection: {
      start: brushDateKey(state.range.start),
      end: brushDateKey(state.range.end),
      pointCount: summary.count,
      closeAverage: summary.average,
      closeChange: summary.change,
      dragging: state.dragging,
    },
  }
}

function brushGeometry(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  range: BrushRange<Date>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = brushRows.map(
    (row) =>
      [scene.scales.x.map(row.Date), scene.scales.y.map(row.Close)] as const,
  )

  if (query.role === 'dot') {
    return points.map(([x, y]) => ({
      x: bounds.left + (x - 3.5) * scaleX,
      y: bounds.top + (y - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: color,
    }))
  }
  if (query.role === 'line') {
    const sample = clientPointBounds(points, bounds, {
      scaleX,
      scaleY,
      paint: color,
    })
    return sample ? [sample] : []
  }
  if (query.role !== 'rect') return []
  const band = surface.querySelector<SVGRectElement>(
    '[data-chart-brush-selection]',
  )
  if (band) {
    const bandBounds = band.getBoundingClientRect()
    return [
      {
        x: bandBounds.x,
        y: bandBounds.y,
        width: bandBounds.width,
        height: bandBounds.height,
        paint:
          normalizedElementFill(band) ?? 'invalid-tanstack-rendered-brush-fill',
      },
    ]
  }
  const start = scene.scales.x.map(range.start)
  const end = scene.scales.x.map(range.end)
  return [
    {
      x: bounds.left + Math.min(start, end) * scaleX,
      y: bounds.top + scene.chart.y * scaleY,
      width: Math.max(1, Math.abs(end - start) * scaleX),
      height: scene.chart.height * scaleY,
      paint: 'missing-tanstack-rendered-brush-fill',
    },
  ]
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
