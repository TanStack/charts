export type TimeRange = '24h' | '7d' | '30d'
export type Severity = 'Fatal' | 'Error' | 'Warning'

export interface ErrorStackPoint {
  id: string
  date: Date
  severity: Severity
  value: number
  y1: number
  y2: number
}

export interface ErrorTotalPoint {
  id: string
  date: Date
  value: number
}

export interface ReleasePoint {
  id: string
  date: Date
  label: string
  value: number
}

export interface SparkPoint {
  id: string
  date: Date
  value: number
}

export interface HeatCell {
  id: string
  day: string
  hour: string
  value: number
}

export interface ServiceRow {
  id: string
  service: string
  value: number
  target: number
}

export interface ImpactPoint {
  id: string
  issue: string
  events: number
  users: number
  severity: Severity
  volume: number
}

export interface SeverityStackPoint {
  id: string
  service: string
  severity: Severity
  value: number
  y1: number
  y2: number
}

export interface TriageCell {
  id: string
  column: number
  row: number
  status: 'Resolved' | 'Muted' | 'Open'
}

export interface DashboardData {
  errorStack: readonly ErrorStackPoint[]
  errorTotals: readonly ErrorTotalPoint[]
  releases: readonly ReleasePoint[]
  sparks: readonly (readonly SparkPoint[])[]
  heatmap: readonly HeatCell[]
  services: readonly ServiceRow[]
  impact: readonly ImpactPoint[]
  severityStack: readonly SeverityStackPoint[]
  triage: readonly TriageCell[]
  totalErrors: number
  impactedUsers: number
  crashFree: number
  p95: number
  budget: number
}

export const severities = ['Fatal', 'Error', 'Warning'] as const
export const severityColors: Record<Severity, string> = {
  Fatal: '#ff4f57',
  Error: '#ff7a59',
  Warning: '#f2c66d',
}

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const hourNames = ['00', '03', '06', '09', '12', '15', '18', '21'] as const
const serviceNames = ['API', 'Web', 'Worker', 'Auth', 'Billing'] as const

export function createDashboardData(
  range: TimeRange,
  revision = 0,
): DashboardData {
  const rangeConfig = {
    '24h': { points: 32, step: 45 * 60 * 1_000, multiplier: 1 },
    '7d': { points: 36, step: 4.5 * 60 * 60 * 1_000, multiplier: 5.8 },
    '30d': { points: 40, step: 18 * 60 * 60 * 1_000, multiplier: 19.4 },
  }[range]
  const end = Date.UTC(2026, 6, 28, 18)
  const start = end - (rangeConfig.points - 1) * rangeConfig.step
  const errorStack: ErrorStackPoint[] = []
  const errorTotals: ErrorTotalPoint[] = []

  for (let index = 0; index < rangeConfig.points; index++) {
    const date = new Date(start + index * rangeConfig.step)
    const pulse =
      index === 22 + (revision % 3) ||
      index === 23 + (revision % 3) ||
      index === rangeConfig.points - 4
        ? 2.2
        : 1
    const values = [
      Math.max(
        2,
        Math.round(
          (8 +
            Math.sin(index * 0.72 + revision * 0.6) * 3 +
            (index % 9 === 0 ? 5 : 0)) *
            pulse *
            rangeConfig.multiplier,
        ),
      ),
      Math.max(
        4,
        Math.round(
          (18 + Math.sin(index * 0.39 + 1.3) * 7 + Math.cos(index * 0.14) * 4) *
            pulse *
            rangeConfig.multiplier,
        ),
      ),
      Math.max(
        6,
        Math.round(
          (26 +
            Math.cos(index * 0.31 + revision * 0.3) * 8 +
            Math.sin(index * 0.18) * 5) *
            pulse *
            rangeConfig.multiplier,
        ),
      ),
    ]
    let baseline = 0
    severities.forEach((severity, severityIndex) => {
      const value = values[severityIndex] ?? 0
      errorStack.push({
        id: `${severity}:${date.toISOString()}`,
        date,
        severity,
        value,
        y1: baseline,
        y2: baseline + value,
      })
      baseline += value
    })
    errorTotals.push({
      id: `total:${date.toISOString()}`,
      date,
      value: baseline,
    })
  }

  const maximum = Math.max(...errorTotals.map((row) => row.value))
  const releases = [
    {
      id: 'release-1',
      date:
        errorTotals[Math.floor(errorTotals.length * 0.37)]?.date ?? new Date(),
      label: 'v4.12',
      value: maximum * 0.88,
    },
    {
      id: 'release-2',
      date:
        errorTotals[Math.floor(errorTotals.length * 0.73)]?.date ?? new Date(),
      label: 'v4.13',
      value: maximum * 0.88,
    },
  ]

  const sparkSeeds = [
    { base: 52, drift: 1.7, wave: 8 },
    { base: 46, drift: -0.7, wave: 7 },
    { base: 82, drift: 0.25, wave: 3 },
    { base: 58, drift: 1.1, wave: 10 },
  ]
  const sparks = sparkSeeds.map((seed, sparkIndex) =>
    Array.from({ length: 18 }, (_, index) => ({
      id: `${sparkIndex}:${index}`,
      date: new Date(end - (17 - index) * 60 * 60 * 1_000),
      value:
        seed.base +
        index * seed.drift +
        Math.sin(index * 0.68 + sparkIndex + revision * 0.35) * seed.wave +
        (index === 13 + (revision % 2) && sparkIndex !== 2 ? 12 : 0),
    })),
  )

  const heatmap = dayNames.flatMap((day, dayIndex) =>
    hourNames.map((hour, hourIndex) => {
      const rush =
        hourIndex >= 3 && hourIndex <= 6 ? 24 : hourIndex === 0 ? -10 : 0
      const weekday = dayIndex < 5 ? 17 : -8
      const deploy =
        (dayIndex === 1 && hourIndex === 5) ||
        (dayIndex === 3 && hourIndex === 6)
          ? 46
          : 0
      return {
        id: `${day}:${hour}`,
        day,
        hour,
        value: clamp(
          Math.round(
            22 +
              rush +
              weekday +
              deploy +
              Math.sin(dayIndex * 1.8 + hourIndex + revision * 0.4) * 12,
          ),
          3,
          100,
        ),
      }
    }),
  )

  const services = serviceNames.map((service, index) => ({
    id: service,
    service,
    value: clamp(
      Math.round(
        84 -
          index * 9 +
          Math.sin(index * 1.2 + revision * 0.5) * 7 +
          (index === 0 ? 8 : 0),
      ),
      18,
      98,
    ),
    target: 72 - index * 2,
  }))

  const issueNames = [
    'Checkout timeout',
    'Null session',
    'Edge 502',
    'Hydration mismatch',
    'Token expired',
    'Queue stalled',
    'Card declined',
    'Missing chunk',
    'Rate limited',
    'Webhook retry',
    'Cache miss',
    'Socket closed',
    'Bad redirect',
    'Search timeout',
  ]
  const impact = issueNames.map((issue, index): ImpactPoint => {
    const severity = severities[index % severities.length] ?? 'Error'
    return {
      id: `issue-${index}`,
      issue,
      events: clamp(
        Math.round(
          12 + ((index * 17) % 78) + Math.sin(index + revision * 0.7) * 8,
        ),
        4,
        98,
      ),
      users: clamp(
        Math.round(
          10 + ((index * 29) % 74) + Math.cos(index * 0.7 + revision * 0.5) * 9,
        ),
        5,
        96,
      ),
      severity,
      volume: 20 + ((index * 31 + revision * 7) % 130),
    }
  })

  const severityStack: SeverityStackPoint[] = []
  serviceNames.forEach((service, serviceIndex) => {
    let baseline = 0
    severities.forEach((severity, severityIndex) => {
      const value = Math.round(
        (6 + ((serviceIndex * 13 + severityIndex * 17 + revision * 3) % 26)) *
          (severityIndex === 1 ? 1.4 : 1),
      )
      severityStack.push({
        id: `${service}:${severity}`,
        service,
        severity,
        value,
        y1: baseline,
        y2: baseline + value,
      })
      baseline += value
    })
  })

  const triage: TriageCell[] = Array.from({ length: 100 }, (_, index) => ({
    id: `triage-${index}`,
    column: index % 20,
    row: 4 - Math.floor(index / 20),
    status: index < 71 ? 'Resolved' : index < 84 ? 'Muted' : 'Open',
  }))

  const lastTotal = errorTotals.at(-1)?.value ?? 0
  const scale = range === '24h' ? 1 : range === '7d' ? 4.8 : 16.2

  return {
    errorStack,
    errorTotals,
    releases,
    sparks,
    heatmap,
    services,
    impact,
    severityStack,
    triage,
    totalErrors: Math.round((1_284 + revision * 11) * scale),
    impactedUsers: Math.round((892 + revision * 7) * Math.sqrt(scale)),
    crashFree: 99.82 - (revision % 3) * 0.01,
    p95: 384 + revision * 4 + Math.round(lastTotal / 18),
    budget: clamp(72 - revision * 1.5 + Math.sin(revision) * 2, 42, 88),
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
