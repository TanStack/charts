export interface RoseDatum {
  id: 'api' | 'worker' | 'browser' | 'edge' | 'mobile' | 'other'
  label: string
  value: number
  fill: string
}

const initialData: readonly RoseDatum[] = [
  { id: 'api', label: 'API', value: 92, fill: '#0369a1' },
  { id: 'worker', label: 'Worker', value: 74, fill: '#2563eb' },
  { id: 'browser', label: 'Browser', value: 61, fill: '#4f46e5' },
  { id: 'edge', label: 'Edge', value: 83, fill: '#7c3aed' },
  { id: 'mobile', label: 'Mobile', value: 48, fill: '#c026d3' },
  { id: 'other', label: 'Other', value: 67, fill: '#db2777' },
]

export function roseData(revision = 0): readonly RoseDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'api') return { ...row, value: 78 }
    if (row.id === 'worker') return { ...row, value: 88 }
    if (row.id === 'browser') return { ...row, value: 70 }
    if (row.id === 'mobile') return { ...row, value: 56 }
    return row
  })
}
