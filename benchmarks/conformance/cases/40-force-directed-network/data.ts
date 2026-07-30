export type NetworkGroup = 'Client' | 'Service' | 'Data'

export interface NetworkNode {
  id: string
  label: string
  group: NetworkGroup
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
  weight: number
}

export const networkGroups: readonly NetworkGroup[] = [
  'Client',
  'Service',
  'Data',
]

export const networkColors = ['#2563eb', '#f97316', '#10b981']

export const networkNodes: readonly NetworkNode[] = [
  { id: 'web', label: 'Web', group: 'Client' },
  { id: 'mobile', label: 'Mobile', group: 'Client' },
  { id: 'gateway', label: 'Gateway', group: 'Service' },
  { id: 'auth', label: 'Auth', group: 'Service' },
  { id: 'catalog', label: 'Catalog', group: 'Service' },
  { id: 'search', label: 'Search', group: 'Service' },
  { id: 'orders', label: 'Orders', group: 'Service' },
  { id: 'payments', label: 'Payments', group: 'Service' },
  { id: 'inventory', label: 'Inventory', group: 'Data' },
  { id: 'events', label: 'Events', group: 'Data' },
  { id: 'analytics', label: 'Analytics', group: 'Data' },
]

export const networkEdges: readonly NetworkEdge[] = [
  { id: 'web-gateway', source: 'web', target: 'gateway', weight: 3 },
  { id: 'mobile-gateway', source: 'mobile', target: 'gateway', weight: 3 },
  { id: 'gateway-auth', source: 'gateway', target: 'auth', weight: 3 },
  { id: 'gateway-catalog', source: 'gateway', target: 'catalog', weight: 2 },
  { id: 'gateway-search', source: 'gateway', target: 'search', weight: 2 },
  { id: 'gateway-orders', source: 'gateway', target: 'orders', weight: 3 },
  {
    id: 'catalog-inventory',
    source: 'catalog',
    target: 'inventory',
    weight: 2,
  },
  { id: 'search-catalog', source: 'search', target: 'catalog', weight: 2 },
  { id: 'search-analytics', source: 'search', target: 'analytics', weight: 1 },
  { id: 'orders-auth', source: 'orders', target: 'auth', weight: 2 },
  { id: 'orders-payments', source: 'orders', target: 'payments', weight: 3 },
  { id: 'orders-inventory', source: 'orders', target: 'inventory', weight: 2 },
  { id: 'orders-events', source: 'orders', target: 'events', weight: 2 },
  { id: 'payments-events', source: 'payments', target: 'events', weight: 1 },
  { id: 'events-analytics', source: 'events', target: 'analytics', weight: 3 },
]
