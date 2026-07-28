export interface QuantileObservation {
  id: string
  date: Date
  value: number
}

const monthCount = 14
const sampleCount = 15

export const quantileDateDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2024, 0, 1)),
  new Date(Date.UTC(2025, 1, 1)),
]

export const quantileValueDomain: readonly [number, number] = [25, 95]

export function quantileData(revision = 0): readonly QuantileObservation[] {
  const updated = revision % 2 === 1

  return Array.from({ length: monthCount }, (_, monthIndex) =>
    Array.from({ length: sampleCount }, (_, sampleIndex) => {
      const center = 55 + monthIndex * 0.9 + Math.sin(monthIndex * 0.58) * 7.5
      const spread = 1.55 + (monthIndex % 4) * 0.12
      const centeredSample = sampleIndex - (sampleCount - 1) / 2
      const irregular = Math.sin(sampleIndex * 1.61 + monthIndex * 0.73) * 1.25
      const revisionDelta = updated
        ? Math.cos(sampleIndex * 0.77 + monthIndex) * 0.8
        : 0
      const value = center + centeredSample * spread + irregular + revisionDelta

      return {
        id: `${monthIndex}:${sampleIndex}`,
        date: new Date(Date.UTC(2024, monthIndex, 1)),
        value: Math.round(value * 100) / 100,
      }
    }),
  ).flat()
}
