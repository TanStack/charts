export type PremiumKpiId = 'revenue' | 'customers' | 'churn'

export interface PremiumKpiPoint {
  readonly id: string
  readonly period: number
  readonly value: number
}

export interface PremiumKpiMetric {
  readonly id: PremiumKpiId
  readonly label: string
  readonly value: string
  readonly trend: string
  readonly trendDirection: 'up' | 'down'
  readonly surface: 'area' | 'line'
  readonly rows: readonly PremiumKpiPoint[]
}

const stages = [
  {
    revenue: [
      264_400, 281_200, 276_800, 302_600, 319_100, 337_500, 331_800, 356_200,
      371_600, 365_900, 394_300, 412_840,
    ],
    customers: [
      2_810, 2_950, 3_030, 3_170, 3_120, 3_290, 3_410, 3_500, 3_590, 3_670,
      3_750, 3_842,
    ],
    churn: [2.8, 2.6, 2.7, 2.5, 2.4, 2.3, 2.35, 2.15, 2.1, 1.95, 1.86, 1.7],
  },
  {
    revenue: [
      279_200, 288_900, 286_400, 315_300, 329_800, 351_500, 345_900, 369_600,
      388_100, 381_700, 406_900, 429_180,
    ],
    customers: [
      2_940, 3_020, 3_140, 3_240, 3_210, 3_380, 3_500, 3_610, 3_690, 3_790,
      3_880, 3_976,
    ],
    churn: [
      2.7, 2.55, 2.62, 2.42, 2.33, 2.2, 2.24, 2.05, 1.98, 1.84, 1.75, 1.62,
    ],
  },
] as const

export function premiumKpisForRevision(
  revision: number,
): readonly PremiumKpiMetric[] {
  const stage = stages[Math.abs(revision) % stages.length] ?? stages[0]

  return [
    {
      id: 'revenue',
      label: 'Monthly revenue',
      value: formatRevenue(last(stage.revenue)),
      trend: revision % 2 === 0 ? '+9.2%' : '+10.6%',
      trendDirection: 'up',
      surface: 'area',
      rows: points('revenue', stage.revenue),
    },
    {
      id: 'customers',
      label: 'Active customers',
      value: last(stage.customers).toLocaleString('en-US'),
      trend: revision % 2 === 0 ? '+6.4%' : '+7.1%',
      trendDirection: 'up',
      surface: 'line',
      rows: points('customers', stage.customers),
    },
    {
      id: 'churn',
      label: 'Net churn',
      value: `${last(stage.churn).toFixed(1)}%`,
      trend: revision % 2 === 0 ? '−0.5 pt' : '−0.6 pt',
      trendDirection: 'down',
      surface: 'area',
      rows: points('churn', stage.churn),
    },
  ]
}

function points(
  metric: PremiumKpiId,
  values: readonly number[],
): readonly PremiumKpiPoint[] {
  return values.map((value, period) => ({
    id: `${metric}-${period}`,
    period,
    value,
  }))
}

function formatRevenue(value: number) {
  return `$${(value / 1_000).toFixed(1)}K`
}

function last(values: readonly number[]) {
  return values[values.length - 1] ?? 0
}
