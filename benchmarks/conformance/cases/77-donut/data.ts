export interface DonutDatum {
  id: 'browser' | 'node' | 'edge' | 'mobile' | 'other'
  label: string
  value: number
  fill: string
}

const initialData: readonly DonutDatum[] = [
  { id: 'browser', label: 'Browser', value: 36, fill: '#0ea5e9' },
  { id: 'node', label: 'Node', value: 27, fill: '#6366f1' },
  { id: 'edge', label: 'Edge', value: 17, fill: '#a855f7' },
  { id: 'mobile', label: 'Mobile', value: 13, fill: '#ec4899' },
  { id: 'other', label: 'Other', value: 7, fill: '#f97316' },
]

export function donutData(revision = 0): readonly DonutDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'browser') return { ...row, value: 30 }
    if (row.id === 'node') return { ...row, value: 31 }
    if (row.id === 'edge') return { ...row, value: 19 }
    return row
  })
}
