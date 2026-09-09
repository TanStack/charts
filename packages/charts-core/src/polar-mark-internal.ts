import type {
  ChartBounds,
  ChartKey,
  ChartMarkRenderer,
  ChartMotionDefinition,
  ChartTheme,
  ChartTextTypography,
  ChartValue,
  MarkScene,
} from './types'
import { applyMarkRendererToScene } from './mark'

export interface PolarResolvedScale<TValue extends ChartValue = ChartValue> {
  id: string
  channel: 'angle' | 'radius'
  domain: readonly TValue[]
  map: (value: TValue) => number
  ticks: (count: number) => readonly TValue[]
  bandwidth: number
}

export interface PolarLayoutContext {
  chart: ChartBounds
  centerX: number
  centerY: number
  radius: number
  startAngle: number
  endAngle: number
  direction?: ChartTextTypography['direction']
  scales: Readonly<Record<string, PolarResolvedScale>>
}

export interface InitializedPolarMark<
  TDatum = unknown,
  TAngle extends ChartValue = ChartValue,
  TRadius extends ChartValue = ChartValue,
> {
  id: string
  colorValues: readonly unknown[]
  angleValues: readonly unknown[]
  radiusValues: readonly unknown[]
  includeZeroRadius: boolean
  requiresAngleScale: boolean
  requiresRadiusScale: boolean
  motion?: ChartMotionDefinition<any>
  render: (
    context: PolarMarkRenderContext,
  ) => MarkScene<TDatum, TAngle, TRadius>
}

export interface PolarMarkInitializeContext {
  markIndex: number
  parentId: string
}

export interface PolarMarkRenderContext {
  layout: PolarLayoutContext
  color: (value: ChartKey | null | undefined) => string
  theme: ChartTheme
}

export interface PolarMark<
  TDatum = unknown,
  TAngle extends ChartValue = ChartValue,
  TRadius extends ChartValue = ChartValue,
> {
  initialize: (
    context: PolarMarkInitializeContext,
  ) => InitializedPolarMark<TDatum, TAngle, TRadius>
  motion?: ChartMotionDefinition<any>
  renderer?: ChartMarkRenderer
  readonly __datum?: TDatum
  readonly __angle?: TAngle
  readonly __radius?: TRadius
}

/** Constructs the lifecycle shared by built-in and optional polar marks. */
export function createPolarMark<
  TDatum,
  TAngle extends ChartValue,
  TRadius extends ChartValue,
>(
  initialize: (
    context: PolarMarkInitializeContext,
  ) => InitializedPolarMark<TDatum, TAngle, TRadius>,
  motion?: ChartMotionDefinition<TDatum>,
  renderer?: ChartMarkRenderer,
): PolarMark<TDatum, TAngle, TRadius> {
  return {
    ...(motion === undefined ? {} : { motion }),
    ...(renderer === undefined ? {} : { renderer }),
    initialize(context) {
      const initialized = initialize(context)
      const withMotion =
        motion === undefined || initialized.motion !== undefined
          ? initialized
          : { ...initialized, motion }
      if (renderer === undefined) return withMotion
      const render = withMotion.render
      return {
        ...withMotion,
        render: (renderContext) =>
          applyMarkRendererToScene(render(renderContext), renderer),
      }
    },
  }
}
