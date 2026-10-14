import type { ChartPattern, SceneNode } from './types'

export interface ChartPatternOptions {
  id: string
  /** Foreground paint. Accepts any CSS color, including `var()`. */
  color: string
  /** Paint behind the foreground. Omit for a transparent background. */
  background?: string
  /** Distance between repeats in pixels, at least `1`. Defaults to `6`. */
  spacing?: number
  /** Tile rotation in degrees, counterclockwise. */
  angle?: number
}

export interface LinePatternOptions extends ChartPatternOptions {
  /** Line thickness in pixels, clamped to `spacing`. Defaults to `1`. */
  strokeWidth?: number
}

export interface DotPatternOptions extends ChartPatternOptions {
  /** Dot radius in pixels, clamped to half of `spacing`. Defaults to `1.5`. */
  radius?: number
}

/** Parallel lines. `angle` defaults to `45`, which draws `/` hatching. */
export function linePattern(options: LinePatternOptions): ChartPattern {
  const spacing = patternSpacing(options)
  const width = Math.min(spacing, size(options.strokeWidth, 1))
  return patternTile(options, spacing, 45, {
    kind: 'rect',
    key: `pattern:${options.id}:line`,
    x: 0,
    y: round((spacing - width) / 2),
    width: spacing,
    height: width,
    style: { fill: options.color },
  })
}

/** A square grid of dots. `angle` defaults to `0`. */
export function dotPattern(options: DotPatternOptions): ChartPattern {
  const spacing = patternSpacing(options)
  return patternTile(options, spacing, 0, {
    kind: 'dot',
    key: `pattern:${options.id}:dot`,
    x: spacing / 2,
    y: spacing / 2,
    radius: Math.min(spacing / 2, size(options.radius, 1.5)),
    style: { fill: options.color },
  })
}

function patternTile(
  options: ChartPatternOptions,
  spacing: number,
  defaultAngle: number,
  mark: SceneNode,
): ChartPattern {
  const nodes: SceneNode[] =
    options.background === undefined
      ? []
      : [
          {
            kind: 'rect',
            key: `pattern:${options.id}:background`,
            x: 0,
            y: 0,
            width: spacing,
            height: spacing,
            style: { fill: options.background },
          },
        ]
  nodes.push(mark)
  return {
    id: options.id,
    width: spacing,
    height: spacing,
    angle: round(
      Number.isFinite(options.angle) ? options.angle! : defaultAngle,
    ),
    nodes,
  }
}

function patternSpacing(options: ChartPatternOptions) {
  return Math.max(1, size(options.spacing, 6))
}

// Hundredths match SVG serialization, so SVG and raster tiles agree.
function size(value: number | undefined, fallback: number) {
  return round(
    value !== undefined && Number.isFinite(value) && value >= 0
      ? value
      : fallback,
  )
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
