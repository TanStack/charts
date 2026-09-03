import type { SceneNode } from './types'

export const sceneMotionNode = Symbol('scene-motion-node')

export interface SceneMotionPathGeometry {
  readonly values: readonly number[]
  readonly project: (values: readonly number[]) => string | undefined
}

export interface SceneMotionHierarchy {
  readonly markId: string
  readonly id: string
  readonly ancestorIds: readonly string[]
}

export interface SceneMotionMetadata {
  readonly path?: SceneMotionPathGeometry
  readonly hierarchy?: SceneMotionHierarchy
}

export type SceneMotionNode = SceneNode & {
  readonly [sceneMotionNode]?: SceneMotionMetadata
}
