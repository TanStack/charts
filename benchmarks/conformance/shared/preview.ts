import type { ConformanceInput } from '../types'

export function samplePreviewData<TDatum>(
  data: readonly TDatum[],
  input: ConformanceInput,
  limit: number,
  accessors: readonly ((datum: TDatum) => number | null | undefined)[] = [],
): readonly TDatum[] {
  if (input.preview !== true || data.length <= limit) return data

  const selected = new Set<number>()
  const slots = Math.max(2, limit - accessors.length * 2)
  for (let slot = 0; slot < slots; slot += 1) {
    selected.add(Math.round((slot / (slots - 1)) * (data.length - 1)))
  }

  for (const accessor of accessors) {
    let minimumIndex = -1
    let minimum = Number.POSITIVE_INFINITY
    let maximumIndex = -1
    let maximum = Number.NEGATIVE_INFINITY

    data.forEach((datum, index) => {
      const value = accessor(datum)
      if (value === null || value === undefined || !Number.isFinite(value)) {
        return
      }
      if (value < minimum) {
        minimum = value
        minimumIndex = index
      }
      if (value > maximum) {
        maximum = value
        maximumIndex = index
      }
    })

    if (minimumIndex >= 0) selected.add(minimumIndex)
    if (maximumIndex >= 0) selected.add(maximumIndex)
  }

  return data.filter((_datum, index) => selected.has(index))
}

export function samplePreviewSeries<TDatum, TSeries>(
  data: readonly TDatum[],
  input: ConformanceInput,
  limitPerSeries: number,
  series: (datum: TDatum) => TSeries,
): readonly TDatum[] {
  if (input.preview !== true) return data

  const indicesBySeries = new Map<TSeries, number[]>()
  data.forEach((datum, index) => {
    const key = series(datum)
    const indices = indicesBySeries.get(key) ?? []
    indices.push(index)
    indicesBySeries.set(key, indices)
  })

  const selected = new Set<number>()
  for (const indices of indicesBySeries.values()) {
    if (indices.length <= limitPerSeries) {
      indices.forEach((index) => selected.add(index))
      continue
    }
    for (let slot = 0; slot < limitPerSeries; slot += 1) {
      const index =
        indices[
          Math.round((slot / (limitPerSeries - 1)) * (indices.length - 1))
        ]
      if (index !== undefined) selected.add(index)
    }
  }

  return data.filter((_datum, index) => selected.has(index))
}
