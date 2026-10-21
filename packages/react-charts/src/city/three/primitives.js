import * as THREE from 'three'

export const dummy = new THREE.Object3D()
export const rgb = new THREE.Color()
export const STEP = 2.8

export function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    flatShading: true,
    ...extra,
  })
}
export function instances(geometry, mat, items, scene) {
  const mesh = new THREE.InstancedMesh(geometry, mat, Math.max(1, items.length))
  mesh.count = items.length
  mesh.userData.items = items
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    dummy.position.set(it.x, it.y, it.z)
    dummy.rotation.set(0, it.ry ?? 0, 0)
    dummy.scale.set(it.w ?? 1, it.h ?? 1, it.d ?? 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    if (it.color) mesh.setColorAt(i, rgb.set(it.color))
  }
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.castShadow = false
  mesh.receiveShadow = false
  scene.add(mesh)
  return mesh
}
