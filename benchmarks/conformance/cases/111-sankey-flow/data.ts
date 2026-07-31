export type FlowTone = 'Neutral' | 'Profit' | 'Cost'

export interface FlowNode {
  readonly id: string
  readonly label: string
  readonly compactLabel?: string
  readonly displayValue: string
  readonly tone: FlowTone
  readonly order: number
  readonly labelSide: 'left' | 'right'
  readonly labelBackdrop?: boolean
}

export interface FlowLink {
  readonly source: string
  readonly target: string
  readonly value: number
  readonly tone: FlowTone
}

export const incomeStatementTitle = 'Apple FY22 Income Statement'

export const toneColors = {
  Neutral: '#666666',
  Profit: '#00b51a',
  Cost: '#b50905',
} as const satisfies Record<FlowTone, string>

export const linkColors = {
  Neutral: '#8a8a8a',
  Profit: '#50c955',
  Cost: '#c96363',
} as const satisfies Record<FlowTone, string>

export const flowNodes: readonly FlowNode[] = [
  {
    id: 'iphone',
    label: 'iPhone',
    displayValue: '$205.5B',
    tone: 'Neutral',
    order: 0,
    labelSide: 'left',
  },
  {
    id: 'macbook',
    label: 'MacBook',
    displayValue: '$40.2B',
    tone: 'Neutral',
    order: 1,
    labelSide: 'left',
  },
  {
    id: 'ipad',
    label: 'iPad',
    displayValue: '$29.3B',
    tone: 'Neutral',
    order: 2,
    labelSide: 'left',
  },
  {
    id: 'wearables',
    label: 'Watch and AirPods',
    compactLabel: 'Watch + Pods',
    displayValue: '$41.2B',
    tone: 'Neutral',
    order: 3,
    labelSide: 'left',
  },
  {
    id: 'products',
    label: 'Products',
    displayValue: '$316.2B',
    tone: 'Neutral',
    order: 0,
    labelSide: 'left',
    labelBackdrop: true,
  },
  {
    id: 'services',
    label: 'Services',
    displayValue: '$78.2B',
    tone: 'Neutral',
    order: 1,
    labelSide: 'left',
    labelBackdrop: true,
  },
  {
    id: 'revenue',
    label: 'Revenue',
    displayValue: '$394.3B',
    tone: 'Neutral',
    order: 0,
    labelSide: 'left',
    labelBackdrop: true,
  },
  {
    id: 'gross-profit',
    label: 'Gross profit',
    displayValue: '$170.9B',
    tone: 'Profit',
    order: 0,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'cost-of-revenue',
    label: 'Cost of revenue',
    compactLabel: 'Cost of rev.',
    displayValue: '$223.5B',
    tone: 'Cost',
    order: 1,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'operating-profit',
    label: 'Operating profit',
    compactLabel: 'Op. profit',
    displayValue: '$119.5B',
    tone: 'Profit',
    order: 0,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'operating-expenses',
    label: 'Operating expenses',
    compactLabel: 'Op. expenses',
    displayValue: '$51.4B',
    tone: 'Cost',
    order: 1,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'product-costs',
    label: 'Product costs',
    displayValue: '$201.4B',
    tone: 'Cost',
    order: 2,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'service-costs',
    label: 'Service costs',
    displayValue: '$22.1B',
    tone: 'Cost',
    order: 3,
    labelSide: 'right',
  },
  {
    id: 'net-profit',
    label: 'Net profit',
    displayValue: '$99.8B',
    tone: 'Profit',
    order: 0,
    labelSide: 'right',
  },
  {
    id: 'tax',
    label: 'Tax',
    displayValue: '$19.3B',
    tone: 'Cost',
    order: 1,
    labelSide: 'right',
  },
  {
    id: 'other',
    label: 'Other',
    displayValue: '$0.3B',
    tone: 'Cost',
    order: 2,
    labelSide: 'right',
  },
  {
    id: 'research-development',
    label: 'R&D',
    displayValue: '$26.3B',
    tone: 'Cost',
    order: 3,
    labelSide: 'right',
  },
  {
    id: 'selling-general-administrative',
    label: 'SG&A',
    displayValue: '$25.1B',
    tone: 'Cost',
    order: 4,
    labelSide: 'right',
  },
]

// Apple-reported values in billions retain enough precision for every
// intermediate node to conserve flow; display labels mirror the supplied chart.
export const flowLinks: readonly FlowLink[] = [
  { source: 'iphone', target: 'products', value: 205.489, tone: 'Neutral' },
  { source: 'macbook', target: 'products', value: 40.177, tone: 'Neutral' },
  { source: 'ipad', target: 'products', value: 29.292, tone: 'Neutral' },
  { source: 'wearables', target: 'products', value: 41.241, tone: 'Neutral' },
  { source: 'products', target: 'revenue', value: 316.199, tone: 'Neutral' },
  { source: 'services', target: 'revenue', value: 78.129, tone: 'Neutral' },
  { source: 'revenue', target: 'gross-profit', value: 170.782, tone: 'Profit' },
  {
    source: 'revenue',
    target: 'cost-of-revenue',
    value: 223.546,
    tone: 'Cost',
  },
  {
    source: 'gross-profit',
    target: 'operating-profit',
    value: 119.437,
    tone: 'Profit',
  },
  {
    source: 'gross-profit',
    target: 'operating-expenses',
    value: 51.345,
    tone: 'Cost',
  },
  {
    source: 'cost-of-revenue',
    target: 'product-costs',
    value: 201.471,
    tone: 'Cost',
  },
  {
    source: 'cost-of-revenue',
    target: 'service-costs',
    value: 22.075,
    tone: 'Cost',
  },
  {
    source: 'operating-profit',
    target: 'net-profit',
    value: 99.803,
    tone: 'Profit',
  },
  {
    source: 'operating-profit',
    target: 'tax',
    value: 19.3,
    tone: 'Cost',
  },
  {
    source: 'operating-profit',
    target: 'other',
    value: 0.334,
    tone: 'Cost',
  },
  {
    source: 'operating-expenses',
    target: 'research-development',
    value: 26.251,
    tone: 'Cost',
  },
  {
    source: 'operating-expenses',
    target: 'selling-general-administrative',
    value: 25.094,
    tone: 'Cost',
  },
]
