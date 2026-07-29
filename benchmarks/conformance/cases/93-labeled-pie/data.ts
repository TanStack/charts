export interface LabeledPieDatum {
  id: 'api' | 'worker' | 'browser' | 'other'
  label: string
  value: number
  fill: string
}

const initialData: readonly LabeledPieDatum[] = [
  { id: 'api', label: 'API', value: 38, fill: '#2563eb' },
  { id: 'worker', label: 'Worker', value: 27, fill: '#7c3aed' },
  { id: 'browser', label: 'Browser', value: 21, fill: '#db2777' },
  { id: 'other', label: 'Other', value: 14, fill: '#f59e0b' },
]

export function labeledPieData(revision = 0): readonly LabeledPieDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'api') return { ...row, value: 32 }
    if (row.id === 'worker') return { ...row, value: 30 }
    if (row.id === 'browser') return { ...row, value: 24 }
    return row
  })
}
