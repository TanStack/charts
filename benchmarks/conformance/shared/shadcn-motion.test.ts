import { describe, expect, it } from 'vitest'
import { shadcnDashboardChartDefinition } from '../cases/121-shadcn-dashboard/tanstack'
import { barMultipleDefinition } from '../cases/122-shadcn-bar-multiple/tanstack'
import { pieDonutTextDefinition } from '../cases/123-shadcn-pie-donut-text/tanstack'
import { radarMultipleDefinition } from '../cases/124-shadcn-radar-multiple/tanstack'
import { radialTextDefinition } from '../cases/125-shadcn-radial-text/tanstack'
import { advancedTooltipDefinition } from '../cases/126-shadcn-tooltip-advanced/tanstack'
import { createShadcnTanStackExample } from './shadcn-catalog-tanstack'
import {
  createShadcnSpringRenderer,
  shadcnSpringMotion,
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

  it('applies the spring policy to dedicated and generated chart definitions', () => {
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
      expect(definition.motion).toEqual(shadcnSpringMotion)
    }
  })
})
