export interface MotionRow {
  id: string
  period: string
  actual: number
  target: number
  featured?: boolean
}

export const entranceRows: readonly MotionRow[] = [
  { id: 'jan', period: 'Jan', actual: 26, target: 30 },
  { id: 'feb', period: 'Feb', actual: 38, target: 34 },
  { id: 'mar', period: 'Mar', actual: 44, target: 42 },
  { id: 'apr', period: 'Apr', actual: 58, target: 49, featured: true },
  { id: 'may', period: 'May', actual: 52, target: 55 },
  { id: 'jun', period: 'Jun', actual: 69, target: 62 },
  { id: 'jul', period: 'Jul', actual: 76, target: 70 },
  { id: 'aug', period: 'Aug', actual: 84, target: 79 },
]
