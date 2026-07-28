export interface ChangePoint {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  direction: 'up' | 'down'
}

export function changeData(revision = 0): readonly ChangePoint[] {
  return Array.from({ length: 12 }, (_, index) => {
    const x1 = 10 + ((index * 17) % 73)
    const y1 = 15 + ((index * 23) % 61)
    const x2 = Math.min(98, x1 + 5 + (index % 4) * 2)
    const change = ((index * 11 + revision * 3) % 21) - 10
    return {
      id: `change:${index}`,
      x1,
      y1,
      x2,
      y2: Math.max(2, Math.min(98, y1 + change)),
      direction: change >= 0 ? 'up' : 'down',
    }
  })
}
