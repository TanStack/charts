import type { SceneGroup, SceneStyle } from './types'

export interface ArrowGeometryOptions {
  key: string
  x1: number
  y1: number
  x2: number
  y2: number
  headLength: number
  headAngle: number
  style: SceneStyle
  className?: string
}

export function arrowGeometry({
  key,
  x1,
  y1,
  x2,
  y2,
  headLength,
  headAngle,
  style,
  className = 'ts-chart__arrow-item',
}: ArrowGeometryOptions): SceneGroup {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const leftAngle = angle + Math.PI - headAngle
  const rightAngle = angle + Math.PI + headAngle

  return {
    kind: 'group',
    key,
    className,
    ariaHidden: true,
    children: [
      {
        kind: 'rule',
        key: `${key}:shaft`,
        className: 'ts-chart__arrow-shaft',
        x1,
        y1,
        x2,
        y2,
        style,
      },
      {
        kind: 'rule',
        key: `${key}:head-left`,
        x1: x2,
        y1: y2,
        x2: x2 + Math.cos(leftAngle) * headLength,
        y2: y2 + Math.sin(leftAngle) * headLength,
        style,
      },
      {
        kind: 'rule',
        key: `${key}:head-right`,
        x1: x2,
        y1: y2,
        x2: x2 + Math.cos(rightAngle) * headLength,
        y2: y2 + Math.sin(rightAngle) * headLength,
        style,
      },
    ],
  }
}
