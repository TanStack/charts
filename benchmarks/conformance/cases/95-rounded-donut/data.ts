export interface RoundedDonutDatum {
  id: 'api' | 'jobs' | 'browser' | 'edge' | 'other'
  label: string
  value: number
  fill: string
}

const initialData: readonly RoundedDonutDatum[] = [
  { id: 'api', label: 'API', value: 34, fill: '#0284c7' },
  { id: 'jobs', label: 'Jobs', value: 25, fill: '#4f46e5' },
  { id: 'browser', label: 'Browser', value: 19, fill: '#9333ea' },
  { id: 'edge', label: 'Edge', value: 14, fill: '#db2777' },
  { id: 'other', label: 'Other', value: 8, fill: '#ea580c' },
]

export function roundedDonutData(revision = 0): readonly RoundedDonutDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'api') return { ...row, value: 29 }
    if (row.id === 'jobs') return { ...row, value: 28 }
    if (row.id === 'browser') return { ...row, value: 22 }
    return row
  })
}
