export interface BasicFlowNode {
  readonly id: string
  readonly label: string
}

export interface BasicFlowLink {
  readonly source: string
  readonly target: string
  readonly value: number
}

export const basicFlowNodes = [
  { id: 'input', label: 'Input' },
  { id: 'path-a', label: 'Path A' },
  { id: 'path-b', label: 'Path B' },
  { id: 'output', label: 'Output' },
] as const satisfies readonly BasicFlowNode[]

export const basicFlowLinks = [
  { source: 'input', target: 'path-a', value: 6 },
  { source: 'input', target: 'path-b', value: 4 },
  { source: 'path-a', target: 'output', value: 6 },
  { source: 'path-b', target: 'output', value: 4 },
] as const satisfies readonly BasicFlowLink[]
