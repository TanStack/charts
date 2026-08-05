import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  createClassifications,
  inspectPublicCallableSurfaces,
  validatePublicCallableSurfaces,
} from './public-callback-contract.mjs'

const repositoryRoot = resolve(import.meta.dirname, '..')

describe('public callback contract', () => {
  let inventory

  beforeAll(async () => {
    inventory = await inspectPublicCallableSurfaces(repositoryRoot)
  }, 30_000)

  it('classifies every callable surface exported by published packages', () => {
    expect(validatePublicCallableSurfaces(inventory)).toEqual([])
  })

  it('follows exported values into private nested callback types', () => {
    const surfaces = new Map(inventory.map((surface) => [surface.id, surface]))

    expect(
      surfaces
        .get(
          '@tanstack/alpine-charts:src/index.ts:AlpineLike.directive.callback',
        )
        ?.signatures[0]?.map((parameter) => parameter.name),
    ).toEqual(['element', 'directive', 'utilities'])
    expect(
      surfaces
        .get('@tanstack/vue-charts:src/Chart.ts:ChartComponent.tooltipBody')
        ?.signatures[0]?.map((parameter) => parameter.name),
    ).toEqual(['context'])
  })

  it('rejects unclassified additions and stale classifications', () => {
    const classifications = createClassifications({
      callback: [['@scope/pkg:src/types.ts:KnownOptions', 'format missing']],
    })
    expect(
      validatePublicCallableSurfaces(
        [surface('@scope/pkg:src/types.ts:AddedOptions.render', ['value'])],
        classifications,
      ),
    ).toEqual([
      '@scope/pkg:src/types.ts:AddedOptions.render is an unclassified public callable surface (src/types.ts:1)',
      '@scope/pkg:src/types.ts:KnownOptions.format is classified but no longer exported',
      '@scope/pkg:src/types.ts:KnownOptions.missing is classified but no longer exported',
    ])
  })

  it('limits callbacks to primary data and one object context bag', () => {
    const threeArguments = '@scope/pkg:src/types.ts:Options.resolve'
    const primitiveContext = '@scope/pkg:src/types.ts:Options.format'
    const misnamedContext = '@scope/pkg:src/types.ts:Options.content'
    const classifications = createClassifications({
      callback: [['@scope/pkg:src/types.ts:Options', 'resolve format content']],
    })

    expect(
      validatePublicCallableSurfaces(
        [
          surface(threeArguments, ['points', 'x', 'y']),
          surface(primitiveContext, ['value', ['context', false]]),
          surface(misnamedContext, ['points', ['state', true]]),
        ],
        classifications,
      ),
    ).toEqual([
      `${misnamedContext} names its second argument state; use context or options`,
      `${primitiveContext} must use an object context/options bag for its second argument`,
      `${threeArguments} has 3 positional arguments; public callbacks accept at most two`,
    ])
  })

  it('accepts context bags and the reviewed exception categories', () => {
    const classifications = createClassifications({
      callback: [
        ['@scope/pkg:src/types.ts:Options', 'content format contextOnly'],
      ],
      comparator: [['@scope/pkg:src/types.ts:Sort', '$call']],
      pairedGeometry: [['@scope/pkg:src/types.ts:Curve', 'area']],
      upstreamProtocol: [['@scope/pkg:src/types.ts:Interval', 'range']],
      serviceMethod: [['@scope/pkg:src/types.ts:Runtime', 'render']],
    })
    const surfaces = [
      surface('@scope/pkg:src/types.ts:Options.content', [
        'points',
        ['context', true],
      ]),
      surface('@scope/pkg:src/types.ts:Options.format', [
        'point',
        ['options', true],
      ]),
      surface('@scope/pkg:src/types.ts:Options.contextOnly', [
        ['context', true],
      ]),
      surface('@scope/pkg:src/types.ts:Sort.$call', ['left', 'right']),
      surface('@scope/pkg:src/types.ts:Curve.area', ['top', 'bottom']),
      surface('@scope/pkg:src/types.ts:Interval.range', [
        'start',
        'stop',
        'step',
      ]),
      surface('@scope/pkg:src/types.ts:Runtime.render', [
        'definition',
        'size',
        'layout',
      ]),
    ]

    expect(validatePublicCallableSurfaces(surfaces, classifications)).toEqual(
      [],
    )
  })
})

function surface(id, parameters) {
  return {
    id,
    location: 'src/types.ts:1',
    signatures: [
      parameters.map((parameter) =>
        Array.isArray(parameter)
          ? { name: parameter[0], objectBag: parameter[1] }
          : { name: parameter, objectBag: false },
      ),
    ],
  }
}
