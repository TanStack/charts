import type { SceneGroup } from './types'

const defaultFocusLayer = Symbol('default-focus-layer')

type DefaultFocus = NonNullable<SceneGroup['focus']> & {
  [defaultFocusLayer]?: true
}

export function markDefaultFocusLayer(layer: SceneGroup): SceneGroup {
  if (layer.focus) Object.assign(layer.focus, { [defaultFocusLayer]: true })
  return layer
}

export function isDefaultFocusLayer(layer: SceneGroup): boolean {
  return (layer.focus as DefaultFocus | undefined)?.[defaultFocusLayer] === true
}
