import { describe, expect, it } from 'vitest'
import { createChartScene, type StaticChartDefinition } from '@tanstack/charts'
import { createExampleChart as createShadcnDashboardChart } from '../cases/127-shadcn-dashboard/example'
import { definition as barMultipleDefinition } from '../cases/128-shadcn-bar-multiple/example'
import { definition as pieDonutTextDefinition } from '../cases/129-shadcn-pie-donut-text/example'
import { definition as radarMultipleDefinition } from '../cases/130-shadcn-radar-multiple/example'
import { definition as radialTextDefinition } from '../cases/131-shadcn-radial-text/example'
import { definition as advancedTooltipDefinition } from '../cases/132-shadcn-tooltip-advanced/example'
import { definition as areaDefaultDefinition } from '../cases/134-shadcn-area-default/example'
import { definition as barDefaultDefinition } from '../cases/144-shadcn-bar-default/example'
import { definition as lineDefaultDefinition } from '../cases/152-shadcn-line-default/example'
import { definition as pieSimpleDefinition } from '../cases/170-shadcn-pie-simple/example'
import { definition as radarDefaultDefinition } from '../cases/172-shadcn-radar-default/example'
import { definition as radarLegendDefinition } from '../cases/182-shadcn-radar-legend/example'
import { definition as radialSimpleDefinition } from '../cases/188-shadcn-radial-simple/example'
import { definition as tooltipDefaultDefinition } from '../cases/190-shadcn-tooltip-default/example'
import type { ShadcnMonthDatum } from './shadcn-catalog-data'
import { focusGroupAngle } from '@tanstack/charts/polar'

describe('shadcn chart motion', () => {
  it('keeps dedicated and generated definitions free of duplicate spring policy', () => {
    const dedicatedDefinitions = [
      createShadcnDashboardChart([]),
      barMultipleDefinition,
      pieDonutTextDefinition,
      radarMultipleDefinition,
      radialTextDefinition,
      advancedTooltipDefinition,
    ]
    const generatedDefinitions = shadcnFamilyDefinitions()

    for (const definition of [
      ...dedicatedDefinitions,
      ...generatedDefinitions,
    ]) {
      expect(
        'motion' in definition ? definition.motion : undefined,
      ).toBeUndefined()
    }
  })

  it('keeps the native focus marker enabled across generated families', () => {
    const definitions = shadcnFamilyDefinitions()

    for (const definition of definitions) {
      expect(definition.focus).not.toBe(false)
      expect(
        'focusRing' in definition ? definition.focusRing : undefined,
      ).not.toBe(false)
    }
    expect(definitions[4]?.focus).toBe(focusGroupAngle)
    expect(definitions[3]?.focus).toBe(focusGroupAngle)
    expect(definitions[5]?.focus).toBe(focusGroupAngle)
  })

  it('groups generated radar points by semantic angle and series', () => {
    const definition = radarLegendDefinition
    expect('chart' in definition).toBe(false)
    if ('chart' in definition) return
    const scene = createChartScene(
      definition as unknown as StaticChartDefinition<
        ShadcnMonthDatum,
        string,
        number
      >,
      { width: 300, height: 250 },
    )
    const january = scene.points.filter((point) => point.xValue === 'January')

    expect(january.map((point) => point.group)).toEqual(['desktop', 'mobile'])
    expect(focusGroupAngle.group(scene.points, { point: january[0]! })).toEqual(
      january,
    )
  })
})

function shadcnFamilyDefinitions() {
  return [
    areaDefaultDefinition,
    barDefaultDefinition,
    lineDefaultDefinition,
    pieSimpleDefinition,
    radarDefaultDefinition,
    radialSimpleDefinition,
    tooltipDefaultDefinition,
  ]
}
