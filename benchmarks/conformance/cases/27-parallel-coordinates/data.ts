export type ParallelModel =
  'Atlas' | 'Beacon' | 'Comet' | 'Delta' | 'Echo' | 'Flux'

export type ParallelMetric =
  'Speed' | 'Reliability' | 'Ease' | 'Flexibility' | 'Efficiency'

export interface ParallelPoint {
  id: string
  model: ParallelModel
  metric: ParallelMetric
  score: number
}

export const parallelModels: readonly ParallelModel[] = [
  'Atlas',
  'Beacon',
  'Comet',
  'Delta',
  'Echo',
  'Flux',
]

export const parallelMetrics: readonly ParallelMetric[] = [
  'Speed',
  'Reliability',
  'Ease',
  'Flexibility',
  'Efficiency',
]

const baseScores: readonly (readonly number[])[] = [
  [88, 72, 61, 84, 77],
  [68, 91, 78, 66, 82],
  [81, 79, 89, 58, 70],
  [59, 84, 73, 92, 65],
  [76, 67, 82, 74, 93],
  [92, 63, 66, 80, 86],
]

export function parallelData(revision = 0): readonly ParallelPoint[] {
  return parallelModels.flatMap((model, modelIndex) =>
    parallelMetrics.map((metric, metricIndex) => ({
      id: `${model}:${metric}`,
      model,
      metric,
      score: Math.max(
        0,
        Math.min(
          100,
          (baseScores[modelIndex]?.[metricIndex] ?? 0) +
            (revision === 0 ? 0 : ((modelIndex + metricIndex) % 3) - 1),
        ),
      ),
    })),
  )
}
