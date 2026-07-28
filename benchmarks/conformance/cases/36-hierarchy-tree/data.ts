export interface HierarchyRow {
  id: string
  path: string
  label: string
}

const rows: readonly HierarchyRow[] = [
  { id: 'platform', path: 'Platform', label: 'Platform' },
  { id: 'data', path: 'Platform/Data', label: 'Data' },
  { id: 'query', path: 'Platform/Data/Query', label: 'Query' },
  { id: 'table', path: 'Platform/Data/Table', label: 'Table' },
  {
    id: 'navigation',
    path: 'Platform/Navigation',
    label: 'Navigation',
  },
  {
    id: 'router',
    path: 'Platform/Navigation/Router',
    label: 'Router',
  },
  { id: 'start', path: 'Platform/Navigation/Start', label: 'Start' },
  { id: 'ux', path: 'Platform/UX', label: 'UX' },
  { id: 'form', path: 'Platform/UX/Form', label: 'Form' },
  { id: 'virtual', path: 'Platform/UX/Virtual', label: 'Virtual' },
]

export function hierarchyData(revision = 0): readonly HierarchyRow[] {
  return rows.map((row) =>
    row.id === 'start' && revision % 2 === 1
      ? { ...row, label: 'Start client' }
      : row,
  )
}
