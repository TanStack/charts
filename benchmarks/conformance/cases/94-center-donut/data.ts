export interface CenterDonutDatum {
  id: 'ingest' | 'query' | 'store'
  label: string
  value: number
  fill: string
}

const initialData: readonly CenterDonutDatum[] = [
  { id: 'ingest', label: 'Ingest', value: 42, fill: '#0ea5e9' },
  { id: 'query', label: 'Query', value: 32, fill: '#6366f1' },
  { id: 'store', label: 'Store', value: 22, fill: '#a855f7' },
]

export function centerDonutData(revision = 0): readonly CenterDonutDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'ingest') return { ...row, value: 47 }
    if (row.id === 'query') return { ...row, value: 35 }
    return { ...row, value: 26 }
  })
}
