import { defineChart } from '@tanstack/charts'
import { polar, radialArc } from '@tanstack/charts/polar'
import { pie } from 'd3-shape'
import { nestedDonutData } from './data'
import { tanstackMount } from '../../shared/mount'
import type { NestedDonutDatum } from './data'
import type { ConformanceInput } from '../../types'
import type { PieArcDatum } from 'd3-shape'

const innerLayout = pie<NestedDonutDatum>()
  .sort(null)
  .value(({ value }) => value)
const outerLayout = pie<NestedDonutDatum>()
  .sort(null)
  .value(({ value }) => value)

const definition = (input: ConformanceInput) =>
  defineChart(() => {
    const data = nestedDonutData(input.revision)
    const innerArcs = innerLayout([...data.inner])
    const outerArcs = outerLayout([...data.outer])

    return {
      marks: [
        polar({
          radiusRatio: 0.8,
          marks: [
            radialArc(innerArcs, {
              innerRadius: ({ radius }) => radius * 0.12,
              outerRadius: ({ radius }) => radius * 0.46,
              key: ({ data }: PieArcDatum<NestedDonutDatum>) => data.id,
              fill: ({ data }: PieArcDatum<NestedDonutDatum>) => data.fill,
            }),
            radialArc(outerArcs, {
              innerRadius: ({ radius }) => radius * 0.56,
              key: ({ data }: PieArcDatum<NestedDonutDatum>) => data.id,
              fill: ({ data }: PieArcDatum<NestedDonutDatum>) => data.fill,
            }),
          ],
        }),
      ],
      x: null,
      y: null,
      guides: false,
      margin: 0,
    }
  })

export const mount = tanstackMount(definition, 'Nested donut rings')
