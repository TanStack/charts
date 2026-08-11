import { cars } from '@charts-poc/demo-data/cars'
import { defineChart, dot, lineY } from '@tanstack/charts'
import { continuousCursor } from '@tanstack/charts/interaction/cursor'
import { controlledSignal } from '@tanstack/charts/interaction/signal'
import { decorative } from '@tanstack/charts/mark/decorative'
import { scaleLinear } from 'd3-scale'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import { formatFreeCursorValue } from './format'
import {
  freeCursorFractionFromAnchor,
  freeCursorRows,
  freeCursorXDomain,
  freeCursorYDomain,
} from './model'
import type { ChartScene } from '@tanstack/charts'
import type {
  ContinuousCursorChange,
  ContinuousCursorPosition,
} from '@tanstack/charts/interaction/cursor'
import type { CompleteCar } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceInput,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export interface CursorState {
  visible: boolean
  xNormalized: number | null
  yNormalized: number | null
  xValue: number | null
  yValue: number | null
  pinned: boolean
}

export const cursorControlsHeight = 68
const rows = freeCursorRows(cars)
const catalogPreviewCursor = {
  x: 101.8,
  y: 20.8,
} satisfies ContinuousCursorPosition<number, number>

export function freeCursorDefinition(
  position: ContinuousCursorPosition<number, number> | null,
  onChange: (
    value: ContinuousCursorPosition<number, number> | null,
    reason: ContinuousCursorChange<number, number>,
  ) => void,
  preview = false,
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
    controls: [
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
          ...(preview
            ? {
                offset: 2,
                paddingX: 3,
                paddingY: 2,
                fontSize: 8,
                color: 'Canvas',
                background: 'CanvasText',
                stroke: 'Canvas',
              }
            : {}),
        },
        yLabel: {
          side: 'start',
          format: (value) =>
            formatFreeCursorValue('MPG', roundCursorValue(value)),
          ...(preview
            ? {
                offset: 2,
                paddingX: 3,
                paddingY: 2,
                fontSize: 8,
                color: 'Canvas',
                background: 'CanvasText',
                stroke: 'Canvas',
              }
            : {}),
        },
      }),
    ],
    svgAnimation: false,
    keyboard: false,
    focusRing: false,
    margin: preview
      ? { top: 0, right: 0, bottom: 14, left: 40 }
      : { top: 22, right: 24, bottom: 44, left: 58 },
  })
}

export const catalogCase = tanstackCase(
  (input) =>
    freeCursorDefinition(
      input.preview ? catalogPreviewCursor : null,
      () => {},
      input.preview === true,
    ),
  'Line chart with a free two-dimensional cursor',
  true,
  { margin: true },
)

export { mount } from './view'

export interface FreeCursorControlRefs {
  x: HTMLInputElement
  y: HTMLInputElement
}

export function createDriver(
  surface: HTMLElement,
  controls: FreeCursorControlRefs,
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
  controls: FreeCursorControlRefs,
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

export function cursorState(
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

export function clearedCursor(): CursorState {
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

export function roundedPosition(
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

export function chartHeight(height: number) {
  return Math.max(180, height - cursorControlsHeight)
}
