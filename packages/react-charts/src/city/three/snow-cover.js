import * as THREE from 'three'
import { random } from '../engine/model.js'
import { instances, material, STEP } from './primitives.js'

// Soft, irregular edges keep the original roof/ground visible between patches.
function patchTexture() {
  const size = 64
  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = ((x + 0.5) / size) * 2 - 1
      const py = ((y + 0.5) / size) * 2 - 1
      const angle = Math.atan2(py, px)
      const edge =
        0.76 + Math.sin(angle * 3 + 0.7) * 0.12 + Math.cos(angle * 7) * 0.07
      const alpha = THREE.MathUtils.clamp((edge - Math.hypot(px, py)) * 9, 0, 1)
      pixels.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4)
    }
  const texture = new THREE.DataTexture(pixels, size, size)
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

export class SnowCover extends THREE.Group {
  constructor() {
    super()
    this.geometry = new THREE.PlaneGeometry(1, 1)
    this.geometry.rotateX(-Math.PI / 2)
    this.material = material('#f4f8ff', {
      map: patchTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      alphaTest: 0.01,
    })
    this.mesh = instances(this.geometry, this.material, [], this)
    this.amount = 0
    this.visible = false
  }

  setLayout(layout) {
    const rng = random(28419)
    const patches = []
    const rb = layout.roadBounds
    for (let z = rb.z1; z <= rb.z2; z++)
      for (let x = rb.x1; x <= rb.x2; x++) {
        if (rng() < 0.25) continue
        patches.push({
          x: x * STEP + (rng() - 0.5) * 0.7,
          y: 0.068,
          z: z * STEP + (rng() - 0.5) * 0.7,
          w: 0.8 + rng() * 1.3,
          d: 0.7 + rng() * 1.1,
          ry: rng() * Math.PI * 2,
        })
      }
    this.groundCount = patches.length
    for (const c of layout.companies) {
      if (![c.x, c.z, c.roofTop, c.width, c.depth].every(Number.isFinite))
        continue
      const w = c.width * (0.5 + rng() * 0.25)
      const d = c.depth * (0.5 + rng() * 0.25)
      patches.push({
        x: c.x + (rng() - 0.5) * (c.width - w) * 0.8,
        y: c.roofTop + 0.018,
        z: c.z + (rng() - 0.5) * (c.depth - d) * 0.8,
        w,
        d,
      })
    }
    // Reuse texture, material and geometry; release the old instance buffer.
    this.remove(this.mesh)
    this.mesh.dispose()
    this.mesh = instances(this.geometry, this.material, patches, this)
  }

  update(time, enabled) {
    this.visible = enabled
    if (!enabled) {
      this.amount = 0
      this.previousTime = undefined
    } else if (this.previousTime === undefined) {
      this.amount = 0.2
      this.previousTime = time
    } else {
      this.amount = Math.min(
        1,
        this.amount + Math.max(0, time - this.previousTime) / 30,
      )
      this.previousTime = time
    }
    this.material.opacity = this.amount * 0.7
  }
}
