import { describe, expect, it } from 'vitest'
import { parseConformanceCaseMeta } from './metadata'

const baseMetadata = {
  schemaVersion: 1,
  order: 1,
  id: 'interaction-case',
  title: 'Interaction case',
  family: 'interaction',
  intent: 'Exercise deterministic interaction metadata.',
  support: 'composed',
  features: ['interaction'],
  geometry: [
    { id: 'overview-line', view: 'overview', role: 'line', count: 1 },
    { id: 'detail-line', view: 'detail', role: 'line', count: 1 },
  ],
  source: { title: 'Reference', url: 'https://example.com' },
  ai: { create: 'Create it.', maintain: 'Maintain it.' },
} as const

describe('conformance metadata', () => {
  it('accepts ECharts and ordered semantic interaction scenarios', () => {
    expect(
      parseConformanceCaseMeta(
        {
          ...baseMetadata,
          referenceRenderer: 'echarts',
          interactionScenarios: [
            {
              id: 'focus-detail',
              steps: [
                {
                  type: 'pointerMove',
                  target: { view: 'detail', anchor: 'point:0' },
                },
                { type: 'update', revision: 2 },
                {
                  type: 'assert',
                  assertions: [{ path: 'focus.id', equals: 'point:0' }],
                },
              ],
            },
          ],
        },
        'case.json',
      ).referenceRenderer,
    ).toBe('echarts')
  })

  it.each([
    { interactionScenarios: [{ id: 'empty', steps: [] }] },
    {
      interactionScenarios: [
        {
          id: 'empty-assert',
          steps: [{ type: 'assert', assertions: [] }],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'ambiguous-assert',
          steps: [
            {
              type: 'assert',
              assertions: [{ path: 'focus.id', equals: 'a', includes: 'a' }],
            },
          ],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'invalid-update',
          steps: [{ type: 'update', revision: 'two' }],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'missing-update-revision',
          steps: [{ type: 'update' }],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'empty-wheel',
          steps: [
            {
              type: 'wheel',
              target: { view: 'detail', anchor: 'plot' },
            },
          ],
        },
      ],
    },
  ])('rejects incomplete interaction metadata', (metadata) => {
    expect(() =>
      parseConformanceCaseMeta({ ...baseMetadata, ...metadata }, 'case.json'),
    ).toThrow('Invalid conformance metadata')
  })

  it('requires an explicit id when geometry roles repeat', () => {
    expect(() =>
      parseConformanceCaseMeta(
        {
          ...baseMetadata,
          geometry: [
            { view: 'overview', role: 'line', count: 1 },
            { view: 'detail', role: 'line', count: 1 },
          ],
        },
        'case.json',
      ),
    ).toThrow('Invalid conformance metadata')
  })
})
