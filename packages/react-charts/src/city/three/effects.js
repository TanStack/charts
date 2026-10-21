import * as THREE from 'three'
import { WindowPlumes } from '../engine/plume-renderer.js'
import { instances, dummy, rgb } from './primitives.js'

const windowLight = new THREE.Color('#ffe0a3')

// Status rendering is independent from terrain, traffic and camera scheduling.
export function buildEffects(city) {
  city.effectsKey = null
  city.plumes = new WindowPlumes(city.emitters, city.buildings)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.moveTo(64, 13)
  ctx.lineTo(115, 110)
  ctx.lineTo(13, 110)
  ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#ffd600'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 18
  ctx.stroke()
  ctx.strokeStyle = '#111820'
  ctx.lineWidth = 10
  ctx.stroke()
  ctx.fillStyle = '#111820'
  ctx.fillRect(59, 45, 10, 34)
  ctx.fillRect(59, 88, 10, 10)
  const tex = new THREE.CanvasTexture(canvas)
  city.warningTexture?.dispose()
  city.warningTexture = tex
  tex.colorSpace = THREE.SRGBColorSpace
  const warningGeo = new THREE.PlaneGeometry(1, 1)
  city.warning = instances(
    warningGeo,
    // Unlit and untone-mapped: the yellow/white/black icon keeps its colors.
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
    city.warningSources.map((f) => ({
      x: f.x,
      y: f.y,
      z: f.z,
      w: 1.6,
      h: 1.6,
      d: 1,
      company: f.company,
    })),
    city.buildings,
  )
  city.warning.renderOrder = 4
  city.updateEffects(0)
}

export function updateEffects(city, t) {
  if (!city.plumes) return
  const key = `${city.windowLight}:${city.effects}:${city.effects ? t : 0}:${city.effects ? city.cameraRevision : 0}`
  if (city.effectsKey === key) return
  city.effectsKey = key
  // Separate irregular timing per company; all surfaces of one building agree.
  for (const { mesh, items } of city.criticalSurfaces) {
    const blink = mesh.geometry.getAttribute('criticalBlink')
    let changed = false
    for (const item of items) {
      const showRed = city.effects && (city.reduceMotion || item.blink(t))
      if (item.lastRed === showRed) continue
      item.lastRed = showRed
      blink.setX(item.index, showRed ? 1 : 0)
      changed = true
    }
    if (changed) blink.needsUpdate = true
  }
  city.plumes.update(t, city.effects, city.active)
  city.warning.visible = city.effects
  if (city.effects) {
    for (let i = 0; i < city.warningSources.length; i++) {
      const source = city.warningSources[i]
      dummy.position.set(
        source.x,
        source.y + Math.sin(t * 1.5 + source.phase) * 0.08,
        source.z,
      )
      dummy.quaternion.copy(city.camera.quaternion)
      dummy.scale.setScalar(city.active.has(source.company) ? 1.6 : 0)
      dummy.updateMatrix()
      city.warning.setMatrixAt(i, dummy.matrix)
    }
    city.warning.instanceMatrix.needsUpdate = true
  }
  city.windowGlow.userData.items.forEach((item, i) => {
    const source = item.source
    if (source.critical && city.effects) {
      const flicker =
        0.86 +
        0.12 * Math.sin(t * 13 + source.seed) +
        0.04 * Math.sin(t * 23 + source.seed * 2)
      rgb.setRGB(1, 0.34 * flicker, 0.035)
    } else
      rgb
        .set(city.effects ? '#555956' : '#d9e6e8')
        .lerp(windowLight, city.windowLight ?? 0)
    city.windowGlow.setColorAt(i, rgb)
  })
  if (city.windowGlow.instanceColor)
    city.windowGlow.instanceColor.needsUpdate = true
}
