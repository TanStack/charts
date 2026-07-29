export interface PieDatum {
  id: 'ingest' | 'query' | 'alerts' | 'other'
  label: string
  value: number
  fill: string
}

const initialData: readonly PieDatum[] = [
  { id: 'ingest', label: 'Ingest', value: 42, fill: '#2563eb' },
  { id: 'query', label: 'Query', value: 28, fill: '#7c3aed' },
  { id: 'alerts', label: 'Alerts', value: 18, fill: '#db2777' },
  { id: 'other', label: 'Other', value: 12, fill: '#f59e0b' },
]

export function pieData(revision = 0): readonly PieDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'ingest') return { ...row, value: 35 }
    if (row.id === 'query') return { ...row, value: 31 }
    if (row.id === 'alerts') return { ...row, value: 22 }
    return row
  })
}
