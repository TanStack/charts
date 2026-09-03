import {
  cursorControlsHeight,
  cursorState,
  clearedCursor,
  roundedPosition,
  chartHeight,
  freeCursorDefinition,
} from './example'
import type { CursorState } from './example'
export {
  cursorControlsHeight,
  cursorState,
  clearedCursor,
  roundedPosition,
  chartHeight,
  freeCursorDefinition,
} from './example'
export type { CursorState } from './example'
import { cars } from '@tanstack/charts-data/cars'
import {
  clientPointBounds,
  scenePointToClient,
} from '../../shared/driver-geometry'
import { tanstackCase } from '../../shared/mount'
import { freeCursorFractionFromAnchor, freeCursorRows } from './model'
import type { ChartScene } from '@tanstack/charts'
import type { ContinuousCursorPosition } from '@tanstack/charts/interaction/cursor'
import type { CompleteCar } from './model'
import type {
  ConformanceGeometryQuery,
  ConformanceGeometrySample,
  ConformanceJsonObject,
  ConformanceTarget,
  ConformanceTestDriver,
} from '../../types'

export { default as Example } from './example'
const rows = freeCursorRows(cars)
const catalogPreviewCursor = {
  x: 101.8,
  y: 20.8,
} satisfies ContinuousCursorPosition<number, number>

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
