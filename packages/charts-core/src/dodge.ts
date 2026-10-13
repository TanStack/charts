import { dodgeOffsets } from './dodge-internal'
import { resolveDotLayout } from './dot-layout'
import { isChartValue } from './mark'
import type { DotLayout } from './dot-layout'
import type { ChartValue } from './types'

export type { DotLayout, DotLayoutResolveContext } from './dot-layout'

export interface CreateDotLayoutOptions<
  TAxis extends 'x' | 'y',
  TAnchor extends ChartValue,
> {
  readonly axis: TAxis
  readonly anchor: TAnchor
  readonly resolve: DotLayout<TAxis, TAnchor>[typeof resolveDotLayout]
}

export type DodgeXAnchor = 'left' | 'middle' | 'right'
export type DodgeYAnchor = 'top' | 'middle' | 'bottom'

export interface DodgeOptions<TAnchor extends string> {
  anchor?: TAnchor
  /** Empty pixels between neighboring circle edges. Defaults to 1. */
  padding?: number
  /** Compress overflowing offsets into the plot. Compression can overlap dots. */
  fit?: 'overflow' | 'compress'
}

export type DodgeXOptions<TAnchor extends DodgeXAnchor = DodgeXAnchor> =
  DodgeOptions<TAnchor>

export type DodgeYOptions<TAnchor extends DodgeYAnchor = DodgeYAnchor> =
  DodgeOptions<TAnchor>

export type DodgeXLayout<TAnchor extends DodgeXAnchor = DodgeXAnchor> =
  DotLayout<'x', TAnchor>

export type DodgeYLayout<TAnchor extends DodgeYAnchor = DodgeYAnchor> =
  DotLayout<'y', TAnchor>

/** Creates a responsive final-pixel layout for one derived dot coordinate. */
export function createDotLayout<
  const TAxis extends 'x' | 'y',
  const TAnchor extends ChartValue,
>(options: CreateDotLayoutOptions<TAxis, TAnchor>): DotLayout<TAxis, TAnchor> {
  if (options.axis !== 'x' && options.axis !== 'y') {
    throw new TypeError(
      `createDotLayout: unknown axis "${String(options.axis)}"`,
    )
  }
  if (typeof options.resolve !== 'function') {
    throw new TypeError('createDotLayout: resolve must be a function')
  }
  if (!isChartValue(options.anchor)) {
    throw new TypeError(
      'createDotLayout: anchor must be a string, finite number, or valid Date',
    )
  }

  return {
    axis: options.axis,
    anchor: options.anchor,
    [resolveDotLayout]: options.resolve,
  }
}

/** Derives collision-free pixel x positions while preserving scaled y. */
export function dodgeX<const TAnchor extends DodgeXAnchor = 'left'>(
  options: DodgeXOptions<TAnchor> = {},
): DodgeXLayout<TAnchor> {
  const anchor = options.anchor ?? ('left' as TAnchor)
  const padding = validPadding(options.padding)
  const compress = options.fit === 'compress'
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
      if (compress) compressOffsets(offsets, radii, chart.width, edgeAnchored)
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
  const compress = options.fit === 'compress'
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
      if (compress) compressOffsets(offsets, radii, chart.height, edgeAnchored)
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

function compressOffsets(
  offsets: number[],
  radii: readonly number[],
  size: number,
  edgeAnchored: boolean,
) {
  if (!offsets.length) return
  let minimum = Infinity
  let maximum = -Infinity
  let radius = 0
  let fits = true
  const start = edgeAnchored ? 0 : -size / 2
  for (let index = 0; index < offsets.length; index++) {
    const offset = offsets[index]!
    const r = radii[index]!
    minimum = Math.min(minimum, offset)
    maximum = Math.max(maximum, offset)
    radius = Math.max(radius, r)
    if (offset - r < start || offset + r > start + size) fits = false
  }
  if (fits) return
  if (radius * 2 > size)
    throw new RangeError(
      'dodge: compress requires each circle diameter to fit within the plot',
    )
  const factor =
    maximum === minimum ? 0 : (size - radius * 2) / (maximum - minimum)
  for (let index = 0; index < offsets.length; index++) {
    offsets[index] = start + radius + (offsets[index]! - minimum) * factor
  }
}

function validPadding(padding: number | undefined): number {
  const resolved = padding ?? 1
  if (!Number.isFinite(resolved) || resolved < 0) {
    throw new TypeError('dodge: padding must be a nonnegative finite number')
  }
  return resolved
}
