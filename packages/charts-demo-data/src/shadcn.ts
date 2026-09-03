export type ShadcnChartFamily =
  'area' | 'bar' | 'line' | 'pie' | 'radar' | 'radial' | 'tooltip'

export interface ShadcnCatalogSpec {
  name: string
  family: ShadcnChartFamily
  variant: string
  title: string
  description: string
  footerNote: string
  square: boolean
  legend: boolean
}

export interface ShadcnMonthDatum {
  month: string
  desktop: number
  mobile: number
  tablet: number
}

export interface ShadcnSeriesDatum {
  month: string
  series: 'desktop' | 'mobile' | 'tablet' | 'other'
  value: number
}

export interface ShadcnBrowserDatum {
  browser: string
  visitors: number
}

export interface ShadcnRadarDatum {
  month: string
  desktop: number
  mobile?: number
}

export interface ShadcnActivityDatum {
  date: string
  activity: 'running' | 'swimming'
  value: number
}

export const shadcnMonths: readonly ShadcnMonthDatum[] = [
  { month: 'January', desktop: 186, mobile: 80, tablet: 44 },
  { month: 'February', desktop: 305, mobile: 200, tablet: 72 },
  { month: 'March', desktop: 237, mobile: 120, tablet: 58 },
  { month: 'April', desktop: 73, mobile: 190, tablet: 91 },
  { month: 'May', desktop: 209, mobile: 130, tablet: 67 },
  { month: 'June', desktop: 214, mobile: 140, tablet: 82 },
]

export const shadcnSeriesRows: readonly ShadcnSeriesDatum[] =
  shadcnMonths.flatMap((row) => [
    { month: row.month, series: 'desktop', value: row.desktop },
    { month: row.month, series: 'mobile', value: row.mobile },
    { month: row.month, series: 'tablet', value: row.tablet },
  ])

export const shadcnBrowsers: readonly ShadcnBrowserDatum[] = [
  { browser: 'chrome', visitors: 275 },
  { browser: 'safari', visitors: 200 },
  { browser: 'firefox', visitors: 187 },
  { browser: 'edge', visitors: 173 },
  { browser: 'other', visitors: 90 },
]

export const shadcnRadarDefault: readonly ShadcnRadarDatum[] = [
  { month: 'January', desktop: 186 },
  { month: 'February', desktop: 305 },
  { month: 'March', desktop: 237 },
  { month: 'April', desktop: 273 },
  { month: 'May', desktop: 209 },
  { month: 'June', desktop: 214 },
]

export const shadcnRadarFilled: readonly ShadcnRadarDatum[] = [
  { month: 'January', desktop: 186 },
  { month: 'February', desktop: 285 },
  { month: 'March', desktop: 237 },
  { month: 'April', desktop: 203 },
  { month: 'May', desktop: 209 },
  { month: 'June', desktop: 264 },
]

export const shadcnRadarMultiple: readonly ShadcnRadarDatum[] =
  shadcnMonths.map(({ month, desktop, mobile }) => ({
    month,
    desktop,
    mobile,
  }))

export const shadcnRadarLines: readonly ShadcnRadarDatum[] = [
  { month: 'January', desktop: 186, mobile: 160 },
  { month: 'February', desktop: 185, mobile: 170 },
  { month: 'March', desktop: 207, mobile: 180 },
  { month: 'April', desktop: 173, mobile: 160 },
  { month: 'May', desktop: 160, mobile: 190 },
  { month: 'June', desktop: 174, mobile: 204 },
]

export const shadcnActivities: readonly ShadcnActivityDatum[] = [
  { date: '2024-07-15', activity: 'running', value: 450 },
  { date: '2024-07-15', activity: 'swimming', value: 300 },
  { date: '2024-07-16', activity: 'running', value: 380 },
  { date: '2024-07-16', activity: 'swimming', value: 420 },
  { date: '2024-07-17', activity: 'running', value: 520 },
  { date: '2024-07-17', activity: 'swimming', value: 120 },
  { date: '2024-07-18', activity: 'running', value: 140 },
  { date: '2024-07-18', activity: 'swimming', value: 550 },
  { date: '2024-07-19', activity: 'running', value: 600 },
  { date: '2024-07-19', activity: 'swimming', value: 350 },
  { date: '2024-07-20', activity: 'running', value: 480 },
  { date: '2024-07-20', activity: 'swimming', value: 400 },
]

export const shadcnColors = [
  'var(--chart-1, var(--ts-chart-1))',
  'var(--chart-2, var(--ts-chart-2))',
  'var(--chart-3, var(--ts-chart-3))',
  'var(--chart-4, var(--ts-chart-4))',
  'var(--chart-5, var(--ts-chart-5))',
] as const

const titleOverrides: Record<string, string> = {
  'chart-area-default': 'Area Chart',
  'chart-area-stacked-expand': 'Area Chart - Stacked Expanded',
  'chart-bar-default': 'Bar Chart',
  'chart-bar-label-custom': 'Bar Chart - Custom Label',
  'chart-bar-stacked': 'Bar Chart - Stacked + Legend',
  'chart-line-default': 'Line Chart',
  'chart-line-dots-custom': 'Line Chart - Custom Dots',
  'chart-line-label-custom': 'Line Chart - Custom Label',
  'chart-pie-simple': 'Pie Chart',
  'chart-pie-donut-text': 'Pie Chart - Donut with Text',
  'chart-pie-label-custom': 'Pie Chart - Custom Label',
  'chart-radar-default': 'Radar Chart',
  'chart-radar-grid-circle-fill': 'Radar Chart - Grid Circle Filled',
  'chart-radar-grid-circle-no-lines': 'Radar Chart - Grid Circle - No lines',
  'chart-radar-grid-fill': 'Radar Chart - Grid Filled',
  'chart-radar-label-custom': 'Radar Chart - Custom Label',
  'chart-radar-radius': 'Radar Chart - Radius Axis',
  'chart-radial-simple': 'Radial Chart',
  'chart-tooltip-indicator-line': 'Tooltip - Line Indicator',
  'chart-tooltip-indicator-none': 'Tooltip - No Indicator',
  'chart-tooltip-label-custom': 'Tooltip - Custom label',
  'chart-tooltip-label-none': 'Tooltip - No Label',
}

export function getShadcnCatalogSpec(name: string): ShadcnCatalogSpec {
  const parts = name.split('-')
  const family = parts[1]
  if (!isShadcnFamily(family)) {
    throw new TypeError(`Unknown shadcn chart family in ${name}`)
  }
  const variant = parts.slice(2).join('-')
  const title =
    titleOverrides[name] ??
    `${family === 'tooltip' ? 'Tooltip' : `${titleCase(family)} Chart`} - ${variant.split('-').map(titleCase).join(' ')}`
  return {
    name,
    family,
    variant,
    title,
    description:
      (family === 'area' || family === 'bar' || family === 'line') &&
      variant === 'interactive'
        ? 'Showing total visitors for the last 3 months'
        : family === 'area' || family === 'radar'
          ? 'Showing total visitors for the last 6 months'
          : family === 'tooltip'
            ? tooltipDescription(variant)
            : 'January - June 2024',
    footerNote:
      family === 'area' || family === 'radar'
        ? 'January - June 2024'
        : 'Showing total visitors for the last 6 months',
    square: family === 'pie' || family === 'radar' || family === 'radial',
    legend:
      variant.includes('legend') ||
      variant === 'icons' ||
      (variant === 'stacked' && family === 'bar') ||
      (family === 'area' && variant === 'interactive'),
  }
}

function tooltipDescription(variant: string): string {
  if (variant === 'advanced') return 'Tooltip with custom formatter and total.'
  if (variant === 'default') return 'Default tooltip with ChartTooltipContent.'
  if (variant === 'formatter') return 'Tooltip with custom formatter.'
  if (variant === 'icons') return 'Tooltip with icons.'
  if (variant === 'indicator-line') return 'Tooltip with line indicator.'
  if (variant === 'indicator-none') return 'Tooltip with no indicator.'
  if (variant === 'label-custom')
    return 'Tooltip with custom label from chartConfig.'
  if (variant === 'label-formatter') return 'Tooltip with label formatter.'
  if (variant === 'label-none') return 'Tooltip with no label.'
  return 'A chart tooltip.'
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function isShadcnFamily(value: string | undefined): value is ShadcnChartFamily {
  return (
    value === 'area' ||
    value === 'bar' ||
    value === 'line' ||
    value === 'pie' ||
    value === 'radar' ||
    value === 'radial' ||
    value === 'tooltip'
  )
}
