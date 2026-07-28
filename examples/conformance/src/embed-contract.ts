export const chartEmbedContract = {
  protocol: {
    type: 'tanstack-charts:embed',
    version: 1,
    statuses: ['ready', 'resize', 'error'],
    commands: ['set-theme'],
  },
  parameters: {
    theme: {
      values: ['system', 'light', 'dark'],
      default: 'system',
    },
    height: {
      minimum: 120,
      maximum: 1_200,
      default: 360,
    },
    revision: {
      minimum: 0,
      maximum: 10_000,
      default: 0,
    },
  },
} as const

export type ChartEmbedTheme =
  (typeof chartEmbedContract.parameters.theme.values)[number]

export type ChartEmbedStatus =
  (typeof chartEmbedContract.protocol.statuses)[number]

export interface ChartEmbedStatusMessage {
  type: typeof chartEmbedContract.protocol.type
  version: typeof chartEmbedContract.protocol.version
  status: ChartEmbedStatus
  caseId: string
  height: number
}

export interface ChartEmbedThemeCommand {
  type: typeof chartEmbedContract.protocol.type
  version: typeof chartEmbedContract.protocol.version
  command: 'set-theme'
  caseId: string
  theme: ChartEmbedTheme
}

export function parseChartEmbedTheme(value: string | null): ChartEmbedTheme {
  return isChartEmbedTheme(value)
    ? value
    : chartEmbedContract.parameters.theme.default
}

export function parseChartEmbedHeight(value: string | null): number {
  const {
    default: fallback,
    minimum,
    maximum,
  } = chartEmbedContract.parameters.height
  return boundedInteger(value, fallback, minimum, maximum)
}

export function parseChartEmbedRevision(value: string | null): number {
  const {
    default: fallback,
    minimum,
    maximum,
  } = chartEmbedContract.parameters.revision
  return boundedInteger(value, fallback, minimum, maximum)
}

export function resolveChartEmbedParentOrigin(referrer: string): string | null {
  if (!referrer) return null

  try {
    const url = new URL(referrer)
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      url.username ||
      url.password
    ) {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

export function createChartEmbedStatusMessage(
  status: ChartEmbedStatus,
  caseId: string,
  height: number,
): ChartEmbedStatusMessage {
  return {
    type: chartEmbedContract.protocol.type,
    version: chartEmbedContract.protocol.version,
    status,
    caseId,
    height,
  }
}

export function isChartEmbedThemeCommand(
  value: unknown,
  caseId: string,
): value is ChartEmbedThemeCommand {
  if (typeof value !== 'object' || value === null) return false
  const command = value as Partial<ChartEmbedThemeCommand>
  return (
    command.type === chartEmbedContract.protocol.type &&
    command.version === chartEmbedContract.protocol.version &&
    command.command === 'set-theme' &&
    command.caseId === caseId &&
    isChartEmbedTheme(command.theme)
  )
}

export function readTrustedChartEmbedThemeCommand(
  event: Pick<MessageEvent, 'data' | 'origin' | 'source'>,
  expectedSource: MessageEventSource,
  expectedOrigin: string | null,
  caseId: string,
): ChartEmbedThemeCommand | null {
  return expectedOrigin &&
    event.source === expectedSource &&
    event.origin === expectedOrigin &&
    isChartEmbedThemeCommand(event.data, caseId)
    ? event.data
    : null
}

function isChartEmbedTheme(value: unknown): value is ChartEmbedTheme {
  return chartEmbedContract.parameters.theme.values.some(
    (theme) => theme === value,
  )
}

function boundedInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === null || value.trim() === '') return fallback
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(number)))
}
