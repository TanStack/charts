export interface SpringLineRow {
  id: string
  period: string
  primary: number
  comparison: number
}

export const springLineStages: readonly (readonly SpringLineRow[])[] = [
  [
    { id: 'jan', period: 'Jan', primary: 24, comparison: 34 },
    { id: 'feb', period: 'Feb', primary: 38, comparison: 40 },
    { id: 'mar', period: 'Mar', primary: 31, comparison: 46 },
    { id: 'apr', period: 'Apr', primary: 52, comparison: 49 },
    { id: 'may', period: 'May', primary: 47, comparison: 57 },
    { id: 'jun', period: 'Jun', primary: 66, comparison: 62 },
    { id: 'jul', period: 'Jul', primary: 61, comparison: 70 },
  ],
  [
    { id: 'jan', period: 'Jan', primary: 62, comparison: 45 },
    { id: 'feb', period: 'Feb', primary: 48, comparison: 58 },
    { id: 'mar', period: 'Mar', primary: 74, comparison: 52 },
    { id: 'apr', period: 'Apr', primary: 43, comparison: 67 },
    { id: 'may', period: 'May', primary: 81, comparison: 61 },
    { id: 'jun', period: 'Jun', primary: 55, comparison: 76 },
    { id: 'jul', period: 'Jul', primary: 84, comparison: 69 },
  ],
  [
    { id: 'jan', period: 'Jan', primary: 33, comparison: 71 },
    { id: 'feb', period: 'Feb', primary: 76, comparison: 51 },
    { id: 'mar', period: 'Mar', primary: 42, comparison: 78 },
    { id: 'apr', period: 'Apr', primary: 82, comparison: 56 },
    { id: 'may', period: 'May', primary: 39, comparison: 80 },
    { id: 'jun', period: 'Jun', primary: 73, comparison: 59 },
    { id: 'jul', period: 'Jul', primary: 49, comparison: 74 },
  ],
]

export function springLineRows(revision: number) {
  return (
    springLineStages[Math.abs(revision) % springLineStages.length] ??
    springLineStages[0]
  )
}
