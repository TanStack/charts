import * as Plot from '@observablehq/plot'
import { funnelStagesForRevision } from './data'
import { funnelLayout } from './model'
import { mountObservablePlot } from '../../shared/mount'
import type { ConformanceMount } from '../../types'

const colors = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa']

export const mount: ConformanceMount = (container, input) =>
  mountObservablePlot(container, input, (nextInput) => {
    const stages = funnelStagesForRevision(nextInput.revision)
    const layout = funnelLayout(stages)

    return Plot.plot({
      width: nextInput.width,
      height: nextInput.height,
      ariaLabel: 'Sales conversion funnel',
      margin: 12,
      x: { domain: layout.xDomain, axis: null },
      y: { domain: layout.yDomain, axis: null },
      color: { domain: stages.map((stage) => stage.id), range: colors },
      marks: [
        Plot.areaX(layout.points, {
          x1: 'x1',
          x2: 'x2',
          y: 'y',
          z: 'id',
          fill: 'id',
          curve: 'linear',
        }),
        Plot.text(layout.labels, {
          x: 'x',
          y: 'y',
          text: 'text',
          textAnchor: 'start',
          fill: 'currentColor',
          fontSize:
            nextInput.preview === true ? 8 : nextInput.width < 400 ? 10 : 12,
          fontWeight: 600,
        }),
      ],
    })
  })
