import {
  playbackRows,
  initialFrame,
  playbackDefinition,
  rowForDate,
  indexForDate,
  playbackValueText,
  cloneDate,
} from './example'
import type { PlaybackState } from './example'
export {
  playbackRows,
  initialFrame,
  playbackDefinition,
  rowForDate,
  indexForDate,
  playbackValueText,
  cloneDate,
} from './example'
export type { PlaybackState } from './example'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { playbackDateKey, playbackIndexFromAnchor } from './model'
import { tanstackCase } from '../../shared/mount'
import type { AaplRow } from '@tanstack/charts-data/aapl'
import type { ChartScene } from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'

const linePaint = '#2563eb'
if (!initialFrame) throw new Error('Playback requires an initial frame.')

export const catalogCase = tanstackCase(
  () => playbackDefinition(initialFrame, () => {}, true),
  'AAPL closes with a draggable timeline playback scrubber',
)

export { mount } from './view'

export function createDriver(
  view: HTMLElement,
  surface: HTMLElement,
  playButton: HTMLButtonElement,
  getScene: () => ChartScene<AaplRow, Date, number>,
  getState: () => PlaybackState,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, playButton, getScene(), target)
    },
    readState() {
      return interactionState(getState())
    },
    geometry(query) {
      return playbackGeometry(surface, getScene(), query)
    },
    viewBounds(viewName) {
      if (viewName !== undefined && viewName !== 'main') return null
      const bounds = view.getBoundingClientRect()
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
  playButton: HTMLButtonElement,
  scene: ChartScene<AaplRow, Date, number>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  if (target.anchor === 'control:play') return center(playButton)
  const index = playbackIndexFromAnchor(playbackRows, target.anchor)
  const row = index === null ? undefined : playbackRows[index]
  if (!row) return null
  const point = scenePointToClient(
    surface,
    scene,
    scene.scales.x.map(row.Date),
    scene.chart.y + scene.chart.height + 34,
  )
  if (!point) return null
  return {
    ...point,
    focusElement:
      surface.querySelector<SVGElement>('[data-chart-handle-surface]') ??
      point.focusElement,
  }
}

function interactionState(state: PlaybackState): ConformanceJsonObject {
  const index = indexForDate(state.frame)
  const row = playbackRows[index]
  return {
    playhead: {
      index,
      date: row ? playbackDateKey(row.Date) : null,
      value: row?.Close ?? null,
      progress: playbackRows.length > 1 ? index / (playbackRows.length - 1) : 0,
    },
    frames: {
      count: playbackRows.length,
      ids: playbackRows.map((datum) => playbackDateKey(datum.Date)),
      jan5Close: playbackRows[3]?.Close ?? null,
    },
    interaction: {
      dragging: state.dragging,
      scrubCount: state.scrubCount,
      playing: state.playing,
    },
  }
}

function playbackGeometry(
  surface: HTMLElement,
  scene: ChartScene<AaplRow, Date, number>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height
  const points = playbackRows.map(
    (row) =>
      [scene.scales.x.map(row.Date), scene.scales.y.map(row.Close)] as const,
  )
  if (query.role === 'dot') {
    return points.map(([x, y]) => ({
      x: bounds.left + (x - 3.5) * scaleX,
      y: bounds.top + (y - 3.5) * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: linePaint,
    }))
  }
  if (query.role === 'line') {
    const sample = clientPointBounds(points, bounds, {
      scaleX,
      scaleY,
      paint: linePaint,
    })
    return sample ? [sample] : []
  }
  if (query.role !== 'rule') return []
  return ['track', 'rule'].flatMap((part) => {
    const element = surface.querySelector<SVGElement>(
      `[data-chart-handle-${part}]`,
    )
    return element ? [elementGeometry(element)] : []
  })
}

function elementGeometry(element: SVGElement): ConformanceGeometrySample {
  const bounds = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
    paint: style.fill || style.stroke,
  }
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
