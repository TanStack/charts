import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
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
import type { ChartHost, ChartHostOptions, ChartScene } from '@tanstack/charts'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface PlaybackState {
  frame: Date
  dragging: boolean
  scrubCount: number
  playing: boolean
}

const linePaint = '#2563eb'
const playheadPaint = '#f97316'
const margin = { top: 64, right: 24, bottom: 68, left: 56 }
const playbackRows = selectPlaybackRows(aapl)
const playbackDates = playbackRows.map((row) => row.Date)
const initialFrame = playbackRows[initialPlaybackIndex]?.Date
if (!initialFrame) throw new Error('Playback requires an initial frame.')

export function playbackDefinition(
  frame: Date,
  onChange: (value: Date, reason: HandleXChange<Date>) => void,
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
        cross: { edge: 'bottom', offset: 34 },
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
    margin,
  })
}

export const catalogCase = tanstackCase(
  () => playbackDefinition(initialFrame, () => {}),
  'AAPL closes with a draggable timeline playback scrubber',
)

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let accepted = cloneDate(initialFrame)
  let state: PlaybackState = {
    frame: cloneDate(accepted),
    dragging: false,
    scrubCount: 0,
    playing: false,
  }
  let playbackTimer: ReturnType<typeof setInterval> | undefined
  let host: ChartHost<AaplRow, Date, number> | undefined

  const document = container.ownerDocument
  const view = document.createElement('div')
  const chartSurface = document.createElement('div')
  const controls = createPlaybackControls(document)
  view.dataset.conformanceView = 'main'
  view.style.position = 'relative'
  view.style.touchAction = 'pan-y'
  view.append(chartSurface, controls.toolbar, controls.status)
  container.append(view)
  sizeView(view, input)

  const frameText = () => playbackValueText(rowForDate(state.frame))
  const paint = () => controls.paint(frameText(), state.playing)
  const stopPlayback = (message?: string) => {
    if (playbackTimer !== undefined) clearInterval(playbackTimer)
    playbackTimer = undefined
    state = { ...state, playing: false }
    paint()
    if (message) controls.announce(`${message}. ${frameText()}`)
  }
  const stopForScrub = () => {
    if (state.playing) stopPlayback()
  }

  const handleFrameChange = (next: Date, reason: HandleXChange<Date>) => {
    stopForScrub()
    if (reason.type === 'preview') {
      state = { ...state, frame: cloneDate(next), dragging: true }
      paint()
      return
    }
    if (reason.type === 'cancel') {
      state = {
        ...state,
        frame: cloneDate(reason.origin),
        dragging: false,
      }
      paint()
      controls.announce(`Scrub canceled. ${frameText()}`)
      return
    }
    accepted = cloneDate(next)
    state = {
      ...state,
      frame: cloneDate(next),
      dragging: false,
      scrubCount: state.scrubCount + 1,
    }
    host?.update(options())
    paint()
    controls.announce(`Frame selected. ${frameText()}`)
  }

  const options = (): ChartHostOptions<AaplRow, Date, number> => ({
    definition: playbackDefinition(accepted, handleFrameChange),
    width: currentInput.width,
    height: currentInput.height,
    ariaLabel: 'AAPL closes with a draggable timeline playback scrubber',
  })

  const applyFrame = (next: Date) => {
    accepted = cloneDate(next)
    state = { ...state, frame: cloneDate(next) }
    host!.update(options())
    paint()
  }

  const togglePlayback = () => {
    if (state.playing) {
      stopPlayback('Playback paused')
      return
    }
    const lastIndex = playbackRows.length - 1
    const restarting = indexForDate(state.frame) >= lastIndex
    if (restarting) applyFrame(playbackRows[0]!.Date)
    state = { ...state, playing: true, dragging: false }
    playbackTimer = setInterval(() => {
      const index = indexForDate(state.frame)
      if (index >= playbackRows.length - 1) {
        stopPlayback('Playback ended')
        return
      }
      applyFrame(playbackRows[index + 1]!.Date)
    }, 700)
    paint()
    controls.announce(
      `${restarting ? 'Playback restarted' : 'Playback started'}. ${frameText()}`,
    )
  }

  controls.playButton.addEventListener('click', togglePlayback)
  host = mountChart(chartSurface, options())
  paint()

  const driver = createDriver(
    view,
    chartSurface,
    controls.playButton,
    () => host!.getScene(),
    () => state,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      sizeView(view, nextInput)
      host!.update(options())
      paint()
    },
    destroy() {
      if (playbackTimer !== undefined) clearInterval(playbackTimer)
      controls.playButton.removeEventListener('click', togglePlayback)
      host!.destroy()
      view.remove()
    },
  }
}

function createDriver(
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

function createPlaybackControls(document: Document) {
  const toolbar = document.createElement('div')
  toolbar.className = 'ts-conformance-playback-toolbar'
  toolbar.setAttribute('role', 'group')
  toolbar.setAttribute('aria-label', 'Timeline playback controls')
  Object.assign(toolbar.style, {
    position: 'absolute',
    top: '4px',
    left: '56px',
    right: '20px',
    zIndex: '3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    pointerEvents: 'none',
  })

  const current = document.createElement('div')
  current.className = 'ts-conformance-playback-current'
  Object.assign(current.style, {
    boxSizing: 'border-box',
    minWidth: '0',
    minHeight: '32px',
    padding: '7px 9px',
    border: '1px solid color-mix(in srgb, currentColor 32%, transparent)',
    borderRadius: '999px',
    overflow: 'hidden',
    background: 'color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas)',
    color: 'inherit',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    font: '600 12px/1.2 system-ui, sans-serif',
  })

  const playButton = document.createElement('button')
  playButton.className = 'ts-conformance-playback-button'
  playButton.type = 'button'
  Object.assign(playButton.style, {
    flex: '0 0 auto',
    width: '44px',
    height: '44px',
    border: '1px solid color-mix(in srgb, currentColor 32%, transparent)',
    borderRadius: '10px',
    background: 'color-mix(in srgb, var(--ts-chart-2, #f97316) 12%, Canvas)',
    color: 'inherit',
    cursor: 'pointer',
    font: '700 16px/1 system-ui, sans-serif',
    pointerEvents: 'auto',
  })

  const status = document.createElement('output')
  status.className = 'ts-conformance-playback-announcement'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  Object.assign(status.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  })
  toolbar.append(current, playButton)

  return {
    toolbar,
    status,
    playButton,
    paint(valueText: string, playing: boolean) {
      current.textContent = valueText
      playButton.textContent = playing ? '❚❚' : '▶'
      playButton.setAttribute('aria-pressed', String(playing))
      playButton.setAttribute(
        'aria-label',
        playing ? 'Pause timeline' : 'Play timeline',
      )
      playButton.title = playing ? 'Pause timeline' : 'Play timeline'
    },
    announce(message: string) {
      status.value = message
      status.textContent = message
    },
  }
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

function rowForDate(date: Date) {
  const row = playbackRows.find(
    (candidate) => candidate.Date.getTime() === date.getTime(),
  )
  if (!row) throw new Error('Playback frame must be an observed date.')
  return row
}

function indexForDate(date: Date) {
  const index = playbackRows.findIndex(
    (row) => row.Date.getTime() === date.getTime(),
  )
  if (index < 0) throw new Error('Playback frame must be an observed date.')
  return index
}

function playbackValueText(row: AaplRow) {
  return `${playbackDateKey(row.Date)} · AAPL close $${row.Close.toFixed(2)}`
}

function cloneDate(date: Date) {
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

function sizeView(view: HTMLDivElement, input: ConformanceInput) {
  view.style.width = `${input.width}px`
  view.style.height = `${input.height}px`
}
