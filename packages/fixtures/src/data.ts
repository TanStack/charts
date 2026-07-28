export interface DownloadPoint {
  date: Date
  package: 'Query' | 'Router' | 'Table'
  downloads: number
}

export interface LatencyPoint {
  id: string
  plan: 'Free' | 'Pro' | 'Enterprise'
  latency: number
}

const PACKAGES = ['Query', 'Router', 'Table'] as const
const PACKAGE_BASELINES = {
  Query: 6_800_000,
  Router: 2_400_000,
  Table: 1_700_000,
} as const

export const downloadData: DownloadPoint[] = Array.from(
  { length: 26 },
  (_, week) =>
    PACKAGES.map((packageName, packageIndex) => {
      const trend = 1 + week * (0.026 + packageIndex * 0.004)
      const seasonality =
        1 + Math.sin((week + packageIndex * 1.7) / 2.6) * 0.075
      const releaseLift =
        week >= 12 + packageIndex * 2 ? 1.08 + packageIndex * 0.025 : 1

      return {
        date: new Date(Date.UTC(2026, 0, 5 + week * 7)),
        package: packageName,
        downloads: Math.round(
          PACKAGE_BASELINES[packageName] * trend * seasonality * releaseLift,
        ),
      }
    }),
).flat()

const PLAN_LATENCY = {
  Free: { baseline: 245, spread: 92 },
  Pro: { baseline: 155, spread: 54 },
  Enterprise: { baseline: 105, spread: 34 },
} as const

export const latencyData: LatencyPoint[] = (
  Object.keys(PLAN_LATENCY) as Array<keyof typeof PLAN_LATENCY>
).flatMap((plan, planIndex) => {
  const { baseline, spread } = PLAN_LATENCY[plan]
  return Array.from({ length: 96 }, (_, index) => {
    const wave =
      Math.sin(index * 1.91 + planIndex) * 0.52 +
      Math.sin(index * 0.47 + planIndex * 2) * 0.31 +
      Math.cos(index * 0.13) * 0.17
    const outlier = index % (31 - planIndex * 3) === 0 ? spread * 1.8 : 0
    return {
      id: `${plan}-${index}`,
      plan,
      latency: Math.max(20, Math.round(baseline + wave * spread + outlier)),
    }
  })
})
