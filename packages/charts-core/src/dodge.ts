import { dodgeOffsets } from './dodge-internal'
import { resolveDotLayout } from './dot-layout'
import type { DotLayout } from './dot-layout'

export type DodgeXAnchor = 'left' | 'middle' | 'right'
export type DodgeYAnchor = 'top' | 'middle' | 'bottom'

export interface DodgeOptions<TAnchor extends string> {
  anchor?: TAnchor
  /** Empty pixels between neighboring circle edges. Defaults to 1. */
  padding?: number
}

export type DodgeXOptions<TAnchor extends DodgeXAnchor = DodgeXAnchor> =
  DodgeOptions<TAnchor>

export type DodgeYOptions<TAnchor extends DodgeYAnchor = DodgeYAnchor> =
  DodgeOptions<TAnchor>

export type DodgeXLayout<TAnchor extends DodgeXAnchor = DodgeXAnchor> =
  DotLayout<'x', TAnchor>

export type DodgeYLayout<TAnchor extends DodgeYAnchor = DodgeYAnchor> =
  DotLayout<'y', TAnchor>

/** Derives collision-free pixel x positions while preserving scaled y. */
export function dodgeX<const TAnchor extends DodgeXAnchor = 'left'>(
  options: DodgeXOptions<TAnchor> = {},
): DodgeXLayout<TAnchor> {
  const anchor = options.anchor ?? ('left' as TAnchor)
  const padding = validPadding(options.padding)
  if (anchor !== 'left' && anchor !== 'middle' && anchor !== 'right') {
    throw new TypeError(`dodgeX: unknown anchor "${String(anchor)}"`)
  }

  return {
    axis: 'x',
    anchor,
    [resolveDotLayout]: ({ chart, measuredPositions, radii }) => {
      const edgeAnchored = anchor !== 'middle'
      const offsets = dodgeOffsets(
        measuredPositions,
        radii,
        padding,
        edgeAnchored,
      )
      const baseline =
        anchor === 'left'
          ? chart.x
          : anchor === 'right'
            ? chart.x + chart.width
            : chart.x + chart.width / 2
      const direction = anchor === 'right' ? -1 : 1
      return offsets.map((offset) => baseline + offset * direction)
    },
  }
}

/** Derives collision-free pixel y positions while preserving scaled x. */
export function dodgeY<const TAnchor extends DodgeYAnchor = 'bottom'>(
  options: DodgeYOptions<TAnchor> = {},
): DodgeYLayout<TAnchor> {
  const anchor = options.anchor ?? ('bottom' as TAnchor)
  const padding = validPadding(options.padding)
  if (anchor !== 'top' && anchor !== 'middle' && anchor !== 'bottom') {
    throw new TypeError(`dodgeY: unknown anchor "${String(anchor)}"`)
  }

  return {
    axis: 'y',
    anchor,
    [resolveDotLayout]: ({ chart, measuredPositions, radii }) => {
      const edgeAnchored = anchor !== 'middle'
      const offsets = dodgeOffsets(
        measuredPositions,
        radii,
        padding,
        edgeAnchored,
      )
      const baseline =
        anchor === 'top'
          ? chart.y
          : anchor === 'bottom'
            ? chart.y + chart.height
            : chart.y + chart.height / 2
      const direction = anchor === 'bottom' ? -1 : 1
      return offsets.map((offset) => baseline + offset * direction)
    },
  }
}

function validPadding(padding: number | undefined): number {
  const resolved = padding ?? 1
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new TypeError('dodge: padding must be a nonnegative finite number')
  }
  return resolved
}
