import { createElement } from 'react'
import { SunburstChart } from 'recharts'
import { flare } from '@charts-poc/demo-data/flare'
import { selectSunburstData } from './selection'
import { sunburstTree } from './transform'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'
import type { SunburstTreeNode } from './transform'

const colors = ['#7c3aed', '#0ea5e9', '#14b8a6']

function coloredSunburstData(revision: number): SunburstTreeNode {
  const root = sunburstTree(selectSunburstData(flare, revision))
  return {
    ...root,
    children: root.children?.map((child, index) => ({
      ...child,
      fill: colors[index],
    })),
  }
}

function chart(input: ConformanceInput) {
  const radius = Math.min(input.width, input.height) * 0.44

  return createElement(SunburstChart, {
    width: input.width,
    height: input.height,
    data: coloredSunburstData(input.revision),
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

export const mount = rechartsMount(chart, 'Flare analytics sunburst')
