import * as React from 'react'
import { lineY } from '@tanstack/charts/line'
import { defineChart } from '@tanstack/charts/scene'
import { createRevenueDefinition, RevenueChart } from './RevenueChart'

const definition = createRevenueDefinition(defineChart, lineY)

export default function GranularApp() {
  return <RevenueChart definition={definition} />
}
