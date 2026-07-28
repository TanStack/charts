export const nestedTooltipIds = [
  'edge',
  'api',
  'jobs',
  'search',
  'storage',
] as const

export type NestedTooltipId = (typeof nestedTooltipIds)[number]

export interface NestedTooltipMiniDatum {
  id: string
  period: string
  value: number
}

export interface NestedTooltipDatum {
  id: NestedTooltipId
  service: string
  latency: number
  history: readonly NestedTooltipMiniDatum[]
}

interface ServiceSeed {
  id: NestedTooltipId
  service: string
  latency: number
  history: readonly number[]
}

const serviceSeeds: readonly ServiceSeed[] = [
  { id: 'edge', service: 'Edge', latency: 34, history: [41, 37, 35, 34] },
  { id: 'api', service: 'API', latency: 56, history: [49, 53, 51, 56] },
  { id: 'jobs', service: 'Jobs', latency: 43, history: [47, 46, 44, 43] },
  {
    id: 'search',
    service: 'Search',
    latency: 72,
    history: [63, 68, 66, 72],
  },
  {
    id: 'storage',
    service: 'Storage',
    latency: 51,
    history: [57, 54, 55, 51],
  },
]

const historyPeriods = ['-3m', '-2m', '-1m', 'Now'] as const

export const nestedTooltipServices = serviceSeeds.map((seed) => seed.service)

export function nestedTooltipData(revision = 0): readonly NestedTooltipDatum[] {
  const updated = revision % 2 === 1
  return serviceSeeds.map((seed) => {
    const adjustment =
      updated && seed.id === 'search'
        ? -6
        : updated && seed.id === 'api'
          ? 4
          : 0
    return {
      id: seed.id,
      service: seed.service,
      latency: seed.latency + adjustment,
      history: seed.history.map((value, index) => ({
        id: `${seed.id}-${historyPeriods[index] ?? index}`,
        period: historyPeriods[index] ?? String(index),
        value: index === seed.history.length - 1 ? value + adjustment : value,
      })),
    }
  })
}

export function isNestedTooltipId(value: unknown): value is NestedTooltipId {
  return nestedTooltipIds.some((id) => id === value)
}
