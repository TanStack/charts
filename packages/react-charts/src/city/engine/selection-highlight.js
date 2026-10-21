import * as THREE from 'three'

// Reuse one highlight for every selection, without recoloring company/status data.
export class SelectionHighlight extends THREE.Group {
  constructor() {
    super()
    this.visible = false
    this.box = new THREE.BoxGeometry(1, 1, 1)
    this.shells = []
    for (const [color, padding, order] of [
      ['#123441', 0.22, 1],
      ['#ffffff', 0.12, 2],
    ]) {
      const material = new THREE.MeshBasicMaterial({
        color,
        side: THREE.BackSide,
        depthWrite: false,
        toneMapped: false,
      })
      const body = new THREE.Mesh(this.box, material)
      body.renderOrder = order
      this.add(body)
      this.shells.push({ body, padding })
    }
    for (const [color, inner, outer, y] of [
      ['#123441', 1.58, 1.94, 0.17],
      ['#ffffff', 1.66, 1.85, 0.18],
    ]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(inner, outer, 4),
        new THREE.MeshBasicMaterial({
          color,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      )
      ring.rotation.set(-Math.PI / 2, 0, Math.PI / 4)
      ring.position.y = y
      this.add(ring)
    }
  }
  select(company) {
    this.position.set(company.x, 0, company.z)
    this.visible = true
    for (const { body, padding } of this.shells) {
      body.position.set(0, company.height / 2 + 0.13, 0)
      body.scale.set(
        company.width + padding,
        company.height + padding,
        company.depth + padding,
      )
    }
  }
}
