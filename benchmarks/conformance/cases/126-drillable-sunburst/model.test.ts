import { describe, expect, it } from 'vitest'
import {
  flareAggregateValue,
  flareHasChildren,
  flareNodeColor,
  flarePreviewRootId,
  flareRootId,
  flareSunburstTree,
  flareVisibleDepth,
} from './model'

describe('drillable Flare sunburst model', () => {
  it('keeps the complete hierarchy while exposing a bounded display tree', () => {
    const overview = flareSunburstTree(flareRootId)
    const analytics = flareSunburstTree(flarePreviewRootId)

    expect(flareVisibleDepth(flareRootId)).toBe(1)
    expect(overview.children).toHaveLength(10)
    expect(overview.children?.every((child) => !child.children)).toBe(true)
    expect(flareVisibleDepth(flarePreviewRootId)).toBe(2)
    expect(analytics.children?.map((child) => child.id)).toEqual([
      '/flare/analytics/graph',
      '/flare/analytics/cluster',
      '/flare/analytics/optimization',
    ])
    expect(
      analytics.children?.flatMap((child) => child.children ?? []),
    ).toHaveLength(10)
    expect(analytics.value).toBe(flareAggregateValue(flarePreviewRootId))
  })

  it('retains navigation and paint identity outside the visible window', () => {
    const cluster = '/flare/analytics/cluster'
    const leaf = `${cluster}/AgglomerativeCluster`

    expect(flareHasChildren(cluster)).toBe(true)
    expect(flareHasChildren(leaf)).toBe(false)
    expect(flareNodeColor(leaf)).toBe(flareNodeColor(leaf))
    expect(flareNodeColor(leaf)).not.toBe(
      flareNodeColor(`${cluster}/CommunityStructure`),
    )
  })
})
