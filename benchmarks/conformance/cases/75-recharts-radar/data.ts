export const radarSubjects = [
  'Math',
  'Chinese',
  'English',
  'Geography',
  'Physics',
  'History',
] as const

export type RadarSubject = (typeof radarSubjects)[number]

export interface RadarDatum {
  subject: RadarSubject
  score: number
}

const initialData: readonly RadarDatum[] = [
  { subject: 'Math', score: 120 },
  { subject: 'Chinese', score: 98 },
  { subject: 'English', score: 86 },
  { subject: 'Geography', score: 99 },
  { subject: 'Physics', score: 85 },
  { subject: 'History', score: 65 },
]

export function radarData(revision = 0): readonly RadarDatum[] {
  if (revision % 2 === 0) return initialData

  return initialData.map((row) =>
    row.subject === 'English'
      ? { ...row, score: 104 }
      : row.subject === 'History'
        ? { ...row, score: 82 }
        : row,
  )
}
