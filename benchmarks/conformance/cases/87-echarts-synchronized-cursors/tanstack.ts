import { synchronizedCursorDefinition } from './example'
export {
  summaryHeight,
  synchronizedCursorDefinition,
  chartHeight,
} from './example'
import { travelers } from '@tanstack/charts-data/travelers'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import { synchronizedCursorColors } from './colors'
import {
  synchronizedCursorAnchorDate,
  synchronizedCursorDateKey,
  synchronizedCursorDatumAtDate,
  synchronizedCursorNearestDatum,
} from './model'
import { selectSynchronizedCursorData } from './selection'
import type {
  ChartScene,
  ChartTooltipOptions,
  SceneGroup,
  SceneNode,
} from '@tanstack/charts'
import type { TravelersRow } from '@tanstack/charts-data/travelers'
import type { SynchronizedCursorView } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'
const viewMargin = { top: 16, right: 24, bottom: 34, left: 62 } as const

const synchronizedCursorTooltip: ChartTooltipOptions<TravelersRow> = {
  sticky: true,
  visibility: 'pinned',
  anchor: 'point',
  placement: ['bottom-right', 'bottom-left', 'right', 'left'],
  offset: 10,
  formatGroup: () => 'Pinned · Press Escape to release',
}

export const catalogCase = tanstackCase(
  synchronizedCursorDefinition,
  'Linked 2020 and 2019 airport traveler time series',
  synchronizedCursorTooltip,
  {
    focus(scene) {
      return (
        scene.points.find(
          (point) =>
            point.markId === 'synchronized-cursors:current:current-points' &&
            synchronizedCursorDateKey(point.datum.date) === '2020-12-13',
        ) ?? null
      )
    },
  },
)

export { mount } from './view'

export function createDriver(
  surface: HTMLElement,
  getInput: () => ConformanceInput,
  getScene: () => ChartScene<TravelersRow, Date, number>,
  getState: () => { date: Date | null; pinned: boolean },
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, getInput(), getScene(), target)
    },
    readState() {
      const state = getState()
      return interactionState(
        surface,
        getInput(),
        getScene(),
        state.date,
        state.pinned,
      )
    },
    geometry(query) {
      return geometry(surface, getScene(), query)
    },
    viewBounds(view) {
      const synchronized = synchronizedView(view)
      return synchronized
        ? logicalViewBounds(surface, getScene(), synchronized)
        : null
    },
  }
}

function resolveTarget(
  surface: HTMLElement,
  input: ConformanceInput,
  scene: ChartScene<TravelersRow, Date, number>,
  target: ConformanceTarget,
) {
  const view = synchronizedView(target.view)
  const date = synchronizedCursorAnchorDate(target.anchor)
  if (!view || !date) return null
  const datum = synchronizedCursorNearestDatum(
    selectSynchronizedCursorData(travelers, input.revision),
    date,
  )
  if (!datum) return null
  const point = pointsForView(scene, view).find(
    (candidate) => candidate.datum.date.getTime() === datum.date.getTime(),
  )
  return point ? scenePointToClient(surface, scene, point.x, point.y) : null
}

function geometry(
  surface: HTMLElement,
  scene: ChartScene<TravelersRow, Date, number>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  const view = synchronizedView(query.view)
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!view || !svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = pointsForView(scene, view)

  if (query.role === 'dot') {
    return points.map((point) => ({
      x: bounds.left + point.x * scaleX - 3 * scaleX,
      y: bounds.top + point.y * scaleY - 3 * scaleY,
      width: 6 * scaleX,
      height: 6 * scaleY,
      paint: synchronizedCursorColors[view],
    }))
  }

  if (query.role === 'line') {
    const sample = clientPointBounds(
      points.map((point) => [point.x, point.y] as const),
      bounds,
      { scaleX, scaleY, paint: synchronizedCursorColors[view] },
    )
    return sample ? [sample] : []
  }

  return []
}

function pointsForView(
  scene: ChartScene<TravelersRow, Date, number>,
  view: SynchronizedCursorView,
) {
  const markId = `synchronized-cursors:${view}:${view}-points`
  return scene.points.filter((point) => point.markId === markId)
}

function synchronizedView(
  view: string | undefined,
): SynchronizedCursorView | null {
  return view === 'current' || view === 'previous' ? view : null
}

function logicalViewBounds(
  surface: HTMLElement,
  scene: ChartScene<TravelersRow, Date, number>,
  view: SynchronizedCursorView,
): ConformanceGeometrySample | null {
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  const group = viewGroup(scene, view)
  if (!svg || !group?.clip) return null
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const x = (group.translateX ?? 0) + viewMargin.left
  const y = (group.translateY ?? 0) + viewMargin.top
  return {
    x: bounds.left + x * scaleX,
    y: bounds.top + y * scaleY,
    width: Math.max(
      1,
      (group.clip.width - viewMargin.left - viewMargin.right) * scaleX,
    ),
    height: Math.max(
      1,
      (group.clip.height - viewMargin.top - viewMargin.bottom) * scaleY,
    ),
  }
}

function viewGroup(
  scene: ChartScene,
  view: SynchronizedCursorView,
): SceneGroup | undefined {
  return flatten(scene.nodes).find(
    (node): node is SceneGroup =>
      node.kind === 'group' &&
      node.className === 'ts-chart__view' &&
      node.key === `synchronized-cursors:${view}:view`,
  )
}

function flatten(nodes: readonly SceneNode[]): readonly SceneNode[] {
  return nodes.flatMap((node) =>
    node.kind === 'group' ? [node, ...flatten(node.children)] : [node],
  )
}

function interactionState(
  surface: HTMLElement,
  input: ConformanceInput,
  scene: ChartScene<TravelersRow, Date, number>,
  date: Date | null,
  pinned: boolean,
): ConformanceJsonObject {
  const rows = selectSynchronizedCursorData(travelers, input.revision)
  const current = renderedCrosshairState(surface, scene, 'current')
  const previous = renderedCrosshairState(surface, scene, 'previous')
  return {
    shared: {
      date: date ? synchronizedCursorDateKey(date) : null,
      currentValue: date
        ? (synchronizedCursorDatumAtDate(rows, date)?.current ?? null)
        : null,
      previousValue: date
        ? (synchronizedCursorDatumAtDate(rows, date)?.previous ?? null)
        : null,
      pinned,
    },
    crosshairs: {
      aligned:
        current.xNormalized !== null &&
        previous.xNormalized !== null &&
        Math.abs(current.xNormalized - previous.xNormalized) < 0.005,
      current,
      previous,
    },
  }
}

function renderedCrosshairState(
  surface: HTMLElement,
  scene: ChartScene<TravelersRow, Date, number>,
  view: SynchronizedCursorView,
) {
  const viewBounds = logicalViewBounds(surface, scene, view)
  if (!viewBounds) return { visible: false, xNormalized: null }
  const line = [
    ...surface.querySelectorAll<SVGLineElement>(
      '.ts-chart__focus-guide-x-rule',
    ),
  ].find((candidate) => {
    const bounds = candidate.getBoundingClientRect()
    const centerY = bounds.top + bounds.height / 2
    return (
      centerY >= viewBounds.y && centerY <= viewBounds.y + viewBounds.height
    )
  })
  if (!line) return { visible: false, xNormalized: null }
  const bounds = line.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  return {
    visible: true,
    xNormalized: (x - viewBounds.x) / viewBounds.width,
  }
}
