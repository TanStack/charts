import { createElement } from 'react'
import { SunburstChart } from 'recharts'
import { sunburstData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

function chart(input: ConformanceInput) {
  const radius = Math.min(input.width, input.height) * 0.44

  return createElement(SunburstChart, {
    width: input.width,
    height: input.height,
    data: sunburstData(input.revision),
    cx: input.width / 2,
    cy: input.height / 2,
    innerRadius: radius * 0.14,
    outerRadius: radius,
    startAngle: 0,
    endAngle: 360,
    padding: 2,
    ringPadding: 2,
    stroke: '#ffffff',
    textOptions: { display: 'none' },
  })
}

export const mount = rechartsMount(chart, 'Sunburst hierarchy')
