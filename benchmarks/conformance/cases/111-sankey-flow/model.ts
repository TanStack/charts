export type FlowTone = 'Neutral' | 'Profit' | 'Cost'

export type FlowNodeId =
  | 'iphone'
  | 'macbook'
  | 'ipad'
  | 'wearables'
  | 'products'
  | 'services'
  | 'revenue'
  | 'gross-profit'
  | 'cost-of-revenue'
  | 'operating-profit'
  | 'operating-expenses'
  | 'product-costs'
  | 'service-costs'
  | 'net-profit'
  | 'tax'
  | 'other'
  | 'research-development'
  | 'selling-general-administrative'

export const leafFlowNodeIds = [
  'iphone',
  'macbook',
  'ipad',
  'wearables',
  'services',
  'product-costs',
  'service-costs',
  'tax',
  'other',
  'research-development',
  'selling-general-administrative',
] as const satisfies readonly FlowNodeId[]

export type LeafFlowNodeId = (typeof leafFlowNodeIds)[number]

export interface FlowNode {
  readonly id: FlowNodeId
  readonly label: string
  readonly compactLabel?: string
  readonly value: number
  readonly displayValue: string
  readonly tone: FlowTone
  readonly order: number
  readonly labelSide: 'left' | 'right'
  readonly labelBackdrop?: boolean
}

export interface FlowLink {
  readonly source: FlowNodeId
  readonly target: FlowNodeId
  readonly value: number
  readonly tone: FlowTone
}

export interface IncomeStatementData {
  readonly nodes: readonly FlowNode[]
  readonly links: readonly FlowLink[]
}

interface ValueRange {
  readonly initial: number
  readonly min: number
  readonly max: number
}

type FlowNodeTemplate = Omit<FlowNode, 'value' | 'displayValue'>

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

// Values are billions of dollars. The revision ranges vary leaf accounts by
// hundreds to a few thousand million dollars, then every subtotal is derived.
export const incomeStatementValueRanges = {
  iphone: { initial: 205.489, min: 202.489, max: 208.489 },
  macbook: { initial: 40.177, min: 38.177, max: 42.177 },
  ipad: { initial: 29.292, min: 27.792, max: 30.792 },
  wearables: { initial: 41.241, min: 39.241, max: 43.241 },
  services: { initial: 78.129, min: 75.129, max: 81.129 },
  'product-costs': { initial: 201.471, min: 197.471, max: 205.471 },
  'service-costs': { initial: 22.075, min: 20.575, max: 23.575 },
  tax: { initial: 19.3, min: 17.8, max: 20.8 },
  other: { initial: 0.334, min: 0.134, max: 0.534 },
  'research-development': { initial: 26.251, min: 24.251, max: 28.251 },
  'selling-general-administrative': {
    initial: 25.094,
    min: 23.094,
    max: 27.094,
  },
} as const satisfies Record<LeafFlowNodeId, ValueRange>

const nodeTemplates = [
  {
    id: 'iphone',
    label: 'iPhone',
    tone: 'Neutral',
    order: 0,
    labelSide: 'left',
  },
  {
    id: 'macbook',
    label: 'MacBook',
    tone: 'Neutral',
    order: 1,
    labelSide: 'left',
  },
  {
    id: 'ipad',
    label: 'iPad',
    tone: 'Neutral',
    order: 2,
    labelSide: 'left',
  },
  {
    id: 'wearables',
    label: 'Watch and AirPods',
    compactLabel: 'Watch + Pods',
    tone: 'Neutral',
    order: 3,
    labelSide: 'left',
  },
  {
    id: 'services',
    label: 'Services',
    tone: 'Neutral',
    order: 4,
    labelSide: 'left',
    labelBackdrop: true,
  },
  {
    id: 'products',
    label: 'Products',
    tone: 'Neutral',
    order: 0,
    labelSide: 'left',
    labelBackdrop: true,
  },
  {
    id: 'revenue',
    label: 'Revenue',
    tone: 'Neutral',
    order: 0,
    labelSide: 'left',
    labelBackdrop: true,
  },
  {
    id: 'gross-profit',
    label: 'Gross profit',
    tone: 'Profit',
    order: 0,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'cost-of-revenue',
    label: 'Cost of revenue',
    compactLabel: 'Cost of rev.',
    tone: 'Cost',
    order: 1,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'operating-profit',
    label: 'Operating profit',
    compactLabel: 'Op. profit',
    tone: 'Profit',
    order: 0,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'operating-expenses',
    label: 'Operating expenses',
    compactLabel: 'Op. expenses',
    tone: 'Cost',
    order: 1,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'product-costs',
    label: 'Product costs',
    tone: 'Cost',
    order: 2,
    labelSide: 'right',
    labelBackdrop: true,
  },
  {
    id: 'service-costs',
    label: 'Service costs',
    tone: 'Cost',
    order: 3,
    labelSide: 'right',
  },
  {
    id: 'net-profit',
    label: 'Net profit',
    tone: 'Profit',
    order: 0,
    labelSide: 'right',
  },
  {
    id: 'tax',
    label: 'Tax',
    tone: 'Cost',
    order: 1,
    labelSide: 'right',
  },
  {
    id: 'other',
    label: 'Other',
    tone: 'Cost',
    order: 2,
    labelSide: 'right',
  },
  {
    id: 'research-development',
    label: 'R&D',
    tone: 'Cost',
    order: 3,
    labelSide: 'right',
  },
  {
    id: 'selling-general-administrative',
    label: 'SG&A',
    tone: 'Cost',
    order: 4,
    labelSide: 'right',
  },
] as const satisfies readonly FlowNodeTemplate[]

// These labels intentionally mirror the supplied reference graphic, whose
// one-decimal presentation is not uniformly derived from the precise links.
const initialDisplayValues = {
  iphone: '$205.5B',
  macbook: '$40.2B',
  ipad: '$29.3B',
  wearables: '$41.2B',
  products: '$316.2B',
  services: '$78.2B',
  revenue: '$394.3B',
  'gross-profit': '$170.9B',
  'cost-of-revenue': '$223.5B',
  'operating-profit': '$119.5B',
  'operating-expenses': '$51.4B',
  'product-costs': '$201.4B',
  'service-costs': '$22.1B',
  'net-profit': '$99.8B',
  tax: '$19.3B',
  other: '$0.3B',
  'research-development': '$26.3B',
  'selling-general-administrative': '$25.1B',
} as const satisfies Record<FlowNodeId, string>

export function incomeStatementData(revision: number): IncomeStatementData {
  const iphone = revisedLeafValue('iphone', revision)
  const macbook = revisedLeafValue('macbook', revision)
  const ipad = revisedLeafValue('ipad', revision)
  const wearables = revisedLeafValue('wearables', revision)
  const services = revisedLeafValue('services', revision)
  const productCosts = revisedLeafValue('product-costs', revision)
  const serviceCosts = revisedLeafValue('service-costs', revision)
  const tax = revisedLeafValue('tax', revision)
  const other = revisedLeafValue('other', revision)
  const researchDevelopment = revisedLeafValue('research-development', revision)
  const sellingGeneralAdministrative = revisedLeafValue(
    'selling-general-administrative',
    revision,
  )

  const products = roundBillions(iphone + macbook + ipad + wearables)
  const revenue = roundBillions(products + services)
  const costOfRevenue = roundBillions(productCosts + serviceCosts)
  const grossProfit = roundBillions(revenue - costOfRevenue)
  const operatingExpenses = roundBillions(
    researchDevelopment + sellingGeneralAdministrative,
  )
  const operatingProfit = roundBillions(grossProfit - operatingExpenses)
  const netProfit = roundBillions(operatingProfit - tax - other)

  const values = {
    iphone,
    macbook,
    ipad,
    wearables,
    products,
    services,
    revenue,
    'gross-profit': grossProfit,
    'cost-of-revenue': costOfRevenue,
    'operating-profit': operatingProfit,
    'operating-expenses': operatingExpenses,
    'product-costs': productCosts,
    'service-costs': serviceCosts,
    'net-profit': netProfit,
    tax,
    other,
    'research-development': researchDevelopment,
    'selling-general-administrative': sellingGeneralAdministrative,
  } as const satisfies Record<FlowNodeId, number>

  return {
    nodes: nodeTemplates.map((node) => ({
      ...node,
      value: values[node.id],
      displayValue:
        revision === 0
          ? initialDisplayValues[node.id]
          : formatBillions(values[node.id]),
    })),
    links: [
      flowLink('iphone', 'products', iphone, 'Neutral'),
      flowLink('macbook', 'products', macbook, 'Neutral'),
      flowLink('ipad', 'products', ipad, 'Neutral'),
      flowLink('wearables', 'products', wearables, 'Neutral'),
      flowLink('products', 'revenue', products, 'Neutral'),
      flowLink('services', 'revenue', services, 'Neutral'),
      flowLink('revenue', 'gross-profit', grossProfit, 'Profit'),
      flowLink('revenue', 'cost-of-revenue', costOfRevenue, 'Cost'),
      flowLink('gross-profit', 'operating-profit', operatingProfit, 'Profit'),
      flowLink('gross-profit', 'operating-expenses', operatingExpenses, 'Cost'),
      flowLink('cost-of-revenue', 'product-costs', productCosts, 'Cost'),
      flowLink('cost-of-revenue', 'service-costs', serviceCosts, 'Cost'),
      flowLink('operating-profit', 'net-profit', netProfit, 'Profit'),
      flowLink('operating-profit', 'tax', tax, 'Cost'),
      flowLink('operating-profit', 'other', other, 'Cost'),
      flowLink(
        'operating-expenses',
        'research-development',
        researchDevelopment,
        'Cost',
      ),
      flowLink(
        'operating-expenses',
        'selling-general-administrative',
        sellingGeneralAdministrative,
        'Cost',
      ),
    ],
  }
}

function revisedLeafValue(id: LeafFlowNodeId, revision: number) {
  const range = incomeStatementValueRanges[id]
  if (revision === 0) return range.initial
  const unit = seededUnitInterval(`${Math.trunc(revision)}:${id}`)
  return roundBillions(range.min + unit * (range.max - range.min))
}

function seededUnitInterval(seed: string) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0xffffffff
}

function roundBillions(value: number) {
  return Math.round(value * 1000) / 1000
}

function formatBillions(value: number) {
  return `$${value.toFixed(1)}B`
}

function flowLink(
  source: FlowNodeId,
  target: FlowNodeId,
  value: number,
  tone: FlowTone,
): FlowLink {
  return { source, target, value, tone }
}
