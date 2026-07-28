export type ScatterStatus = 'passed' | 'failed'

export interface ManyPointDatum {
  id: string
  x: number
  y: number
  z: number
}

export interface ManyPointSeries {
  name: string
  status: ScatterStatus
  points: readonly ManyPointDatum[]
}

export interface FlatManyPointDatum extends ManyPointDatum {
  series: string
  status: ScatterStatus
}

const seriesCount = 100
const pointsPerSeries = 10

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 4_294_967_296
  }
}

function createInitialSeries(): readonly ManyPointSeries[] {
  const random = createRandom(42)

  return Array.from({ length: seriesCount }, (_, seriesIndex) => ({
    name: `series-${seriesIndex}`,
    status: random() > 0.5 ? 'passed' : 'failed',
    points: Array.from({ length: pointsPerSeries }, (_, pointIndex) => ({
      id: `${seriesIndex}:${pointIndex}`,
      x: random() * 100,
      y: random() * 100,
      z: random() * 100,
    })),
  }))
}

const initialSeries = createInitialSeries()

export function manyPointSeries(revision = 0): readonly ManyPointSeries[] {
  if (revision % 2 === 0) return initialSeries

  return initialSeries.map((series, seriesIndex) => ({
    ...series,
    points: series.points.map((point, pointIndex) => ({
      ...point,
      x: Math.max(
        0,
        Math.min(100, point.x + ((seriesIndex + pointIndex) % 5) - 2),
      ),
      y: Math.max(
        0,
        Math.min(100, point.y + ((seriesIndex * 2 + pointIndex) % 7) - 3),
      ),
      z: Math.max(0, Math.min(100, point.z + (pointIndex % 3) * 4 - 4)),
    })),
  }))
}

export function flatManyPoints(revision = 0): readonly FlatManyPointDatum[] {
  return manyPointSeries(revision).flatMap((series) =>
    series.points.map((point) => ({
      ...point,
      series: series.name,
      status: series.status,
    })),
  )
}
