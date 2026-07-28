export interface QuantitativeHeatPoint {
  id: string
  x: number
  y: number
}

export function quantitativeHeatData(
  revision = 0,
): readonly QuantitativeHeatPoint[] {
  const rows: QuantitativeHeatPoint[] = []

  for (let yBin = 0; yBin < 8; yBin++) {
    for (let xBin = 0; xBin < 8; xBin++) {
      const count = 1 + ((xBin * 3 + yBin * 5 + revision) % 5)
      for (let sample = 0; sample < count; sample++) {
        rows.push({
          id: `${xBin}:${yBin}:${sample}`,
          x:
            xBin * 10 + 1 + ((sample * 1.9 + yBin * 0.7 + revision * 0.35) % 8),
          y:
            yBin * 10 +
            1 +
            ((sample * 2.3 + xBin * 0.55 + revision * 0.25) % 8),
        })
      }
    }
  }

  return rows
}
