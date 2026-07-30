import { defineChart } from '@tanstack/charts'
import { geoShape } from '@tanstack/charts/geo'
import {
  equalEarthProjection,
  worldCollection,
} from '../102-world-choropleth/geo-data'
import { routePlaces, worldRoutes } from './data'
import { tanstackMount } from '../../shared/mount'
import type { ConformanceInput } from '../../types'

const definition = (input: ConformanceInput) =>
  defineChart(() => ({
    marks: [
      geoShape([worldCollection(input.revision)], {
        projection: ({ chart }) => equalEarthProjection(chart),
        fill: '#e2e8f0',
        stroke: '#ffffff',
        strokeWidth: 0.75,
      }),
      geoShape(worldRoutes(input.revision), {
        key: (feature) => feature.properties.id,
        projection: ({ chart }) => equalEarthProjection(chart),
        fill: 'none',
        stroke: (feature) => feature.properties.stroke,
        strokeWidth: 2,
        strokeOpacity: 0.9,
      }),
      geoShape(routePlaces(input.revision), {
        key: (feature) => feature.properties.id,
        projection: ({ chart }) => equalEarthProjection(chart),
        r: 3.5,
        fill: (feature) => feature.properties.fill,
        stroke: '#ffffff',
        strokeWidth: 1,
      }),
    ],
    x: null,
    y: null,
    guides: false,
    margin: 10,
  }))

export const mount = tanstackMount(definition, 'Great-circle route map')
