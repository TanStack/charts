export interface BasicFlowNode {
  readonly id: string
  readonly label: string
}

export interface BasicFlowLink {
  readonly source: string
  readonly target: string
  readonly value: number
}

export interface BasicSankeyData {
  readonly nodes: readonly BasicFlowNode[]
  readonly links: readonly BasicFlowLink[]
}

export const basicFlowNodes = [
  { id: 'input', label: 'Input' },
  { id: 'path-a', label: 'Path A' },
  { id: 'path-b', label: 'Path B' },
  { id: 'output', label: 'Output' },
] as const satisfies readonly BasicFlowNode[]

const pathAValues = [6, 7, 5, 3, 4] as const

export function basicSankeyData(revision: number): BasicSankeyData {
  const pathA =
    pathAValues[Math.abs(Math.trunc(revision)) % pathAValues.length] ??
    pathAValues[0]
  const pathB = 10 - pathA

  return {
    nodes: basicFlowNodes,
    links: [
      { source: 'input', target: 'path-a', value: pathA },
      { source: 'input', target: 'path-b', value: pathB },
      { source: 'path-a', target: 'output', value: pathA },
      { source: 'path-b', target: 'output', value: pathB },
    ],
  }
}
