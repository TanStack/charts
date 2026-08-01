import * as React from 'react'
import type { ColorValue } from 'react-native'
import {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
  Text,
} from 'react-native-svg'
import type { CommonPathProps, Linejoin } from 'react-native-svg'
import type {
  ChartScene,
  SceneGroup,
  SceneNode,
  SceneStyle,
} from '@tanstack/charts/types'
import type { NativePaintResolver } from './paint'

export interface NativeChartSceneProps {
  scene: ChartScene
  color: ColorValue
  fontFamily?: string
  idPrefix: string
  resolvePaint: NativePaintResolver
}

export const NativeChartScene = React.memo(function NativeChartScene({
  scene,
  color,
  fontFamily,
  idPrefix,
  resolvePaint,
}: NativeChartSceneProps) {
  const gradientIds = React.useMemo(
    () => new Set(scene.gradients.map((gradient) => gradient.id)),
    [scene.gradients],
  )
  const paint = React.useCallback(
    (value: string) =>
      resolveScenePaint(value, gradientIds, idPrefix, resolvePaint, color),
    [color, gradientIds, idPrefix, resolvePaint],
  )

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      color={color}
      fontFamily={fontFamily}
      pointerEvents="none"
      accessible={false}
    >
      {scene.gradients.length ? (
        <Defs>
          {scene.gradients.map((gradient) => (
            <LinearGradient
              key={gradient.id}
              id={scopedId(idPrefix, gradient.id)}
              x1={percent(gradient.x1 ?? 0)}
              y1={percent(gradient.y1 ?? 1)}
              x2={percent(gradient.x2 ?? 0)}
              y2={percent(gradient.y2 ?? 0)}
            >
              {gradient.stops.map((stop, index) => (
                <Stop
                  key={`${gradient.id}:${index}`}
                  offset={percent(stop.offset)}
                  stopColor={paint(stop.color)}
                  stopOpacity={stop.opacity}
                />
              ))}
            </LinearGradient>
          ))}
        </Defs>
      ) : null}
      {scene.theme.background === 'transparent' ? null : (
        <Rect
          x={0}
          y={0}
          width={scene.width}
          height={scene.height}
          fill={paint(scene.theme.background)}
        />
      )}
      {scene.nodes.map((node) => renderSceneNode(node, idPrefix, paint))}
    </Svg>
  )
})

function renderSceneNode(
  node: SceneNode,
  idPrefix: string,
  paint: (value: string) => ColorValue,
): React.ReactNode {
  if (node.kind === 'group' && node.focus) return null
  const style = nativeSceneStyle(node.style, paint)

  switch (node.kind) {
    case 'group':
      return renderGroup(node, idPrefix, paint, style)
    case 'rule':
      return (
        <Line
          key={node.key}
          {...style}
          x1={node.x1}
          y1={node.y1}
          x2={node.x2}
          y2={node.y2}
        />
      )
    case 'polyline':
      return (
        <Path
          key={node.key}
          {...style}
          d={node.path ?? pointsPath(node.points, false)}
          vectorEffect="non-scaling-stroke"
        />
      )
    case 'area':
      return (
        <Path
          key={node.key}
          {...style}
          d={node.path ?? pointsPath(node.points, true)}
          vectorEffect="non-scaling-stroke"
        />
      )
    case 'dot':
      return (
        <Circle
          key={node.key}
          {...style}
          cx={node.x}
          cy={node.y}
          r={node.radius}
        />
      )
    case 'rect':
      return (
        <Rect
          key={node.key}
          {...style}
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={node.radius}
        />
      )
    case 'label':
      return (
        <Text
          key={node.key}
          {...style}
          x={node.x}
          y={node.y}
          textAnchor={node.anchor}
          alignmentBaseline={
            node.baseline === 'auto' ? 'baseline' : node.baseline
          }
          transform={
            node.rotate === undefined
              ? undefined
              : `rotate(${node.rotate} ${node.x} ${node.y})`
          }
          fontSize={node.fontSize}
          fontWeight={node.fontWeight}
        >
          {node.text}
        </Text>
      )
  }
}

function renderGroup(
  node: SceneGroup,
  idPrefix: string,
  paint: (value: string) => ColorValue,
  style: ReturnType<typeof nativeSceneStyle>,
) {
  const clipId = node.clip
    ? scopedId(idPrefix, `clip-${stableId(node.key)}`)
    : undefined
  const transform =
    node.translateX === undefined && node.translateY === undefined
      ? undefined
      : `translate(${node.translateX ?? 0} ${node.translateY ?? 0})`

  return (
    <G
      key={node.key}
      {...style}
      transform={transform}
      clipPath={clipId ? `url(#${clipId})` : undefined}
    >
      {node.clip && clipId ? (
        <Defs>
          <ClipPath id={clipId}>
            <Rect
              x={node.clip.x}
              y={node.clip.y}
              width={node.clip.width}
              height={node.clip.height}
            />
          </ClipPath>
        </Defs>
      ) : null}
      {node.children.map((child) => renderSceneNode(child, idPrefix, paint))}
    </G>
  )
}

function nativeSceneStyle(
  style: SceneStyle | undefined,
  paint: (value: string) => ColorValue,
): CommonPathProps & { opacity?: number } {
  if (!style) return {}
  return {
    fill: style.fill === undefined ? undefined : paint(style.fill),
    fillOpacity: style.fillOpacity,
    stroke: style.stroke === undefined ? undefined : paint(style.stroke),
    strokeOpacity: style.strokeOpacity,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    strokeLinecap: style.lineCap,
    strokeLinejoin: resolveNativeLineJoin(style.lineJoin),
    strokeDasharray: style.strokeDasharray,
  }
}

export function resolveNativeLineJoin(
  lineJoin: SceneStyle['lineJoin'],
): Linejoin | undefined {
  if (lineJoin === 'arcs') return 'round'
  if (lineJoin === 'miter-clip') return 'miter'
  return lineJoin
}

function resolveScenePaint(
  value: string,
  gradientIds: ReadonlySet<string>,
  idPrefix: string,
  resolvePaint: NativePaintResolver,
  color: ColorValue,
) {
  const match = /^url\(#([\s\S]*)\)$/.exec(value)
  const id = match?.[1]
  if (id !== undefined && gradientIds.has(id)) {
    return `url(#${scopedId(idPrefix, id)})`
  }
  return resolvePaint(value, { color })
}

function pointsPath(
  points: readonly (readonly [number, number])[],
  close: boolean,
) {
  return `${points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`)
    .join('')}${close ? 'Z' : ''}`
}

function scopedId(prefix: string, id: string) {
  const encodedId = encodeResourceId(id)
  return prefix ? `${prefix}-${encodedId}` : encodedId
}

function encodeResourceId(value: string) {
  if (!value) return '_'
  return Array.from(value, (character) =>
    /^[a-zA-Z0-9-]$/.test(character)
      ? character
      : `_x${character.codePointAt(0)!.toString(16)}_`,
  ).join('')
}

function stableId(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return (hash >>> 0).toString(36)
}

function percent(value: number) {
  return `${Math.max(0, Math.min(1, value)) * 100}%`
}
