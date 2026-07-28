export interface TimePoint {
  id: string
  date: Date
  value: number
  series: 'Atlas' | 'Beacon' | 'Comet'
}

export interface CategoryPoint {
  id: string
  category: string
  value: number
  series: 'Desktop' | 'Mobile' | 'Tablet'
}

export interface ScatterPoint {
  id: number
  x: number
  y: number
  size: number
  group: 'North' | 'South' | 'West'
}

export interface DistributionPoint {
  id: number
  value: number
  group: 'A' | 'B'
}

export interface HeatmapPoint {
  id: string
  day: string
  hour: string
  value: number
}

export interface QuartetPoint {
  id: string
  set: 'I' | 'II' | 'III' | 'IV'
  x: number
  y: number
}

const seriesNames = ['Atlas', 'Beacon', 'Comet'] as const
const categories = [
  'Query',
  'Router',
  'Table',
  'Form',
  'Start',
  'Virtual',
  'Store',
  'DB',
] as const
const categorySeries = ['Desktop', 'Mobile', 'Tablet'] as const
const scatterGroups = ['North', 'South', 'West'] as const
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const hours = ['00', '04', '08', '12', '16', '20'] as const

export const timeDomain: readonly [Date, Date] = [
  new Date(Date.UTC(2024, 0, 7)),
  new Date(Date.UTC(2024, 0, 7 + 35 * 7)),
]
export const categoryValueDomain: readonly [number, number] = [0, 70]
export const categoryTotalDomain: readonly [number, number] = [0, 140]

export function timeSeries(revision = 0): readonly TimePoint[] {
  return seriesNames.flatMap((series, seriesIndex) =>
    Array.from({ length: 36 }, (_, index) => {
      const trend = 22 + index * (0.72 + seriesIndex * 0.08)
      const wave =
        Math.sin((index + revision * 2 + seriesIndex * 3) / 3.8) *
          (4.5 + seriesIndex) +
        Math.cos((index + seriesIndex * 5) / 7.3) * 2.4
      return {
        id: `${series}:${index}`,
        date: new Date(Date.UTC(2024, 0, 7 + index * 7)),
        value: round(trend + wave + seriesIndex * 11),
        series,
      }
    }),
  )
}

export function categoryData(revision = 0): readonly CategoryPoint[] {
  return categories.flatMap((category, categoryIndex) =>
    categorySeries.map((series, seriesIndex) => ({
      id: `${category}:${series}`,
      category,
      series,
      value:
        16 +
        ((categoryIndex * 17 + seriesIndex * 11 + revision * 5) % 31) +
        seriesIndex * 8,
    })),
  )
}

export function scatterData(revision = 0): readonly ScatterPoint[] {
  let state = 0x9e3779b9 ^ (revision * 977)
  return Array.from({ length: 72 }, (_, index) => {
    state = Math.imul(state ^ (state >>> 16), 0x21f0aaad)
    state = Math.imul(state ^ (state >>> 15), 0x735a2d97)
    state ^= state >>> 15
    const jitter = (state >>> 0) / 4_294_967_295
    const group = scatterGroups[index % scatterGroups.length] ?? 'North'
    const groupIndex = scatterGroups.indexOf(group)
    const x = 12 + ((index * 13) % 79) + jitter * 7
    return {
      id: index,
      x: round(x),
      y: round(18 + x * (0.42 + groupIndex * 0.07) + Math.sin(index) * 9),
      size: 5 + ((index * 7 + groupIndex * 3) % 28),
      group,
    }
  })
}

export function distributionData(revision = 0): readonly DistributionPoint[] {
  return Array.from({ length: 240 }, (_, index) => {
    const group = index % 2 === 0 ? 'A' : 'B'
    const center = group === 'A' ? 44 : 61
    const wave =
      Math.sin((index + revision) * 1.73) * 13 +
      Math.cos((index + revision * 3) * 0.37) * 7
    return {
      id: index,
      value: round(center + wave),
      group,
    }
  })
}

export function heatmapData(revision = 0): readonly HeatmapPoint[] {
  return days.flatMap((day, dayIndex) =>
    hours.map((hour, hourIndex) => ({
      id: `${day}:${hour}`,
      day,
      hour,
      value:
        8 +
        ((dayIndex * 13 + hourIndex * 17 + revision * 3) % 47) +
        (dayIndex < 5 && hourIndex > 1 && hourIndex < 5 ? 21 : 0),
    })),
  )
}

export function quartetData(): readonly QuartetPoint[] {
  const rows = [
    [10, 8.04, 9.14, 7.46, 6.58],
    [8, 6.95, 8.14, 6.77, 5.76],
    [13, 7.58, 8.74, 12.74, 7.71],
    [9, 8.81, 8.77, 7.11, 8.84],
    [11, 8.33, 9.26, 7.81, 8.47],
    [14, 9.96, 8.1, 8.84, 7.04],
    [6, 7.24, 6.13, 6.08, 5.25],
    [4, 4.26, 3.1, 5.39, 12.5],
    [12, 10.84, 9.13, 8.15, 5.56],
    [7, 4.82, 7.26, 6.42, 7.91],
    [5, 5.68, 4.74, 5.73, 6.89],
  ] as const
  const sets = ['I', 'II', 'III', 'IV'] as const

  return sets.flatMap((set, setIndex) =>
    rows.map((row, index) => ({
      id: `${set}:${index}`,
      set,
      x: set === 'IV' ? (index === 7 ? 19 : 8) : row[0],
      y: row[setIndex + 1] ?? 0,
    })),
  )
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
