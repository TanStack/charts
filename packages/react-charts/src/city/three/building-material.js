import * as THREE from 'three'
import { material } from './primitives.js'

// One flag per instance keeps the risk signal unlit without extra draw calls.
export function buildingMaterial(geometry, count) {
  geometry.setAttribute(
    'criticalBlink',
    new THREE.InstancedBufferAttribute(
      new Float32Array(Math.max(1, count)),
      1,
    ).setUsage(THREE.DynamicDrawUsage),
  )
  const result = material('#ffffff')
  result.onBeforeCompile = (shader) => {
    shader.uniforms.criticalColor = { value: new THREE.Color('#ff2525') }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float criticalBlink;\nvarying float vCriticalBlink;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvCriticalBlink = criticalBlink;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 criticalColor;\nvarying float vCriticalBlink;',
      )
      .replace(
        '#include <tonemapping_fragment>',
        `#include <tonemapping_fragment>
        if (vCriticalBlink > 0.5) gl_FragColor.rgb = criticalColor;`,
      )
  }
  // The override runs after exposure/tone mapping, before output color space.
  result.customProgramCacheKey = () => 'atlas-building-critical-color-v1'
  return result
}
