export interface NestedDonutDatum {
  id: 'client' | 'server' | 'browser' | 'mobile' | 'api' | 'worker'
  label: string
  value: number
  fill: string
}

export interface NestedDonutData {
  inner: readonly NestedDonutDatum[]
  outer: readonly NestedDonutDatum[]
}

const initialData: NestedDonutData = {
  inner: [
    { id: 'client', label: 'Client', value: 62, fill: '#38bdf8' },
    { id: 'server', label: 'Server', value: 38, fill: '#8b5cf6' },
  ],
  outer: [
    { id: 'browser', label: 'Browser', value: 35, fill: '#0284c7' },
    { id: 'mobile', label: 'Mobile', value: 27, fill: '#0ea5e9' },
    { id: 'api', label: 'API', value: 23, fill: '#7c3aed' },
    { id: 'worker', label: 'Worker', value: 15, fill: '#a855f7' },
  ],
}

export function nestedDonutData(revision = 0): NestedDonutData {
  if (revision % 2 === 0) return initialData

  return {
    inner: initialData.inner.map((row) =>
      row.id === 'client' ? { ...row, value: 55 } : { ...row, value: 45 },
    ),
    outer: initialData.outer.map((row) => {
      if (row.id === 'browser') return { ...row, value: 30 }
      if (row.id === 'mobile') return { ...row, value: 25 }
      if (row.id === 'api') return { ...row, value: 27 }
      return { ...row, value: 18 }
    }),
  }
}
