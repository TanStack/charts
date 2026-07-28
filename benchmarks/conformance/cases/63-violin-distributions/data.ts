export type ViolinCohort = 'Control' | 'Treatment A' | 'Treatment B'

export interface ViolinPoint {
  id: string
  cohort: ViolinCohort
  value: number
  x1: number
  x2: number
}

export interface ViolinMedian {
  id: string
  cohort: ViolinCohort
  x1: number
  x2: number
  median: number
  center: number
}

export const violinCohorts: readonly ViolinCohort[] = [
  'Control',
  'Treatment A',
  'Treatment B',
]

export const violinColors: Readonly<Record<ViolinCohort, string>> = {
  Control: '#64748b',
  'Treatment A': '#0d9488',
  'Treatment B': '#7c3aed',
}

const medians: Readonly<Record<ViolinCohort, number>> = {
  Control: 65,
  'Treatment A': 74,
  'Treatment B': 81,
}

export function violinData(revision: number): readonly ViolinPoint[] {
  const shift = revision % 2

  return violinCohorts.flatMap((cohort, cohortIndex) => {
    const center = cohortIndex + 1
    const median = medians[cohort] + shift
    const raw = Array.from({ length: 21 }, (_, index) => {
      const value = 40 + index * 3
      const primary = gaussian(value, median, 7 + cohortIndex)
      const shoulder = gaussian(value, median - 12 + cohortIndex * 5, 5) * 0.35
      return { value, density: primary + shoulder }
    })
    const maximum = Math.max(...raw.map((row) => row.density), 1)

    return raw.map(({ value, density }): ViolinPoint => {
      const halfWidth = (density / maximum) * 0.38
      return {
        id: `${cohort}:${value}`,
        cohort,
        value,
        x1: center - halfWidth,
        x2: center + halfWidth,
      }
    })
  })
}

export function violinMedians(revision: number): readonly ViolinMedian[] {
  const shift = revision % 2

  return violinCohorts.map((cohort, index) => ({
    id: cohort,
    cohort,
    x1: index + 0.82,
    x2: index + 1.18,
    median: medians[cohort] + shift,
    center: index + 1,
  }))
}

function gaussian(value: number, mean: number, deviation: number): number {
  const distance = (value - mean) / deviation
  return Math.exp(-0.5 * distance * distance)
}
