import { createElement } from 'react'
import { Cell, PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { radialBarData } from './data'
import { rechartsMount } from '../../shared/recharts-mount'
import type { ConformanceInput } from '../../types'

const innerRadiusRatio = 0.2
const barRatio = 0.62

function chart(input: ConformanceInput) {
  const data = radialBarData(input.revision)
  const radius = Math.min(input.width, input.height) * 0.42
  const innerRadius = radius * innerRadiusRatio
  const band = (radius - innerRadius) / data.length
  const barSize = band * barRatio

  return createElement(
    RadialBarChart,
    {
      width: input.width,
      height: input.height,
      data,
      cx: input.width / 2,
      cy: input.height / 2,
      innerRadius,
      outerRadius: radius,
      startAngle: 90,
      endAngle: -270,
      barSize,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      accessibilityLayer: true,
    },
    [
      createElement(PolarAngleAxis, {
        key: 'angle',
        type: 'number',
        domain: [0, 100],
        hide: true,
      }),
      createElement(
        RadialBar,
        {
          key: 'bars',
          dataKey: 'value',
          cornerRadius: barSize / 2,
          background: false,
          isAnimationActive: false,
        },
        data.map((row) =>
          createElement(Cell, {
            key: row.id,
            fill: row.fill,
          }),
        ),
      ),
    ],
  )
}

export const mount = rechartsMount(chart, 'Concentric radial bars')
