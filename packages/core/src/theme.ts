import type {
  ChartEnvironment,
  ChartThemeInput,
  ChartThemeTokens,
  ResolvedChartTheme,
} from './types'

const LIGHT_THEME: ChartThemeTokens = {
  background: 'transparent',
  foreground: '#18181b',
  muted: '#71717a',
  grid: '#e4e4e7',
  axis: '#71717a',
  tooltipBackground: '#ffffff',
  tooltipForeground: '#18181b',
  focus: '#2563eb',
  selection: '#dbeafe',
  positive: '#15803d',
  negative: '#b91c1c',
  warning: '#b45309',
  neutral: '#71717a',
  categorical: [
    '#2563eb',
    '#7c3aed',
    '#0891b2',
    '#16a34a',
    '#d97706',
    '#db2777',
    '#4f46e5',
    '#0f766e',
  ],
}

const DARK_THEME: ChartThemeTokens = {
  background: 'transparent',
  foreground: '#fafafa',
  muted: '#a1a1aa',
  grid: '#3f3f46',
  axis: '#a1a1aa',
  tooltipBackground: '#18181b',
  tooltipForeground: '#fafafa',
  focus: '#60a5fa',
  selection: '#172554',
  positive: '#4ade80',
  negative: '#f87171',
  warning: '#fbbf24',
  neutral: '#a1a1aa',
  categorical: [
    '#60a5fa',
    '#a78bfa',
    '#22d3ee',
    '#4ade80',
    '#fbbf24',
    '#f472b6',
    '#818cf8',
    '#2dd4bf',
  ],
}

const TOKEN_PROPERTIES = {
  background: '--ts-plot-background',
  foreground: '--ts-plot-foreground',
  muted: '--ts-plot-muted',
  grid: '--ts-plot-grid',
  axis: '--ts-plot-axis',
  tooltipBackground: '--ts-plot-tooltip-background',
  tooltipForeground: '--ts-plot-tooltip-foreground',
  focus: '--ts-plot-focus',
  selection: '--ts-plot-selection',
  positive: '--ts-plot-positive',
  negative: '--ts-plot-negative',
  warning: '--ts-plot-warning',
  neutral: '--ts-plot-neutral',
} as const

export function resolveChartTheme(
  container: HTMLElement,
  input: ChartThemeInput | undefined,
  environment: Required<
    Pick<ChartEnvironment, 'getComputedStyle' | 'matchMedia'>
  >,
): ResolvedChartTheme {
  const mode = resolveMode(
    container,
    input,
    environment.getComputedStyle,
    environment.matchMedia,
  )

  if (container.dataset.tsPlotResolvedTheme !== mode) {
    container.dataset.tsPlotResolvedTheme = mode
  }

  const computed = environment.getComputedStyle(container)
  const fallback = mode === 'dark' ? DARK_THEME : LIGHT_THEME
  const custom = typeof input === 'object' ? input.tokens : undefined
  const resolved = {} as Record<keyof typeof TOKEN_PROPERTIES, string>

  for (const [key, property] of Object.entries(TOKEN_PROPERTIES) as Array<
    [keyof typeof TOKEN_PROPERTIES, string]
  >) {
    resolved[key] =
      custom?.[key] ??
      computed.getPropertyValue(property).trim() ??
      fallback[key]
    if (resolved[key] === '') resolved[key] = fallback[key]
  }

  const categorical = Array.from({ length: 8 }, (_, index) => {
    const customColor = custom?.categorical?.[index]
    const computedColor = computed
      .getPropertyValue(`--ts-plot-categorical-${index + 1}`)
      .trim()
    return customColor || computedColor || fallback.categorical[index]
  })

  return {
    mode,
    ...resolved,
    categorical,
  }
}

export function chartThemeSignature(theme: ResolvedChartTheme): string {
  return [
    theme.mode,
    theme.background,
    theme.foreground,
    theme.muted,
    theme.grid,
    theme.axis,
    theme.tooltipBackground,
    theme.tooltipForeground,
    theme.focus,
    theme.selection,
    theme.positive,
    theme.negative,
    theme.warning,
    theme.neutral,
    ...theme.categorical,
  ].join('\u0000')
}

function resolveMode(
  container: HTMLElement,
  input: ChartThemeInput | undefined,
  getComputedStyle: (element: Element) => CSSStyleDeclaration,
  matchMedia: (query: string) => MediaQueryList,
): 'light' | 'dark' {
  const requested = typeof input === 'object' ? input.mode : input
  if (requested === 'light' || requested === 'dark') return requested

  let current: HTMLElement | null = container
  while (current) {
    const dataTheme = current.dataset.theme
    if (dataTheme === 'light' || dataTheme === 'dark') return dataTheme
    if (current.classList.contains('dark')) return 'dark'
    current = current.parentElement
  }

  const colorSchemes = getComputedStyle(container)
    .colorScheme.split(/\s+/)
    .filter((value) => value !== '' && value !== 'only')
  if (colorSchemes.length === 1 && colorSchemes[0] === 'dark') return 'dark'
  if (colorSchemes.length === 1 && colorSchemes[0] === 'light') return 'light'

  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
