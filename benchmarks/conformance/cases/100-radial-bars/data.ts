export interface RadialBarDatum {
  id: string
  label: string
  value: number
  ring: number
  fill: string
}

const initialData: readonly RadialBarDatum[] = [
  { id: 'api', label: 'API', value: 92, ring: 0, fill: '#7c3aed' },
  { id: 'web', label: 'Web', value: 76, ring: 1, fill: '#0ea5e9' },
  { id: 'worker', label: 'Worker', value: 61, ring: 2, fill: '#14b8a6' },
  { id: 'mobile', label: 'Mobile', value: 44, ring: 3, fill: '#f59e0b' },
]

export function radialBarData(revision = 0): readonly RadialBarDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) =>
    row.id === 'worker'
      ? { ...row, value: 73 }
      : row.id === 'mobile'
        ? { ...row, value: 57 }
        : row,
  )
}
