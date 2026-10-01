import type { CurveFactory } from 'd3-shape'

export interface ElbowRouteOptions {
  /** Horizontal pixels the connector leaves the predecessor before turning. */
  stub?: number
  /** Pixels between the arrow tip and the successor's left edge. */
  endGap?: number
  /** Vertical pixels from the successor's center to its lane gutter. */
  gutter?: number
  /** Arrowhead length in pixels. */
  head?: number
}

/**
 * Routes a two-point finish-to-start dependency with right angles only.
 *
 * The connector exits the predecessor's right edge. When the successor starts
 * far enough to the right, it drops beside the predecessor and enters the
 * successor's left edge. Otherwise it runs back along the successor's lane
 * gutter before entering from the left. Every segment is horizontal or
 * vertical, and the arrowhead always points right into the successor.
 */
export function elbowRoute({
  stub = 8,
  endGap = 2,
  gutter = 12,
  head = 5,
}: ElbowRouteOptions = {}): CurveFactory {
  return (context) => {
    let points: [number, number][] = []
    return {
      areaStart() {},
      areaEnd() {},
      lineStart() {
        points = []
      },
      point(x, y) {
        points.push([x, y])
      },
      lineEnd() {
        const first = points[0]
        const last = points.at(-1)
        if (!first || !last || points.length < 2) return
        const [x0, y0] = first
        const x1 = last[0] - endGap
        const y1 = last[1]
        const exit = x0 + stub

        context.moveTo(x0, y0)
        if (x1 - exit >= stub) {
          context.lineTo(exit, y0)
          context.lineTo(exit, y1)
        } else {
          const lane = y1 - Math.sign(y1 - y0 || 1) * gutter
          const entry = x1 - stub
          context.lineTo(exit, y0)
          context.lineTo(exit, lane)
          context.lineTo(entry, lane)
          context.lineTo(entry, y1)
        }
        context.lineTo(x1, y1)
        context.moveTo(x1 - head, y1 - head * 0.8)
        context.lineTo(x1, y1)
        context.lineTo(x1 - head, y1 + head * 0.8)
      },
    }
  }
}
