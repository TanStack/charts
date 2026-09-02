import * as React from 'react'
import type { ColorValue } from 'react-native'
import { Circle, Svg } from 'react-native-svg'
import {
  focusedSceneNodes,
  resolveFocusScene,
} from '@tanstack/charts/universal'
import type {
  ChartFocusSource,
  ChartPoint,
  ChartScene,
  ChartTextTypography,
  ChartValue,
} from '@tanstack/charts/types'
import { resolveNativeSolidPaint, type NativePaintResolver } from './paint'
import { NativeChartSceneNodes } from './SvgScene'

export interface NativeChartFocusOverlayProps<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
> {
  width: number
  height: number
  scene: ChartScene<TDatum, TXValue, TYValue>
  points: readonly ChartPoint<TDatum, TXValue, TYValue>[]
  placement: 'under' | 'over'
  source: ChartFocusSource
  pinned: boolean
  showDefault: boolean
  color: ColorValue
  fill: ColorValue
  fontFamily?: string
  direction?: ChartTextTypography['direction']
  idPrefix: string
  resolvePaint: NativePaintResolver
}

export function NativeChartFocusOverlay<
  TDatum,
  TXValue extends ChartValue,
  TYValue extends ChartValue,
>({
  width,
  height,
  scene,
  points,
  placement,
  source,
  pinned,
  showDefault,
  color,
  fill,
  fontFamily,
  direction,
  idPrefix,
  resolvePaint,
}: NativeChartFocusOverlayProps<TDatum, TXValue, TYValue>) {
  const focus = points[0]
    ? {
        primary: points[0],
        group: points,
        source,
        pinned,
      }
    : null
  const focusedScene = resolveFocusScene(scene, focus).scene
  const nodes = focusedSceneNodes(focusedScene, focus, placement)
  const defaultPoints = placement === 'over' && showDefault ? points : []
  if (!nodes.length && !defaultPoints.length) return null
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      pointerEvents="none"
      accessible={false}
      color={color}
      fontFamily={fontFamily}
      style={absoluteFill}
    >
      <NativeChartSceneNodes
        scene={focusedScene}
        nodes={nodes}
        color={color}
        fontFamily={fontFamily}
        direction={direction}
        idPrefix={idPrefix}
        resolvePaint={resolvePaint}
      />
      {defaultPoints.map((point, index) => (
        <Circle
          key={`default-focus:${index}`}
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
