import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, lineY, mountChart } from '@tanstack/charts'
import { continuousCursor } from '@tanstack/charts/interaction/cursor'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from 'd3-scale'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import {
  createFreeCursorControls,
  formatFreeCursorValue,
  updateFreeCursorControls,
} from './controls'
import {
  freeCursorFractionFromAnchor,
  freeCursorRows,
  freeCursorXDomain,
  freeCursorYDomain,
} from './model'
import type { ChartHost, ChartHostOptions, ChartScene } from '@tanstack/charts'
import type {
  ContinuousCursorChange,
  ContinuousCursorPosition,
} from '@tanstack/charts/interaction/cursor'
import type { FreeCursorControls } from './controls'
import type { CompleteCar } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceMount,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

interface CursorState {
  visible: boolean
  xNormalized: number | null
  yNormalized: number | null
  xValue: number | null
  yValue: number | null
  pinned: boolean
}

const cursorControlsHeight = 68
const rows = freeCursorRows(cars)

export function freeCursorDefinition(
  position: ContinuousCursorPosition<number, number> | null,
  onChange: (
    value: ContinuousCursorPosition<number, number> | null,
    reason: ContinuousCursorChange<number, number>,
  ) => void,
) {
  return defineChart({
    marks: [
      decorative(
        lineY(rows, {
          id: 'free-cursor-line',
          x: 'power (hp)',
          y: 'economy (mpg)',
          stroke: '#0f766e',
          strokeWidth: 2,
        }),
      ),
      dot(rows, {
        id: 'free-cursor-dots',
        x: 'power (hp)',
        y: 'economy (mpg)',
        fill: '#0f766e',
        r: 3.5,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: {
      scale: scaleLinear().domain(freeCursorXDomain),
      axis: { label: 'Horsepower' },
    },
    y: {
      scale: scaleLinear().domain(freeCursorYDomain),
      grid: true,
      axis: { ticks: { count: 7 }, label: 'Fuel economy (mpg)' },
    },
    behaviors: [
      continuousCursor({
        position: controlledSignal<
          ContinuousCursorPosition<number, number> | null,
          ContinuousCursorChange<number, number>
        >(position, (next, { reason }) => onChange(next, reason)),
        xRule: {
          stroke: '#64748b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
        yRule: {
          stroke: '#64748b',
          strokeWidth: 1,
          strokeDasharray: '4 4',
        },
        marker: {
          radius: 4,
          fill: '#ffffff',
          stroke: '#0f766e',
          strokeWidth: 2,
        },
        xLabel: {
          format: (value) =>
            formatFreeCursorValue('HP', roundCursorValue(value)),
        },
        yLabel: {
          side: 'start',
          format: (value) =>
            formatFreeCursorValue('MPG', roundCursorValue(value)),
        },
      }),
    ],
    animate: false,
    keyboard: false,
    focusRing: false,
    margin: { top: 22, right: 24, bottom: 44, left: 58 },
  })
}

export const catalogCase = tanstackCase(
  () => freeCursorDefinition(null, () => {}),
  'Line chart with a free two-dimensional cursor',
)

export const mount: ConformanceMount = (container, input) => {
  let currentInput = input
  let accepted: ContinuousCursorPosition<number, number> | null = null
  let state = clearedCursor()
  let renderCount = 0
  let host: ChartHost<CompleteCar, number, number> | undefined

  const shell = container.ownerDocument.createElement('div')
  const chartFrame = container.ownerDocument.createElement('div')
  const controls = createFreeCursorControls(
    container.ownerDocument,
    (x, y) => accept({ x, y }),
    {
      xDomain: freeCursorXDomain,
      yDomain: freeCursorYDomain,
      xLabel: 'Horsepower',
      yLabel: 'Fuel economy',
      xStep: 0.1,
      yStep: 0.1,
    },
  )
  shell.style.display = 'grid'
  shell.style.gridTemplateRows = `${cursorControlsHeight}px minmax(0, 1fr)`
  chartFrame.style.minHeight = '0'
  chartFrame.dataset.conformanceView = 'main'
  shell.append(controls.root, chartFrame)
  container.append(shell)
  sizeShell(shell, chartFrame, input)

  const handleCursorChange = (
    value: ContinuousCursorPosition<number, number> | null,
    reason: ContinuousCursorChange<number, number>,
  ) => {
    if (reason.type === 'preview') {
      state = value ? cursorState(value, false) : clearedCursor()
      updateControls(controls, state)
      return
    }
    accepted = value ? roundedPosition(value) : null
    state = accepted ? cursorState(accepted, true) : clearedCursor()
    updateControls(controls, state)
    host?.update(options())
  }

  const options = (): ChartHostOptions<CompleteCar, number, number> => ({
    definition: freeCursorDefinition(accepted, handleCursorChange),
    width: currentInput.width,
    height: chartHeight(currentInput.height),
    ariaLabel: 'Line chart with a free two-dimensional cursor',
    ariaDescription:
      'Move across the plot to inspect arbitrary horsepower and fuel-economy coordinates. Select to pin the cursor; press Escape to clear it.',
    onRender() {
      renderCount += 1
    },
  })

  function accept(next: ContinuousCursorPosition<number, number> | null) {
    accepted = next ? roundedPosition(next) : null
    state = accepted ? cursorState(accepted, true) : clearedCursor()
    updateControls(controls, state)
    host?.update(options())
  }

  const handleControlKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !state.visible) return
    event.preventDefault()
    accept(null)
  }
  controls.root.addEventListener('keydown', handleControlKeyDown)

  host = mountChart(chartFrame, options())
  updateControls(controls, state)

  const driver = createDriver(
    chartFrame,
    controls,
    () => host!.getScene(),
    () => state,
    () => renderCount,
  )

  return {
    driver,
    update(nextInput) {
      currentInput = nextInput
      sizeShell(shell, chartFrame, nextInput)
      host!.update(options())
    },
    destroy() {
      controls.root.removeEventListener('keydown', handleControlKeyDown)
      host!.destroy()
      shell.remove()
    },
  }
}

function createDriver(
  surface: HTMLElement,
  controls: FreeCursorControls,
  getScene: () => ChartScene<CompleteCar, number, number>,
  getState: () => CursorState,
  getRenderCount: () => number,
): ConformanceTestDriver {
  return {
    resolveTarget(target) {
      return resolveTarget(surface, controls, getScene(), target)
    },
    readState() {
      return interactionState(getState(), getRenderCount())
    },
    geometry(query) {
      return geometry(surface, getScene(), query)
    },
    viewBounds(view) {
      if (view && view !== 'main') return null
      const bounds = surface.getBoundingClientRect()
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
  controls: FreeCursorControls,
  scene: ChartScene<CompleteCar, number, number>,
  target: ConformanceTarget,
) {
  if (target.view !== undefined && target.view !== 'main') return null
  const control =
    target.anchor === 'control:x'
      ? controls.x
      : target.anchor === 'control:y'
        ? controls.y
        : null
  if (control) {
    const bounds = control.getBoundingClientRect()
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
      focusElement: control,
    }
  }
  const fraction = freeCursorFractionFromAnchor(target.anchor)
  if (!fraction) return null
  return scenePointToClient(
    surface,
    scene,
    scene.chart.x + scene.chart.width * fraction.x,
    scene.chart.y + scene.chart.height * fraction.y,
  )
}

function geometry(
  surface: HTMLElement,
  scene: ChartScene<CompleteCar, number, number>,
  query: ConformanceGeometryQuery,
): readonly ConformanceGeometrySample[] {
  if (query.view !== undefined && query.view !== 'main') return []
  const svg = surface.querySelector<SVGSVGElement>('svg.ts-chart')
  if (!svg) return []
  const bounds = svg.getBoundingClientRect()
  const scaleX = bounds.width / scene.width
  const scaleY = bounds.height / scene.height

  if (query.role === 'dot') {
    return rows.map((datum) => ({
      x:
        bounds.left +
        scene.scales.x.map(datum['power (hp)']) * scaleX -
        3.5 * scaleX,
      y:
        bounds.top +
        scene.scales.y.map(datum['economy (mpg)']) * scaleY -
        3.5 * scaleY,
      width: 7 * scaleX,
      height: 7 * scaleY,
      paint: '#0f766e',
    }))
  }
  if (query.role !== 'line') return []
  const sample = clientPointBounds(
    rows.map(
      (datum) =>
        [
          scene.scales.x.map(datum['power (hp)']),
          scene.scales.y.map(datum['economy (mpg)']),
        ] as const,
    ),
    bounds,
    { scaleX, scaleY, paint: '#0f766e' },
  )
  return sample ? [sample] : []
}

function cursorState(
  position: ContinuousCursorPosition<number, number>,
  pinned: boolean,
): CursorState {
  const xValue = roundCursorValue(position.x)
  const yValue = roundCursorValue(position.y)
  return {
    visible: true,
    xNormalized:
      (xValue - freeCursorXDomain[0]) /
      (freeCursorXDomain[1] - freeCursorXDomain[0]),
    yNormalized:
      1 -
      (yValue - freeCursorYDomain[0]) /
        (freeCursorYDomain[1] - freeCursorYDomain[0]),
    xValue,
    yValue,
    pinned,
  }
}

function clearedCursor(): CursorState {
  return {
    visible: false,
    xNormalized: null,
    yNormalized: null,
    xValue: null,
    yValue: null,
    pinned: false,
  }
}

function interactionState(
  state: CursorState,
  renderCount: number,
): ConformanceJsonObject {
  return {
    cursor: {
      visible: state.visible,
      xNormalized: state.xNormalized,
      yNormalized: state.yNormalized,
      xValue: state.xValue,
      yValue: state.yValue,
      pinned: state.pinned,
      snapped: false,
      datum: null,
    },
    render: { count: renderCount },
  }
}

function updateControls(controls: FreeCursorControls, state: CursorState) {
  updateFreeCursorControls(controls, {
    visible: state.visible,
    x: state.xValue,
    y: state.yValue,
    pinned: state.pinned,
  })
}

function roundedPosition(
  position: ContinuousCursorPosition<number, number>,
): ContinuousCursorPosition<number, number> {
  return {
    x: roundCursorValue(position.x),
    y: roundCursorValue(position.y),
  }
}

function roundCursorValue(value: number) {
  return Math.round(value * 10) / 10
}

function sizeShell(
  shell: HTMLDivElement,
  chartFrame: HTMLDivElement,
  input: ConformanceInput,
) {
  shell.style.width = `${input.width}px`
  shell.style.height = `${input.height}px`
  chartFrame.style.width = `${input.width}px`
  chartFrame.style.height = `${chartHeight(input.height)}px`
}

function chartHeight(height: number) {
  return Math.max(180, height - cursorControlsHeight)
}
