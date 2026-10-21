import type {
  DomChartDefinition as ChartDefinition,
  ChartDefinitionOptions,
  ChartFocusStrategy,
  ChartMark,
  ChartRenderer,
  ChartSpec,
} from '@tanstack/charts'

export interface CityDatum {
  id: string | number
  name: string
  metric: { label: string; value: number }
  categories?: readonly { label: string; value: string }[]
  status: 'healthy' | 'warning' | 'critical'
  /** Last record update, ISO 8601 with timezone. */
  updatedAt?: string
  /** When the current status began, ISO 8601 with timezone. */
  statusChangedAt?: string
  mask?: 1 | 2 | 3 | 4 | 5 | 6 | 7
}
export type CityView = 'iso' | 'top'
export type CityWeather = 'none' | 'rain' | 'snow'
export type CityLighting = 'auto' | 'day' | 'twilight' | 'night'
export interface CityLayout<T extends CityDatum = CityDatum> {
  companies: (T & {
    x: number
    z: number
    col: number
    row: number
    mask: number
  })[]
  roadBounds: { x1: number; x2: number; z1: number; z2: number }
  bounds: Record<string, { x1: number; x2: number; z1: number; z2: number }>
  anchors: Record<number, [number, number, number]>
  center: [number, number]
}
export type CityDefinitionOptions<T extends CityDatum = CityDatum> =
  ChartDefinitionOptions<T, number, number> &
    Omit<Partial<ChartSpec>, 'marks'> & { layout?: CityLayout<T> }
export declare function defineCityChart<T extends CityDatum>(
  data: readonly T[],
  options?: CityDefinitionOptions<T>,
): ChartDefinition<T, number, number>
export declare function cityMark<T extends CityDatum>(
  data: readonly T[],
  options?: { id?: string; layout?: CityLayout<T> },
): ChartMark<T, number, number>
export declare const cityFocus: {
  resolve<TDatum>(
    points: readonly ChartPoint<TDatum, number, number>[],
    context: Parameters<
      ChartFocusStrategy<TDatum, number, number>['resolve']
    >[1],
  ): readonly ChartPoint<TDatum, number, number>[]
  group<TDatum>(
    points: readonly ChartPoint<TDatum, number, number>[],
    context: Parameters<ChartFocusStrategy<TDatum, number, number>['group']>[1],
  ): readonly ChartPoint<TDatum, number, number>[]
  navigation<TDatum>(
    points: readonly ChartPoint<TDatum, number, number>[],
  ): readonly ChartPoint<TDatum, number, number>[]
}
export interface CityEngine<T extends CityDatum = CityDatum> {
  setActivity(options: { life?: boolean; effects?: boolean }): void
  setAutoRotate(enabled: boolean): void
  setLightingMode(mode: CityLighting): void
  setWeather(weather: CityWeather): void
  view(view: CityView, immediate?: boolean): void
  zoom(factor: number): void
  select(company: T | null): void
  focus(company: T, options?: { maxZoom?: boolean }): void
  companies: T[]
  companiesById: Map<T['id'], T>
  layout: CityLayout<T>
  dispose(): void
}
export interface CityRendererOptions<T extends CityDatum = CityDatum> {
  autoRotate?: boolean
  view?: CityView
  life?: boolean
  effects?: boolean
  onMount?: (city: CityEngine<T>) => void
  onData?: (city: CityEngine<T>, options: { resetView: boolean }) => void
  onDestroy?: (city: CityEngine<T>) => void
  onError?: (error: Error) => void
  hover?: (company: T | null, context?: { event?: PointerEvent }) => void
  projection?: (city: CityEngine<T>) => void
  frame?: (city: CityEngine<T>) => void
}
export declare function createCityRenderer<T extends CityDatum = CityDatum>(
  options?: CityRendererOptions<T>,
): ChartRenderer<T, number, number>

import type { JSX, ReactNode, Ref } from 'react'
import type { ChartPoint } from '@tanstack/charts'

export interface CityStats {
  drawCalls: number
  triangles: number
  chartRenderer: 'atlas-city-3d'
  chartPoints: number
  lightingMode?: CityLighting
  lightingPeriod?: 'day' | 'twilight' | 'night'
  weather?: CityWeather
  weatherVisible: boolean
}
export interface CityChartHandle<T extends CityDatum = CityDatum> {
  zoom(factor: number): void
  view(view: CityView): void
  select(datum: T, options?: { focus?: boolean; maxZoom?: boolean }): void
  deselect(): void
  cancel(): void
  capture(): void
  play(direction: number): Promise<void> | undefined
  scrollIntoView(): void
  stats(): CityStats | undefined
}
export interface CityMapProps<T extends CityDatum = CityDatum> {
  data: readonly T[]
  ref?: Ref<CityChartHandle<T>>
  className?: string
  /** "default" applies default CSS variables; null uses only the host theme. */
  theme?: 'default' | null
  title?: string
  ariaLabel?: string
  busy?: boolean
  view?: CityView
  onViewChange?: (view: CityView) => void
  life?: boolean
  onLifeChange?: (enabled: boolean) => void
  effects?: boolean
  onEffectsChange?: (enabled: boolean) => void
  autoRotate?: boolean
  onAutoRotateChange?: (enabled: boolean) => void
  showDistrictLabels?: boolean
  onDistrictLabelsChange?: (enabled: boolean) => void
  lightingMode?: CityLighting
  weather?: CityWeather
  showControls?: boolean
  showEnvironmentControls?: boolean
  showSearch?: boolean
  showDetails?: boolean
  showMonitor?: boolean
  showCompass?: boolean
  showInstructions?: boolean
  onSelect?: (datum: T | null) => void
  onFocusChange?: (point: ChartPoint<T, number, number> | null) => void
  children?: ReactNode
}
export declare function CityMap<T extends CityDatum>(
  props: CityMapProps<T>,
): JSX.Element
export interface CityChartState {
  ready: boolean
  error: string | null
  environmentControls: ReactNode
  weatherMode: 'auto' | CityWeather
}
export interface CityChartProps<T extends CityDatum = CityDatum> {
  autoRotate?: boolean
  definition: ChartDefinition<T, number, number>
  chartRef?: Ref<CityChartHandle<T>>
  id?: string
  viewportId?: string
  className?: string
  theme?: 'default' | null
  ariaLabel?: string
  view?: CityView
  life?: boolean
  effects?: boolean
  lightingMode?: CityLighting
  weather?: CityWeather
  showEnvironmentControls?: boolean
  showDistrictLabels?: boolean
  region?: 'all' | number
  busy?: boolean
  selected?: T | null
  onSelect?: (point: ChartPoint<T, number, number> | null) => void
  onFocusChange?: (point: ChartPoint<T, number, number> | null) => void
  children?: ReactNode | ((state: CityChartState) => ReactNode)
}
export declare function CityChart<T extends CityDatum>(
  props: CityChartProps<T>,
): JSX.Element
export interface EnvironmentControlsProps {
  lighting: CityLighting
  weather: 'auto' | CityWeather
  onLightingChange: (mode: CityLighting) => void
  onWeatherChange: (weather: 'auto' | CityWeather) => void
  disabled?: boolean
}
export declare function EnvironmentControls(
  props: EnvironmentControlsProps,
): JSX.Element
