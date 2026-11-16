import type {
  Channel,
  ChannelOutput,
  ChartKey,
  ChartMarkMotionOptions,
  ChartValue,
} from './types'

export type InferredPolarChannelOutput<TDatum, TChannel> = [TChannel] extends [
  never,
]
  ? number
  : ChannelOutput<TDatum, TChannel, number>

export type InferredPolarScaleId<TScaleId, TFallback extends string> = [
  NonNullable<TScaleId>,
] extends [never]
  ? TFallback
  : Extract<NonNullable<TScaleId>, string>

export interface RadialPathOptions<
  TDatum,
> extends ChartMarkMotionOptions<TDatum> {
  id?: string
  className?: string
  /** Named angle scale. Omit to use the reserved `angle` scale. */
  angleScale?: string
  /** Named radius scale. Omit to use the reserved `radius` scale. */
  radiusScale?: string
  angle?: number | Channel<TDatum, ChartValue | null | undefined>
  radius?: number | Channel<TDatum, number | null | undefined>
  key?: Channel<TDatum, ChartKey>
  z?: Channel<TDatum, ChartKey | null | undefined>
  color?: Channel<TDatum, ChartKey | null | undefined>
}
