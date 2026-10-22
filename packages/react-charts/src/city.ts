'use client'

import * as runtime from './city/index.js'
import { CityMap as CityMapImplementation } from './city/map.jsx'
import { CityChart as CityChartImplementation } from './city/react.jsx'
import { EnvironmentControls as EnvironmentControlsImplementation } from './city/environment-controls.jsx'
import type * as Contract from './city/types'

export const defineCityChart: typeof Contract.defineCityChart =
  runtime.defineCityChart
export const cityMark: typeof Contract.cityMark = runtime.cityMark
export const cityFocus: typeof Contract.cityFocus = runtime.cityFocus
export const createCityRenderer: typeof Contract.createCityRenderer =
  runtime.createCityRenderer
export const CityMap: typeof Contract.CityMap = CityMapImplementation
export const CityChart: typeof Contract.CityChart = CityChartImplementation
export const EnvironmentControls: typeof Contract.EnvironmentControls =
  EnvironmentControlsImplementation
export type {
  CityDatum,
  CityLayout,
  CityDefinitionOptions,
  CityEngine,
  CityRendererOptions,
  CityView,
  CityWeather,
  CityLighting,
  CityStats,
  CityChartHandle,
  CityMapProps,
  CityChartProps,
  CityChartState,
  EnvironmentControlsProps,
} from './city/types'
