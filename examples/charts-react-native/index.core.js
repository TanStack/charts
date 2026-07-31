import * as React from 'react'
import { AppRegistry, View } from 'react-native'
import { scaleLinear } from 'd3-scale'
import { lineY } from '@tanstack/charts/line'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { defineChart } from '@tanstack/charts/scene'
import { name as appName } from './app.json'

const definition = defineChart({
  marks: [lineY([4, 9, 7])],
  x: { scale: scaleLinear().domain([0, 2]) },
  y: { scale: scaleLinear().domain([0, 10]) },
})
const runtime = createChartRuntime()
const scene = runtime.render(definition, { width: 320, height: 240 })

function CoreApp() {
  return React.createElement(View, {
    accessibilityLabel: `${scene.points.length} chart points`,
  })
}

AppRegistry.registerComponent(appName, () => CoreApp)
