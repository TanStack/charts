export interface BrowserRow {
  id: string
  label: string
  visitors: number
}

const baseRows: readonly BrowserRow[] = [
  { id: 'chrome', label: 'Chrome', visitors: 275 },
  { id: 'safari', label: 'Safari', visitors: 200 },
  { id: 'firefox', label: 'Firefox', visitors: 187 },
  { id: 'edge', label: 'Edge', visitors: 173 },
  { id: 'other', label: 'Other', visitors: 90 },
]

export function browserRows(revision: number): readonly BrowserRow[] {
  if (revision % 2 === 0) return baseRows
  return baseRows.map((row, index) => ({
    ...row,
    visitors: Math.round(row.visitors * (0.93 + ((index * 3) % 5) / 20)),
  }))
}

export function browserTotal(rows: readonly BrowserRow[]) {
  return rows.reduce((total, row) => total + row.visitors, 0)
}
