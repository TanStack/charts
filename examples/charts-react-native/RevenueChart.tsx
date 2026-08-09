import * as React from 'react'
import { SafeAreaView, Text, View } from 'react-native'
import { scaleLinear } from 'd3-scale'
import type { ChartDefinition } from '@tanstack/charts/types'
import { Chart } from '@tanstack/charts/react-native'
import { tooltip } from '@tanstack/charts/react-native/tooltip'

const data = [
  { month: 1, revenue: 12 },
  { month: 2, revenue: 18 },
  { month: 3, revenue: 15 },
  { month: 4, revenue: 26 },
  { month: 5, revenue: 31 },
]

type RevenueDefinition = ChartDefinition<(typeof data)[number], number, number>
type DefineChart = typeof import('@tanstack/charts/scene').defineChart
type LineY = typeof import('@tanstack/charts/line').lineY

export function createRevenueDefinition(
  define: DefineChart,
  line: LineY,
): RevenueDefinition {
  return define({
    marks: [
      line(data, {
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
    focus: 'nearest-x',
    tooltip: { use: tooltip, sticky: true },
  })
}

export function RevenueChart({
  definition,
}: {
  definition: RevenueDefinition
}) {
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
