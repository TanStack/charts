export interface AutocorrelationObservation {
  id: string
  index: number
  value: number
}

export const autocorrelationDomain: readonly [number, number] = [20, 90]

export function autocorrelationData(
  revision = 0,
): readonly AutocorrelationObservation[] {
  const updated = revision % 2 === 1

  return Array.from({ length: 36 }, (_, index) => {
    const value =
      53 +
      Math.sin(index * 0.48) * 17 +
      Math.sin(index * 0.13 + 0.8) * 8 +
      (updated ? ((index % 7) - 3) * 0.65 : 0)

    return {
      id: `observation:${index}`,
      index,
      value: Math.round(value * 100) / 100,
    }
  })
}
