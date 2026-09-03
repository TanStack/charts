import type { ScenePolygon } from './types'

type ContourPoint = readonly number[]
type ContourRing = readonly ContourPoint[]
type ContourPolygon = readonly ContourRing[]

export type ContourLevelIdentity =
  | readonly ['explicit', value: number, occurrence: number]
  | readonly ['generated', count: number, index: number]

export type ContourLevelMode =
  | { readonly kind: 'explicit' }
  | { readonly kind: 'generated'; readonly count: number }

export interface IdentifiedContourLevel {
  readonly value: number
  readonly identity: ContourLevelIdentity
}

/** Validates a threshold count or returns a finite sorted copy of exact levels. */
export function normalizeContourThresholds(
  input: number | Iterable<number> | undefined,
  defaultCount: number,
  markName: string,
): number | readonly number[] {
  const thresholds = input ?? defaultCount
  if (typeof thresholds === 'number') {
    if (!Number.isInteger(thresholds) || thresholds <= 0) {
      throw new TypeError(
        `${markName}: threshold count must be a positive integer`,
      )
    }
    return thresholds
  }

  const values = Array.from(thresholds)
  if (!values.every((value) => Number.isFinite(value))) {
    throw new TypeError(`${markName}: thresholds must be finite numbers`)
  }
  return values.sort((left, right) => left - right)
}

/** Assigns motion identity before any empty contour levels are removed. */
export function identifyContourLevels(
  levels: readonly number[],
  mode: ContourLevelMode,
): readonly IdentifiedContourLevel[] {
  if (mode.kind === 'generated') {
    return levels.map((value, index) => ({
      value,
      identity: ['generated', mode.count, index],
    }))
  }

  const occurrences = new Map<number, number>()
  return levels.map((value) => {
    const occurrence = occurrences.get(value) ?? 0
    occurrences.set(value, occurrence + 1)
    return {
      value,
      identity: ['explicit', value, occurrence],
    }
  })
}

/** Maps renderer-agnostic contour rings without introducing SVG path data. */
export function mapContourPolygons(
  coordinates: readonly ContourPolygon[],
  project: (x: number, y: number) => readonly [number, number] = (x, y) => [
    x,
    y,
  ],
): readonly ScenePolygon[] {
  return coordinates.flatMap((polygon) => {
    if (!polygon.length) return []
    const rings = polygon.map((ring) => {
      const points = ring.map((coordinate) => {
        const x = coordinate[0]
        const y = coordinate[1]
        if (!Number.isFinite(x) || !Number.isFinite(y)) invalidContourPoint()
        const point = project(x, y)
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
          invalidContourPoint()
        }
        return point
      })
      if (
        points.length > 1 &&
        points[0]![0] === points.at(-1)![0] &&
        points[0]![1] === points.at(-1)![1]
      ) {
        points.pop()
      }
      if (points.length < 3) {
        throw new TypeError('Contour rings must contain at least three points')
      }
      return points
    })
    return [rings]
  })
}

function invalidContourPoint(): never {
  throw new TypeError(
    'Contour coordinates must project to finite two-dimensional points',
  )
}
