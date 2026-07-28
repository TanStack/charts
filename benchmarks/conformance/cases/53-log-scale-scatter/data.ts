export interface LogScatterPoint {
  id: number
  x: number
  y: number
}

export function logScatterData(revision = 0): readonly LogScatterPoint[] {
  return Array.from({ length: 60 }, (_, index) => {
    const column = index % 20
    const band = Math.floor(index / 20)
    const exponent = (column / 19) * 4

    return {
      id: index,
      x: 10 ** exponent,
      y:
        12 +
        exponent * 16 +
        band * 7 +
        Math.sin(index * 1.37 + revision * 0.4) * 5,
    }
  })
}
