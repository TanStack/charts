import type { ChartPoint } from './types'

type FocusCoordinates = Partial<Record<'x' | 'y', number>>

const mappedCoordinates = new WeakMap<ChartPoint, FocusCoordinates>()

export function setMappedFocusCoordinate(
  point: ChartPoint,
  axis: 'x' | 'y',
  coordinate: number,
): void {
  const current = mappedCoordinates.get(point)
  if (current) {
    current[axis] = coordinate
  } else {
    mappedCoordinates.set(point, { [axis]: coordinate })
  }
}

export function mappedFocusCoordinate(
  point: ChartPoint,
  axis: 'x' | 'y',
): number {
  return mappedCoordinates.get(point)?.[axis] ?? point[axis]
}
