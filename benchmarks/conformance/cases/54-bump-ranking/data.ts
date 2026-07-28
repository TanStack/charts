export const bumpEntities = [
  'Atlas',
  'Beacon',
  'Comet',
  'Delta',
  'Ember',
] as const

export type BumpEntity = (typeof bumpEntities)[number]

export interface BumpValue {
  id: string
  year: number
  entity: BumpEntity
  value: number
}

const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024] as const

const values: Record<BumpEntity, readonly number[]> = {
  Atlas: [88, 84, 81, 79, 83, 87, 92],
  Beacon: [82, 87, 85, 82, 78, 80, 86],
  Comet: [76, 75, 88, 91, 89, 84, 82],
  Delta: [70, 73, 74, 77, 85, 90, 88],
  Ember: [64, 67, 71, 86, 92, 94, 96],
}

export function bumpData(revision = 0): readonly BumpValue[] {
  const updated = revision % 2 === 1

  return years.flatMap((year, yearIndex) =>
    bumpEntities.map((entity) => {
      const baseValue = values[entity][yearIndex] ?? 0
      const adjustment =
        updated && year === 2021 && entity === 'Atlas'
          ? 9
          : updated && year === 2023 && entity === 'Beacon'
            ? 11
            : updated && year === 2024 && entity === 'Delta'
              ? 10
              : 0

      return {
        id: `${year}:${entity}`,
        year,
        entity,
        value: baseValue + adjustment,
      }
    }),
  )
}
