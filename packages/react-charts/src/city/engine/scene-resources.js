// Shared geometries/materials/textures are released once, before the next city.
export function disposeSceneGroups(groups) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set()
  for (const group of groups) {
    if (!group) continue
    group.traverse((object) => {
      object.dispose?.()
      if (object.geometry) geometries.add(object.geometry)
      for (const material of object.material
        ? Array.isArray(object.material)
          ? object.material
          : [object.material]
        : []) {
        materials.add(material)
        for (const value of Object.values(material))
          if (value?.isTexture) textures.add(value)
      }
    })
    group.clear()
  }
  for (const texture of textures) texture.dispose()
  for (const material of materials) material.dispose()
  for (const geometry of geometries) geometry.dispose()
}
