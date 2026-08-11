import { defineChart, dot, lineY } from '@tanstack/charts'
import { aapl } from '@charts-poc/demo-data/aapl'
import { handleX } from '@tanstack/charts/interaction/handle'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear, scaleUtc } from 'd3-scale'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import {
  initialPlaybackIndex,
  playbackDateKey,
  playbackIndexFromAnchor,
  selectPlaybackRows,
} from './model'
import { tanstackCase } from '../../shared/mount'
import type { AaplRow } from '@charts-poc/demo-data/aapl'
import type { HandleXChange } from '@tanstack/charts/interaction/handle'
import type { ChartScene } from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export interface PlaybackState {
  frame: Date
  dragging: boolean
  scrubCount: number
  playing: boolean
}

const linePaint = '#2563eb'
const playheadPaint = '#f97316'
const margin = { top: 64, right: 24, bottom: 68, left: 56 }
export const playbackRows = selectPlaybackRows(aapl)
const playbackDates = playbackRows.map((row) => row.Date)
export const initialFrame = playbackRows[initialPlaybackIndex]?.Date
if (!initialFrame) throw new Error('Playback requires an initial frame.')

export function playbackDefinition(
  frame: Date,
  onChange: (value: Date, reason: HandleXChange<Date>) => void,
  preview = false,
) {
  return defineChart({
    marks: [
      decorative(
        lineY(playbackRows, {
          id: 'playback-line',
          x: 'Date',
          y: 'Close',
          stroke: linePaint,
          strokeWidth: 2.5,
        }),
      ),
      dot(playbackRows, {
        id: 'playback-points',
        x: 'Date',
        y: 'Close',
        fill: linePaint,
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleUtc,
      axis: {
        ticks: {
          format: (value) =>
            value.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }),
        },
      },
    },
    y: {
      scale: scaleLinear,
      grid: true,
      axis: { ticks: { count: 4 }, label: 'AAPL close ($)' },
    },
    controls: [
      handleX({
        id: 'playback-frame',
        value: controlledSignal<Date, HandleXChange<Date>>(
          frame,
          (next, { reason }) => onChange(next, reason),
        ),
        values: playbackDates,
        cross: { edge: 'bottom', offset: preview ? -18 : 34 },
        trackStyle: {
          fill: 'color-mix(in srgb, currentColor 52%, transparent)',
        },
        ruleStyle: { fill: playheadPaint },
        handleStyle: {
          fill: playheadPaint,
          stroke: 'Canvas',
          strokeWidth: 2,
        },
        hitSize: 44,
        ariaLabel: 'Timeline frame',
        format: (value) => playbackValueText(rowForDate(value)),
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: preview ? 0 : margin,
  })
}

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

export function rowForDate(date: Date) {
  const row = playbackRows.find(
    (candidate) => candidate.Date.getTime() === date.getTime(),
  )
  if (!row) throw new Error('Playback frame must be an observed date.')
  return row
}

export function indexForDate(date: Date) {
  const index = playbackRows.findIndex(
    (row) => row.Date.getTime() === date.getTime(),
  )
  if (index < 0) throw new Error('Playback frame must be an observed date.')
  return index
}

export function playbackValueText(row: AaplRow) {
  return `${playbackDateKey(row.Date)} · AAPL close $${row.Close.toFixed(2)}`
}

export function cloneDate(date: Date) {
  return new Date(date.getTime())
}

function center(element: HTMLElement | SVGElement) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    focusElement: element,
  }
}
