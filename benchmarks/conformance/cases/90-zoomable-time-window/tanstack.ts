import {
  zoomTimeWindowDefinition,
  zoomStatusLabel,
  copyWindow,
} from './example'
import type { ZoomState } from './example'
export {
  zoomTimeWindowDefinition,
  zoomStatusLabel,
  copyWindow,
} from './example'
export type { ZoomState } from './example'
import { aapl } from '@tanstack/charts-data/aapl'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import {
  initialZoomWindow,
  selectZoomRows,
  visibleZoomData,
  zoomDateFromAnchor,
  zoomDateKey,
  zoomSpanDays,
} from './model'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { ZoomXWindow } from '@tanstack/charts/interaction/zoom'
import type { ChartScene } from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'

const color = '#0f766e'
const zoomRows = selectZoomRows(aapl)
const catalogPreviewWindow: ZoomXWindow<Date> = {
  start: new Date(Date.UTC(2018, 0, 8)),
  end: new Date(Date.UTC(2018, 0, 16)),
}

export const catalogCase = tanstackCase(
  (input) =>
    zoomTimeWindowDefinition(
      copyWindow(input.preview ? catalogPreviewWindow : initialZoomWindow),
      () => {},
    ),
  'Time series with a wheel-zoomable and pannable time viewport',
)

export { mount } from './view'

export function createDriver(
  shell: HTMLElement,
  surface: HTMLElement,
  getScene: () => ChartScene<AaplRow, Date, number>,
  getState: () => ZoomState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getScene(), target)
    },
    readState() {
      return interactionState(getState())
    },
    geometry(query) {
      return zoomGeometry(surface, getScene(), getState().window, query)
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
  if (target.anchor === 'control:reset') {
    const reset = surface.parentElement?.querySelector<HTMLButtonElement>(
      '[data-conformance-zoom-reset]',
    )
    return reset ? center(reset) : null
  }
  const date = zoomDateFromAnchor(zoomRows, target.anchor)
  const row = date
    ? zoomRows.find((datum) => datum.Date.getTime() === date.getTime())
    : null
  if (!date || !row) return null
  const point = scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(date),
    scene.scales.y.map(row.Close),
  )
  if (!point) return null
  return {
    ...point,
    focusElement:
      surface.querySelector<SVGElement>('[data-chart-zoom-surface]') ??
      point.focusElement,
  }
}

function interactionState(state: ZoomState): ConformanceJsonObject {
  const visibleRows = visibleZoomData(zoomRows, state.window)
  const jan9Row = visibleRows.find(
    (row) => zoomDateKey(row.Date) === '2018-01-09',
  )
  return {
    viewport: {
      start: zoomDateKey(state.window.start),
      end: zoomDateKey(state.window.end),
      spanDays: zoomSpanDays(state.window),
    },
    visible: {
      count: visibleRows.length,
      ids: visibleRows.map((row) => zoomDateKey(row.Date)),
      jan9Close: jan9Row?.Close ?? null,
    },
    interaction: {
      last: state.lastAction,
      active: state.active,
      wheelCaptured: state.wheelCaptured,
    },
  }
}

function zoomGeometry(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  window: ZoomXWindow<Date>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = visibleZoomData(zoomRows, window).map(
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
  if (query.role !== 'line') return []
  const sample = clientPointBounds(points, bounds, {
    scaleX,
    scaleY,
    paint: color,
  })
  return sample ? [sample] : []
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
