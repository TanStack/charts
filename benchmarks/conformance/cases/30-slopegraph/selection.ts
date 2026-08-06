export const wageFields = ['R90_10_1980', 'R90_10_2015'] as const

export type WageField = (typeof wageFields)[number]

export function wageYear(field: WageField): '1980' | '2015' {
  return field === 'R90_10_1980' ? '1980' : '2015'
}
