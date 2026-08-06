import type { ChartBounds, ChartValue } from './types'

export const resolveDotLayout: unique symbol = Symbol('resolveDotLayout')

export interface DotLayoutResolveContext {
  readonly chart: ChartBounds
  readonly measuredPositions: readonly number[]
  readonly radii: readonly number[]
}

export interface DotLayout<
  TAxis extends 'x' | 'y' = 'x' | 'y',
  TAnchor extends ChartValue = ChartValue,
> {
  readonly axis: TAxis
  readonly anchor: TAnchor
  readonly [resolveDotLayout]: (
    context: DotLayoutResolveContext,
  ) => readonly number[]
}
