import * as React from 'react'
import type { ColorValue } from 'react-native'
import { Circle, Svg } from 'react-native-svg'
import type { ChartPoint, ChartValue } from '@tanstack/charts/types'
import { resolveNativeSolidPaint, type NativePaintResolver } from './paint'

export interface NativeChartFocusOverlayProps<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  width: number
  height: number
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  color: ColorValue
  fill: ColorValue
  resolvePaint: NativePaintResolver
}

export function NativeChartFocusOverlay<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>({
  width,
  height,
  points,
  color,
  fill,
  resolvePaint,
}: NativeChartFocusOverlayProps<TDatum, TXValue, TYValue>) {
  if (!points.length) return null
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      pointerEvents="none"
      accessible={false}
      style={absoluteFill}
    >
      {points.map((point, index) => (
        <Circle
          key={`${point.markId}:${point.key}:${point.datumIndex}`}
          cx={point.x}
          cy={point.y}
          r={index === 0 ? 6 : 4}
          fill={fill}
          stroke={resolveNativeSolidPaint(point.color, { color }, resolvePaint)}
          strokeWidth={index === 0 ? 2.5 : 2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </Svg>
  )
}

const absoluteFill = {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
} as const
