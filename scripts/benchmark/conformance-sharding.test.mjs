import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { estimateConformanceCaseWeight } from './conformance-sharding.mjs'
import { selectShard, selectWeightedShard } from './filters.mjs'

const standardProfile = {
  warmup: 3,
  samples: 10,
  widths: [320, 640, 960],
  themes: ['light', 'dark'],
}

describe('conformance shard weights', () => {
  it('accounts for repeated driver work and bounded waits', () => {
    const basic = {
      geometry: [{ role: 'line', count: 1 }],
    }
    const interactive = {
      ...basic,
      interactionScenarios: [
        {
          steps: [
            { type: 'drag', steps: 8 },
            { type: 'wait', durationMs: 800 },
            { type: 'assert', assertions: [{ equals: true }] },
          ],
        },
      ],
    }

    expect(
      estimateConformanceCaseWeight(interactive, standardProfile),
    ).toBeGreaterThan(estimateConformanceCaseWeight(basic, standardProfile))
  })

  it('improves the predicted maximum shard cost for the real catalog', async () => {
    const casesDirectory = resolve(
      import.meta.dirname,
      '../../benchmarks/conformance/cases',
    )
    const cases = (
      await Promise.all(
        (await readdir(casesDirectory)).map(async (directory) =>
          JSON.parse(
            await readFile(resolve(casesDirectory, directory, 'case.json')),
          ),
        ),
      )
    ).sort((left, right) => left.order - right.order)
    const weightFor = (entry) =>
      estimateConformanceCaseWeight(entry, standardProfile)
    const roundRobin = [1, 2, 3, 4, 5, 6, 7, 8].map((index) =>
      selectShard(cases, { index, total: 8 }),
    )
    const weighted = [1, 2, 3, 4, 5, 6, 7, 8].map((index) =>
      selectWeightedShard(cases, { index, total: 8 }, weightFor),
    )
    const maximumWeight = (shards) =>
      Math.max(
        ...shards.map((entries) =>
          entries.reduce((total, entry) => total + weightFor(entry), 0),
        ),
      )

    expect(maximumWeight(weighted)).toBeLessThan(maximumWeight(roundRobin))
    expect(
      weighted
        .flat()
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(cases.map((entry) => entry.id).sort())
  })
})
