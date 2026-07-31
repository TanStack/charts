import * as React from 'react'
import { SafeAreaView, Text, View } from 'react-native'
import { scaleLinear } from 'd3-scale'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import { Chart } from '@tanstack/react-native-charts'
import { tooltip } from '@tanstack/react-native-charts/tooltip'

const data = [
  { month: 1, revenue: 12 },
  { month: 2, revenue: 18 },
  { month: 3, revenue: 15 },
  { month: 4, revenue: 26 },
  { month: 5, revenue: 31 },
]

const definition = defineChart(
  {
    marks: [
      lineY(data, {
        x: 'month',
        y: 'revenue',
        stroke: 'var(--revenue, #2563eb)',
        strokeWidth: 3,
        points: true,
      }),
    ],
    x: {
      label: 'Month',
      scale: scaleLinear().domain([1, 5]),
    },
    y: {
      label: 'Revenue',
      grid: true,
      scale: scaleLinear().domain([0, 35]),
    },
  },
  {
    focus: 'nearest-x',
    tooltip: { use: tooltip, sticky: true },
  },
)

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Chart
          definition={definition}
          accessibilityLabel="Monthly revenue"
          accessibilityHint="Swipe up or down to inspect points. Activate to pin the tooltip."
          aspectRatio={1.5}
          renderTooltip={({ defaultBody, pinned }) => (
            <View>
              {defaultBody}
              {pinned ? (
                <Text style={{ marginTop: 4, fontSize: 11, color: '#4b5563' }}>
                  Pinned
                </Text>
              ) : null}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}
