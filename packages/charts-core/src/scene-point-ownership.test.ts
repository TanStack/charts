import { describe, expect, it, vi } from 'vitest'
import { scaleLinear } from 'd3-scale'
import { dot } from './dot'
import { createChartScene, defineChart } from './scene'
import {
  createScenePointLookup,
  sceneNodeOwnedPoints,
} from './scene-point-ownership-internal'
import type { SceneArea } from './types'

describe('point-set ownership', () => {
  const scene = createChartScene(
    defineChart({
      marks: [
        dot(
          [
            { id: 'a', x: 0, y: 1 },
            { id: 'b', x: 1, y: 2 },
          ],
          {
            id: 'dots',
            key: 'id',
            x: 'x',
            y: 'y',
          },
        ),
      ],
      guides: false,
      scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
    }),
    { width: 200, height: 100 },
  )
  const [a, b] = scene.points
  const lookup = createScenePointLookup(scene.points)
  const node: SceneArea = { kind: 'area', key: 'fill', points: [] }

  it('resolves copied exact owners within the current scope', () => {
    expect(
      sceneNodeOwnedPoints(
        { ...node, pointOwners: [{ ...a! }, { ...b! }] },
        [b!],
        lookup,
      ),
    ).toEqual([b])
  })

  it('does not treat an unknown owner key as a generated descendant', () => {
    const unrelated = {
      ...a!,
      key: `${a!.key}:foreign`,
      datum: { foreign: true },
      datumIndex: 99,
    }
    expect(
      sceneNodeOwnedPoints(
        { ...node, pointOwners: [unrelated] },
        scene.points,
        lookup,
      ),
    ).toEqual([])
  })

  it('uses indexed exact owners without scanning the complete point scope', () => {
    const points = [...scene.points]
    const indexed = createScenePointLookup(points)
    const scan = vi.spyOn(points, 'filter')
    try {
      expect(
        sceneNodeOwnedPoints(
          { ...node, pointOwners: [{ ...a! }, { ...b! }] },
          points,
          indexed,
        ),
      ).toEqual(scene.points)
      expect(scan).not.toHaveBeenCalled()
    } finally {
      scan.mockRestore()
    }
  })

  it('prefers reference identity when duplicate keys exist', () => {
    const duplicate = { ...a!, datum: b!.datum }
    const points = [a!, duplicate]
    const indexed = createScenePointLookup(points)
    expect(
      sceneNodeOwnedPoints({ ...node, pointOwners: [a!] }, points, indexed),
    ).toEqual([a])
    expect(
      sceneNodeOwnedPoints({ ...node, pointOwner: a! }, points, indexed),
    ).toEqual([a])
  })

  it('retains unambiguous semantic ownership for adopted points', () => {
    const adopted = { ...a!, key: 'adopted:key' }
    expect(
      sceneNodeOwnedPoints(
        { ...node, pointOwners: [adopted] },
        scene.points,
        lookup,
      ),
    ).toEqual([a])
    expect(
      sceneNodeOwnedPoints({ ...node, pointOwners: [adopted] }, [b!], lookup),
    ).toEqual([])
  })
})
