export interface SunburstNode {
  [key: string]: unknown
  name: string
  value: number
  fill?: string
  children?: SunburstNode[]
}

function leaf(name: string, value: number): SunburstNode {
  return { name, value }
}

function branch(
  name: string,
  fill: string,
  children: SunburstNode[],
): SunburstNode {
  return {
    name,
    value: children.reduce((total, child) => total + child.value, 0),
    fill,
    children,
  }
}

export function sunburstData(revision = 0): SunburstNode {
  const changed = revision % 2 !== 0
  const children = [
    branch('Platform', '#7c3aed', [
      leaf('Browser', changed ? 36 : 30),
      leaf('Server', 20),
      leaf('Mobile', changed ? 14 : 10),
    ]),
    branch('Data', '#0ea5e9', [
      leaf('Queries', changed ? 21 : 25),
      leaf('Mutations', 15),
    ]),
    branch('Tools', '#14b8a6', [
      leaf('Devtools', 12),
      leaf('CLI', changed ? 12 : 8),
    ]),
  ]

  return {
    name: 'All errors',
    value: children.reduce((total, child) => total + child.value, 0),
    children,
  }
}
