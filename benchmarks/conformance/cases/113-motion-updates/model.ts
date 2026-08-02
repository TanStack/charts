export interface UpdateRow {
  id: string
  period: string
  actual: number
  target: number
  featured?: boolean
}

export const updateStages: readonly (readonly UpdateRow[])[] = [
  [
    { id: 'jan', period: 'Jan', actual: 28, target: 32 },
    { id: 'feb', period: 'Feb', actual: 36, target: 35 },
    { id: 'mar', period: 'Mar', actual: 45, target: 43 },
    { id: 'apr', period: 'Apr', actual: 57, target: 50, featured: true },
    { id: 'may', period: 'May', actual: 51, target: 56 },
    { id: 'jun', period: 'Jun', actual: 68, target: 63 },
    { id: 'jul', period: 'Jul', actual: 75, target: 71 },
    { id: 'aug', period: 'Aug', actual: 83, target: 79 },
  ],
  [
    { id: 'aug', period: 'Aug', actual: 64, target: 72 },
    { id: 'apr', period: 'Apr', actual: 86, target: 68, featured: true },
    { id: 'jan', period: 'Jan', actual: 48, target: 42 },
    { id: 'jul', period: 'Jul', actual: 58, target: 65 },
    { id: 'mar', period: 'Mar', actual: 72, target: 55 },
    { id: 'sep', period: 'Sep', actual: 39, target: 76 },
    { id: 'jun', period: 'Jun', actual: 78, target: 61 },
    { id: 'may', period: 'May', actual: 62, target: 59 },
  ],
  [
    { id: 'may', period: 'May', actual: 88, target: 70 },
    { id: 'oct', period: 'Oct', actual: 54, target: 82 },
    { id: 'mar', period: 'Mar', actual: 33, target: 48 },
    { id: 'aug', period: 'Aug', actual: 91, target: 77 },
    { id: 'apr', period: 'Apr', actual: 43, target: 63, featured: true },
    { id: 'sep', period: 'Sep', actual: 74, target: 80 },
    { id: 'jan', period: 'Jan', actual: 66, target: 52 },
    { id: 'jul', period: 'Jul', actual: 49, target: 68 },
  ],
]

export function updateRows(revision: number) {
  return (
    updateStages[Math.abs(revision) % updateStages.length] ?? updateStages[0]
  )
}
