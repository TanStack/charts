// North is -Z on the city's ground plane. Express it in camera space so
// the arrow follows the visible streets, including their isometric tilt.
export function mapNorthAngle(camera) {
  const matrix = camera.matrixWorldInverse.elements
  return Math.atan2(-matrix[8], -matrix[9])
}
