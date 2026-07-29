export interface PolarScatterDatum {
  id: string
  angle: number
  radius: number
}

const initialData: readonly PolarScatterDatum[] = [
  { id: 'event-01', angle: 12, radius: 28 },
  { id: 'event-02', angle: 37, radius: 72 },
  { id: 'event-03', angle: 63, radius: 45 },
  { id: 'event-04', angle: 88, radius: 84 },
  { id: 'event-05', angle: 116, radius: 61 },
  { id: 'event-06', angle: 143, radius: 36 },
  { id: 'event-07', angle: 169, radius: 77 },
  { id: 'event-08', angle: 197, radius: 52 },
  { id: 'event-09', angle: 221, radius: 91 },
  { id: 'event-10', angle: 248, radius: 43 },
  { id: 'event-11', angle: 274, radius: 68 },
  { id: 'event-12', angle: 301, radius: 31 },
  { id: 'event-13', angle: 327, radius: 81 },
  { id: 'event-14', angle: 348, radius: 57 },
]

export function polarScatterData(revision = 0): readonly PolarScatterDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) => {
    if (row.id === 'event-02') return { ...row, radius: 64 }
    if (row.id === 'event-05') return { ...row, radius: 74 }
    if (row.id === 'event-09') return { ...row, radius: 79 }
    if (row.id === 'event-12') return { ...row, radius: 46 }
    return row
  })
}
