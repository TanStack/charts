export interface TrendPoint {
  date: Date
  value: number
}

export interface BarPoint {
  name: string
  value: number
}

const libraryNames = [
  'Query',
  'Router',
  'Table',
  'Form',
  'Start',
  'DB',
  'Virtual',
  'Store',
] as const

export function createTrendData(seed = 1): readonly TrendPoint[] {
  let value = 42

  return Array.from({ length: 44 }, (_, index) => {
    value +=
      Math.sin((index + seed) / 3.8) * 2.4 +
      Math.cos((index + seed * 2) / 7) * 1.7 +
      0.85

    return {
      date: new Date(Date.UTC(2025, 7, 3 + index * 7)),
      value: Math.round(value * 10) / 10,
    }
  })
}

export function createBarData(seed = 1): readonly BarPoint[] {
  return libraryNames.map((name, index) => ({
    name,
    value:
      28 +
      ((index * 19 + seed * 13) % 47) +
      Math.round(Math.sin(seed * 0.9 + index) * 9),
  }))
}
