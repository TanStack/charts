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

  it('accepts direct rendered assertions and realistic input phases', () => {
    const metadata = parseConformanceCaseMeta(
      {
        ...baseMetadata,
        interactionScenarios: [
          {
            id: 'rendered-controller',
            steps: [
              {
                type: 'pointerDown',
                target: { view: 'detail', anchor: 'handle:start' },
              },
              {
                type: 'pointerMove',
                target: { view: 'detail', anchor: 'outside:end' },
                steps: 4,
              },
              { type: 'pointerCancel' },
              {
                type: 'touchTap',
                target: { view: 'detail', anchor: 'handle:start' },
              },
              {
                type: 'touchDrag',
                from: { view: 'detail', anchor: 'handle:start' },
                to: { view: 'detail', anchor: 'handle:end' },
                steps: 6,
                cancel: true,
              },
              {
                type: 'wheel',
                target: { view: 'detail', anchor: 'plot' },
                deltaY: 3,
                steps: 2,
                deltaMode: 'line',
              },
              {
                type: 'wait',
                durationMs: 250,
              },
              {
                type: 'assertRendered',
                assertions: [
                  {
                    target: {
                      role: 'slider',
                      name: 'Visible range',
                      exact: true,
                    },
                    property: 'count',
                    equals: 1,
                  },
                  {
                    target: { selector: '[role="status"]' },
                    property: 'text',
                    includes: 'Selected',
                  },
                  {
                    target: { selector: '[data-tooltip]' },
                    property: 'attribute',
                    attribute: 'aria-hidden',
                    equals: 'false',
                  },
                  {
                    target: { role: 'slider', name: 'Visible range' },
                    property: 'focused',
                    equals: true,
                  },
                  {
                    target: { root: true },
                    property: 'clientWidth',
                    approx: 640,
                    tolerance: 1,
                  },
                  {
                    target: { role: 'slider', name: 'Visible range' },
                    property: 'height',
                    atLeast: 44,
                  },
                  {
                    target: { selector: '[data-tooltip]' },
                    property: 'contained',
                    within: { root: true },
                    tolerance: 1,
                    equals: true,
                  },
                  {
                    target: { page: true },
                    property: 'scrollTop',
                    equals: 0,
                  },
                ],
              },
              {
                type: 'screenshot',
                name: 'selected-range',
                view: 'detail',
              },
            ],
          },
        ],
      },
      'case.json',
    )

    expect(metadata.interactionScenarios?.[0]?.steps).toHaveLength(9)
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
    {
      interactionScenarios: [
        {
          id: 'ambiguous-rendered-target',
          steps: [
            {
              type: 'assertRendered',
              assertions: [
                {
                  target: { selector: 'button', role: 'button' },
                  property: 'count',
                  equals: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'invalid-rendered-index',
          steps: [
            {
              type: 'assertRendered',
              assertions: [
                {
                  target: { selector: 'button', index: -1 },
                  property: 'visible',
                  equals: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'missing-rendered-attribute',
          steps: [
            {
              type: 'assertRendered',
              assertions: [
                {
                  target: { selector: 'button' },
                  property: 'attribute',
                  equals: 'true',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'ambiguous-rendered-matcher',
          steps: [
            {
              type: 'assertRendered',
              assertions: [
                {
                  target: { root: true },
                  property: 'clientWidth',
                  equals: 640,
                  approx: 640,
                  tolerance: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'invalid-touch-steps',
          steps: [
            {
              type: 'touchDrag',
              from: { anchor: 'start' },
              to: { anchor: 'end' },
              steps: 0,
            },
          ],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'unsafe-screenshot-name',
          steps: [{ type: 'screenshot', name: '../outside' }],
        },
      ],
    },
    {
      interactionScenarios: [
        {
          id: 'unbounded-wait',
          steps: [{ type: 'wait', durationMs: 5_001 }],
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
