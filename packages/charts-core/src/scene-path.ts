import type {
  ChartBounds,
  ScenePathContext,
  ScenePathContour,
  ScenePathGeometry,
} from './types'

const pathTolerance = 0.25
const maxSubdivisionDepth = 12
const pathDigits = 3

interface MutableContour {
  points: (readonly [number, number])[]
  closed: boolean
}

/**
 * Records one path for rendering and derives a subpixel contour for interaction.
 * Both representations are emitted by the same drawing commands.
 */
export function scenePath(
  draw: (path: ScenePathContext) => void,
): ScenePathGeometry {
  const recorder = new ScenePathRecorder()
  draw(recorder)
  return recorder.result()
}

class ScenePathRecorder implements ScenePathContext {
  private data = ''
  private contours: MutableContour[] = []
  private contour: MutableContour | undefined
  private startX = 0
  private startY = 0
  private currentX = 0
  private currentY = 0
  private hasCurrentPoint = false

  moveTo(rawX: number, rawY: number): void {
    const x = rounded(rawX)
    const y = rounded(rawY)
    this.data += `M${x},${y}`
    this.contour = { points: [[x, y]], closed: false }
    this.contours.push(this.contour)
    this.startX = this.currentX = x
    this.startY = this.currentY = y
    this.hasCurrentPoint = true
  }

  lineTo(rawX: number, rawY: number): void {
    const x = rounded(rawX)
    const y = rounded(rawY)
    if (!this.hasCurrentPoint) {
      this.moveTo(x, y)
      return
    }
    this.data += `L${x},${y}`
    this.appendPoint(x, y)
  }

  quadraticCurveTo(
    rawControlX: number,
    rawControlY: number,
    rawX: number,
    rawY: number,
  ): void {
    const controlX = rounded(rawControlX)
    const controlY = rounded(rawControlY)
    const x = rounded(rawX)
    const y = rounded(rawY)
    if (!this.hasCurrentPoint) this.moveTo(controlX, controlY)
    this.data += `Q${controlX},${controlY},${x},${y}`
    const startX = this.currentX
    const startY = this.currentY
    appendFlattenedCubic(
      this.requiredContour().points,
      startX,
      startY,
      startX + (2 / 3) * (controlX - startX),
      startY + (2 / 3) * (controlY - startY),
      x + (2 / 3) * (controlX - x),
      y + (2 / 3) * (controlY - y),
      x,
      y,
      0,
    )
    this.currentX = x
    this.currentY = y
  }

  bezierCurveTo(
    rawControl1X: number,
    rawControl1Y: number,
    rawControl2X: number,
    rawControl2Y: number,
    rawX: number,
    rawY: number,
  ): void {
    const control1X = rounded(rawControl1X)
    const control1Y = rounded(rawControl1Y)
    const control2X = rounded(rawControl2X)
    const control2Y = rounded(rawControl2Y)
    const x = rounded(rawX)
    const y = rounded(rawY)
    if (!this.hasCurrentPoint) this.moveTo(control1X, control1Y)
    this.data += `C${control1X},${control1Y},${control2X},${control2Y},${x},${y}`
    appendFlattenedCubic(
      this.requiredContour().points,
      this.currentX,
      this.currentY,
      control1X,
      control1Y,
      control2X,
      control2Y,
      x,
      y,
      0,
    )
    this.currentX = x
    this.currentY = y
  }

  closePath(): void {
    if (!this.hasCurrentPoint || !this.contour) return
    this.data += 'Z'
    this.contour.closed = true
    this.currentX = this.startX
    this.currentY = this.startY
  }

  result(): ScenePathGeometry {
    const contours = this.contours.map((contour): ScenePathContour => ({
      points: contour.points,
      closed: contour.closed,
    }))
    return {
      data: this.data,
      contours,
      bounds: pathBounds(contours),
      tolerance: pathTolerance,
    }
  }

  private appendPoint(x: number, y: number): void {
    this.requiredContour().points.push([x, y])
    this.currentX = x
    this.currentY = y
  }

  private requiredContour(): MutableContour {
    if (this.contour) return this.contour
    this.moveTo(this.currentX, this.currentY)
    if (!this.contour) throw new TypeError('Expected an active path contour')
    return this.contour
  }
}

function appendFlattenedCubic(
  points: (readonly [number, number])[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  depth: number,
): void {
  if (
    depth >= maxSubdivisionDepth ||
    cubicIsFlat(x0, y0, x1, y1, x2, y2, x3, y3)
  ) {
    points.push([x3, y3])
    return
  }

  const x01 = (x0 + x1) / 2
  const y01 = (y0 + y1) / 2
  const x12 = (x1 + x2) / 2
  const y12 = (y1 + y2) / 2
  const x23 = (x2 + x3) / 2
  const y23 = (y2 + y3) / 2
  const x012 = (x01 + x12) / 2
  const y012 = (y01 + y12) / 2
  const x123 = (x12 + x23) / 2
  const y123 = (y12 + y23) / 2
  const x0123 = (x012 + x123) / 2
  const y0123 = (y012 + y123) / 2

  appendFlattenedCubic(
    points,
    x0,
    y0,
    x01,
    y01,
    x012,
    y012,
    x0123,
    y0123,
    depth + 1,
  )
  appendFlattenedCubic(
    points,
    x0123,
    y0123,
    x123,
    y123,
    x23,
    y23,
    x3,
    y3,
    depth + 1,
  )
}

function cubicIsFlat(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): boolean {
  const ux = 3 * x1 - 2 * x0 - x3
  const uy = 3 * y1 - 2 * y0 - y3
  const vx = 3 * x2 - 2 * x3 - x0
  const vy = 3 * y2 - 2 * y3 - y0
  return (
    Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy) <=
    16 * pathTolerance * pathTolerance
  )
}

function rounded(value: number): number {
  const factor = 10 ** pathDigits
  return Math.round(value * factor) / factor
}

function pathBounds(contours: readonly ScenePathContour[]): ChartBounds | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const contour of contours) {
    for (const point of contour.points) {
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue
      minX = Math.min(minX, point[0])
      minY = Math.min(minY, point[1])
      maxX = Math.max(maxX, point[0])
      maxY = Math.max(maxY, point[1])
    }
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : null
}
