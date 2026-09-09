import type {
  ChartMarkState,
  ChartRectStateStyle,
  RectRadius,
  SceneRect,
} from './types'

export function markStatesMayUseCornerRadii<TDatum>(
  states:
    readonly ChartMarkState<TDatum, ChartRectStateStyle<TDatum>>[] | undefined,
): boolean {
  return (
    states?.some(({ style }) => {
      const radius = style.radius
      return typeof radius === 'function' || Array.isArray(radius)
    }) ?? false
  )
}

export function resolveSceneRectRadius(
  radius: RectRadius | undefined,
  preferCornerRadii: boolean,
): Pick<SceneRect, 'radius' | 'cornerRadii'> {
  if (radius === undefined) {
    return preferCornerRadii ? { cornerRadii: [0, 0, 0, 0] } : {}
  }
  if (typeof radius !== 'number') return { cornerRadii: radius }
  return preferCornerRadii
    ? { cornerRadii: [radius, radius, radius, radius] }
    : { radius }
}
