export type RidgeRegion = 'North' | 'Central' | 'South'

export interface RidgePoint {
  id: string
  region: RidgeRegion
  x: number
  baseline: number
  density: number
}

export const ridgeRegions: readonly RidgeRegion[] = [
  'North',
  'Central',
  'South',
]

export const ridgeColors: Readonly<Record<RidgeRegion, string>> = {
  North: '#2563eb',
  Central: '#0d9488',
  South: '#d97706',
}

const peaks: Readonly<Record<RidgeRegion, readonly [number, number]>> = {
  North: [28, 63],
  Central: [47, 76],
  South: [35, 58],
}

export function ridgeData(revision: number): readonly RidgePoint[] {
  const shift = revision % 2 === 0 ? 0 : 3

  return ridgeRegions.flatMap((region, regionIndex) => {
    const [firstPeak, secondPeak] = peaks[region]
    const values = Array.from({ length: 21 }, (_, index) => {
      const x = index * 5
      const rawDensity =
        gaussian(x, firstPeak + shift, 11 + regionIndex * 2) +
        gaussian(x, secondPeak - shift, 8 + regionIndex) * 0.62
      return { x, rawDensity }
    })
    const maximum = Math.max(...values.map((value) => value.rawDensity), 1)

    return values.map(({ x, rawDensity }): RidgePoint => ({
      id: `${region}:${x}`,
      region,
      x,
      baseline: regionIndex,
      density: regionIndex + (rawDensity / maximum) * 0.78,
    }))
  })
}

function gaussian(value: number, mean: number, deviation: number): number {
  const distance = (value - mean) / deviation
  return Math.exp(-0.5 * distance * distance)
}
