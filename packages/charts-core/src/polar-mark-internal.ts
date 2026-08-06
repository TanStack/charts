import type {
  ChartBounds,
  ChartKey,
  ChartMotionDefinition,
  ChartTheme,
  ChartValue,
  MarkScene,
} from './types'

export interface PolarResolvedScale<TValue extends ChartValue = ChartValue> {
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
  angle?: PolarResolvedScale
  radiusScale?: PolarResolvedScale
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
): PolarMark<TDatum, TAngle, TRadius> {
  if (motion === undefined) return { initialize }
  return {
    motion,
    initialize(context) {
      return { ...initialize(context), motion }
    },
  }
}
