import { describe, expect, it } from 'vitest'
import { createChartScene, type StaticChartDefinition } from '@tanstack/charts'
import { shadcnDashboardChartDefinition } from '../cases/127-shadcn-dashboard/tanstack'
import { barMultipleDefinition } from '../cases/128-shadcn-bar-multiple/tanstack'
import { pieDonutTextDefinition } from '../cases/129-shadcn-pie-donut-text/tanstack'
import { radarMultipleDefinition } from '../cases/130-shadcn-radar-multiple/tanstack'
import { radialTextDefinition } from '../cases/131-shadcn-radial-text/tanstack'
import { advancedTooltipDefinition } from '../cases/132-shadcn-tooltip-advanced/tanstack'
import { createShadcnTanStackExample } from './shadcn-catalog-tanstack'
import type { ShadcnMonthDatum } from './shadcn-catalog-data'
import { focusGroupAngle } from '@tanstack/charts/polar'
import {
  createShadcnSpringRenderer,
  shadcnSpringTransition,
} from './shadcn-motion'

describe('shadcn chart motion', () => {
  it('uses one physical spring preset for the collection', () => {
    expect(shadcnSpringTransition).toEqual({
      type: 'spring',
      stiffness: 170,
      damping: 18,
      mass: 1,
    })
    expect(createShadcnSpringRenderer().id).toBe('svg:svg-motion')
  })

  it('keeps dedicated and generated definitions free of duplicate spring policy', () => {
    const dedicatedDefinitions = [
      shadcnDashboardChartDefinition([]),
      barMultipleDefinition,
      pieDonutTextDefinition,
      radarMultipleDefinition,
      radialTextDefinition,
      advancedTooltipDefinition,
    ]
    const generatedDefinitions = [
      'chart-area-default',
      'chart-bar-default',
      'chart-line-default',
      'chart-pie-simple',
      'chart-radar-default',
      'chart-radial-simple',
      'chart-tooltip-default',
    ].map((name) => createShadcnTanStackExample(name).definition)

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
    const definitions = [
      'chart-area-default',
      'chart-bar-default',
      'chart-line-default',
      'chart-pie-simple',
      'chart-radar-default',
      'chart-radial-simple',
      'chart-tooltip-default',
    ].map((name) => createShadcnTanStackExample(name).definition)

    for (const definition of definitions) {
      expect(definition.focus).not.toBe(false)
      expect(definition.focusRing).not.toBe(false)
    }
    expect(definitions[4]?.focus).toBe(focusGroupAngle)
    expect(definitions[3]?.focus).toBe('nearest')
    expect(definitions[5]?.focus).toBe('nearest')
  })

  it('groups generated radar points by semantic angle and series', () => {
    const definition =
      createShadcnTanStackExample('chart-radar-legend').definition
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
