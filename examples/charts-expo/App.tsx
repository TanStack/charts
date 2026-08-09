import * as React from 'react'
import { SafeAreaView, View } from 'react-native'
import { scaleLinear } from 'd3-scale'
import { defineChart, lineY } from '@tanstack/charts/universal'
import { Chart } from '@tanstack/charts/react-native'
import { tooltip } from '@tanstack/charts/react-native/tooltip'

const rows = [
  { month: 1, revenue: 12 },
  { month: 2, revenue: 18 },
  { month: 3, revenue: 15 },
  { month: 4, revenue: 26 },
  { month: 5, revenue: 31 },
]

const definition = defineChart({
  marks: [
    lineY(rows, {
      x: 'month',
      y: 'revenue',
      stroke: '#2563eb',
      strokeWidth: 3,
      points: true,
    }),
  ],
  x: { label: 'Month', scale: scaleLinear().domain([1, 5]) },
  y: { label: 'Revenue', scale: scaleLinear().domain([0, 35]) },
  focus: 'nearest-x',
  tooltip: { use: tooltip, sticky: true },
})

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Chart
          definition={definition}
          accessibilityLabel="Monthly revenue"
          aspectRatio={1.5}
        />
      </View>
    </SafeAreaView>
  )
}
