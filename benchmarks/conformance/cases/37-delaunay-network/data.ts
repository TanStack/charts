export interface SpatialPoint {
  id: string
  x: number
  y: number
}

const points: readonly SpatialPoint[] = [
  { id: 'alpha', x: 8, y: 18 },
  { id: 'bravo', x: 22, y: 68 },
  { id: 'charlie', x: 35, y: 38 },
  { id: 'delta', x: 48, y: 82 },
  { id: 'echo', x: 58, y: 18 },
  { id: 'foxtrot', x: 70, y: 54 },
  { id: 'golf', x: 86, y: 28 },
  { id: 'hotel', x: 90, y: 78 },
  { id: 'india', x: 16, y: 88 },
  { id: 'juliet', x: 40, y: 12 },
  { id: 'kilo', x: 63, y: 91 },
  { id: 'lima', x: 77, y: 8 },
]

export function spatialData(revision = 0): readonly SpatialPoint[] {
  if (revision % 2 === 0) return points
  return points.map((point, index) => ({
    ...point,
    x: point.x + ((index % 3) - 1) * 1.5,
    y: point.y + ((index % 4) - 1.5) * 1.1,
  }))
}
