export interface VectorPoint {
  id: string
  x: number
  y: number
  speed: number
  direction: number
}

export function vectorData(revision = 0): readonly VectorPoint[] {
  return Array.from({ length: 30 }, (_, index) => {
    const x = index % 6
    const y = Math.floor(index / 6)
    return {
      id: `${x}:${y}`,
      x,
      y,
      speed: 9 + ((x * 3 + y * 5 + revision) % 10),
      direction: (x * 31 + y * 47 + revision * 11) % 360,
    }
  })
}
