export interface ConnectedPoint {
  id: string
  year: number
  activity: number
  cost: number
}

export interface DirectionSegment {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

const activity = [54, 56, 58, 61, 65, 69, 73, 77, 80, 78, 74, 69, 64, 60, 57]
const cost = [32, 36, 42, 49, 58, 68, 76, 82, 86, 79, 69, 59, 51, 45, 41]

export function connectedData(revision = 0): readonly ConnectedPoint[] {
  const updated = revision % 2 === 1

  return activity.map((baseActivity, index) => ({
    id: `${2000 + index}`,
    year: 2000 + index,
    activity:
      baseActivity +
      (updated && (index === 5 || index === 10) ? (index === 5 ? 2 : -2) : 0),
    cost:
      (cost[index] ?? 0) +
      (updated && (index === 7 || index === 12) ? (index === 7 ? -3 : 3) : 0),
  }))
}

export function directionSegments(
  rows: readonly ConnectedPoint[],
): readonly DirectionSegment[] {
  const targetIndexes = [4, 8, 12]
  const segments: DirectionSegment[] = []

  for (const targetIndex of targetIndexes) {
    const source = rows[targetIndex - 1]
    const target = rows[targetIndex]
    if (source === undefined || target === undefined) continue
    segments.push({
      id: `${source.year}:${target.year}`,
      x1: source.activity,
      y1: source.cost,
      x2: target.activity,
      y2: target.cost,
    })
  }

  return segments
}
