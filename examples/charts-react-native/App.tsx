import * as React from 'react'
import { defineChart, lineY } from '@tanstack/charts/universal'
import { createRevenueDefinition, RevenueChart } from './RevenueChart'

const definition = createRevenueDefinition(defineChart, lineY)

export default function App() {
  return <RevenueChart definition={definition} />
}
