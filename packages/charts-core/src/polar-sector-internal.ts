import { arc as createArc } from 'd3-shape'
import { isFiniteNumber, isNonnegativeFiniteNumber } from './mark'
import type { Arc } from 'd3-shape'

const tau = Math.PI * 2

export interface PolarSectorGeometry {
  readonly startAngle: number
  readonly endAngle: number
  readonly innerRadius: number
  readonly outerRadius: number
  readonly cornerRadius: number
}

export interface ResolvedPolarSector {
  readonly path: string
  readonly points: readonly (readonly [number, number])[]
}

let polarSectorArc: Arc<any, PolarSectorGeometry> | undefined

/** Resolves one D3 sector and samples its painted interaction boundary. */
export function resolvePolarSector(
  sector: PolarSectorGeometry,
): ResolvedPolarSector | undefined {
  if (
    !isFiniteNumber(sector.startAngle) ||
    !isFiniteNumber(sector.endAngle) ||
    !isNonnegativeFiniteNumber(sector.innerRadius) ||
    !isNonnegativeFiniteNumber(sector.outerRadius) ||
    !isNonnegativeFiniteNumber(sector.cornerRadius)
  ) {
    return undefined
  }
  const generator = (polarSectorArc ??= createArc<PolarSectorGeometry>()
    .startAngle((value) => value.startAngle)
    .endAngle((value) => value.endAngle)
    .innerRadius((value) => value.innerRadius)
    .outerRadius((value) => value.outerRadius)
    .cornerRadius((value) => value.cornerRadius))
  const path = generator(sector)
  if (typeof path !== 'string' || !path) return undefined
  return { path, points: polarSectorBoundary(generator, sector) }
}

function polarSectorBoundary(
  generator: Arc<any, PolarSectorGeometry>,
  sector: PolarSectorGeometry,
): readonly (readonly [number, number])[] {
  // Replay D3's own path commands so the interaction polygon samples rounded,
  // reversed, and full-circle geometry without parsing SVG or using a DOM API.
  const points: [number, number][] = []
  const append = (x: number, y: number) => {
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return
    const previous = points.at(-1)
    if (
      previous &&
      Math.abs(previous[0] - x) <= 1e-9 &&
      Math.abs(previous[1] - y) <= 1e-9
    ) {
      return
    }
    points.push([x, y])
  }
  const context = {
    moveTo: append,
    lineTo: append,
    arc(
      centerX: number,
      centerY: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      counterclockwise = false,
    ) {
      const sweep = canvasArcSweep(startAngle, endAngle, counterclockwise)
      if (!isFiniteNumber(sweep)) return
      if (sweep === 0) {
        append(
          centerX + radius * Math.cos(startAngle),
          centerY + radius * Math.sin(startAngle),
        )
        return
      }
      const steps = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 24)))
      for (let index = 0; index <= steps; index += 1) {
        const angle = startAngle + (sweep * index) / steps
        append(
          centerX + radius * Math.cos(angle),
          centerY + radius * Math.sin(angle),
        )
      }
    },
    closePath() {},
  }
  const previousContext = generator.context()
  // D3 only calls this narrow path-context surface, but its declaration names
  // the complete Canvas context.
  generator.context(context as unknown as CanvasRenderingContext2D)
  try {
    generator(sector)
  } finally {
    generator.context(previousContext)
  }
  return points
}

function canvasArcSweep(
  startAngle: number,
  endAngle: number,
  counterclockwise: boolean,
): number {
  const difference = endAngle - startAngle
  if (!isFiniteNumber(difference)) return Number.NaN
  if (counterclockwise) {
    if (difference <= -tau) return -tau
    const sweep = difference % tau
    return sweep > 0 ? sweep - tau : sweep
  }
  if (difference >= tau) return tau
  const sweep = difference % tau
  return sweep < 0 ? sweep + tau : sweep
}
