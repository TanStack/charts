export interface DefinitionMotionRow {
  id: string
  period: string
  actual: number
  target: number
  featured?: boolean
}

export const definitionMotionStages: readonly (readonly DefinitionMotionRow[])[] =
  [
    [
      { id: 'jan', period: 'Jan', actual: 34, target: 40 },
      { id: 'feb', period: 'Feb', actual: 52, target: 48 },
      { id: 'mar', period: 'Mar', actual: 46, target: 55 },
      { id: 'apr', period: 'Apr', actual: 71, target: 62, featured: true },
      { id: 'may', period: 'May', actual: 64, target: 68 },
      { id: 'jun', period: 'Jun', actual: 82, target: 76 },
    ],
    [
      { id: 'mar', period: 'Mar', actual: 77, target: 64 },
      { id: 'jan', period: 'Jan', actual: 58, target: 52 },
      { id: 'apr', period: 'Apr', actual: 43, target: 70, featured: true },
      { id: 'jul', period: 'Jul', actual: 96, target: 84 },
      { id: 'may', period: 'May', actual: 86, target: 73 },
      { id: 'aug', period: 'Aug', actual: 112, target: 91 },
    ],
    [
      { id: 'aug', period: 'Aug', actual: 61, target: 82 },
      { id: 'apr', period: 'Apr', actual: 103, target: 76, featured: true },
      { id: 'jan', period: 'Jan', actual: 42, target: 59 },
      { id: 'sep', period: 'Sep', actual: 88, target: 94 },
      { id: 'jul', period: 'Jul', actual: 73, target: 86 },
    ],
  ]

export function definitionMotionRows(revision: number) {
  return (
    definitionMotionStages[
      Math.abs(revision) % definitionMotionStages.length
    ] ?? definitionMotionStages[0]
  )
}
