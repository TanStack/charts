export const ageBands = [
  '80+',
  '70–79',
  '60–69',
  '50–59',
  '40–49',
  '30–39',
  '20–29',
  '10–19',
  '0–9',
] as const

export type AgeBand = (typeof ageBands)[number]

export interface PopulationDatum {
  age: AgeBand
  male: number
  female: number
}

const initialData: readonly PopulationDatum[] = [
  { age: '80+', male: -1.1, female: 2.1 },
  { age: '70–79', male: -2.8, female: 3.4 },
  { age: '60–69', male: -4.8, female: 5 },
  { age: '50–59', male: -6.1, female: 6 },
  { age: '40–49', male: -6.4, female: 6.2 },
  { age: '30–39', male: -6.9, female: 6.7 },
  { age: '20–29', male: -6.8, female: 6.5 },
  { age: '10–19', male: -6.4, female: 6.1 },
  { age: '0–9', male: -6.6, female: 6.3 },
]

export function populationData(revision = 0): readonly PopulationDatum[] {
  const updated = revision % 2 === 1
  if (!updated) return initialData

  return initialData.map((row) =>
    row.age === '20–29'
      ? { ...row, male: -6.3, female: 6.1 }
      : row.age === '60–69'
        ? { ...row, male: -5.1, female: 5.4 }
        : row,
  )
}
